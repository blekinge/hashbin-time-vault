import { Hono } from "npm:hono@4";
import { cors } from "npm:hono@4/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono().basePath("/api");

// CORS for all routes
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: [
      "authorization",
      "x-client-info",
      "apikey",
      "content-type",
      "x-supabase-client-platform",
      "x-supabase-client-platform-version",
      "x-supabase-client-runtime",
      "x-supabase-client-runtime-version",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

// ── Helpers ──────────────────────────────────────────────

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

async function hmacSign(message: string): Promise<string> {
  const secret = Deno.env.get("HMAC_SECRET");
  if (!secret) throw new Error("HMAC_SECRET not configured");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Simple per-isolate rate limiter
const rateMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

// ── POST /api/stamp ─────────────────────────────────────

app.post("/stamp", async (c) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("cf-connecting-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Invalid JSON body" }, 400);

  const { hash, hash_md5, hash_sha1, hash_sha512, file_size, file_name } = body;

  // Validate hash (SHA-256, required)
  if (!hash || typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) {
    return c.json({ error: "Invalid SHA-256 hash" }, 400);
  }

  // Validate optional hashes
  if (hash_md5 != null && (typeof hash_md5 !== "string" || !/^[a-f0-9]{32}$/.test(hash_md5))) {
    return c.json({ error: "Invalid MD5 hash" }, 400);
  }
  if (hash_sha1 != null && (typeof hash_sha1 !== "string" || !/^[a-f0-9]{40}$/.test(hash_sha1))) {
    return c.json({ error: "Invalid SHA-1 hash" }, 400);
  }
  if (hash_sha512 != null && (typeof hash_sha512 !== "string" || !/^[a-f0-9]{128}$/.test(hash_sha512))) {
    return c.json({ error: "Invalid SHA-512 hash" }, 400);
  }

  // Validate file_size
  const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024 * 1024; // 10 TB
  if (
    typeof file_size !== "number" ||
    file_size < 0 ||
    file_size > MAX_FILE_SIZE ||
    !Number.isFinite(file_size)
  ) {
    return c.json({ error: "Invalid file_size" }, 400);
  }

  // Validate file_name
  if (file_name != null && (typeof file_name !== "string" || file_name.length > 500)) {
    return c.json({ error: "Invalid file_name" }, 400);
  }

  const userId = await getUserId(c.req.header("Authorization"));
  const created_at = new Date().toISOString();

  let server_signature: string;
  try {
    server_signature = await hmacSign(`${hash}:${created_at}`);
  } catch {
    return c.json({ error: "Server misconfigured" }, 500);
  }

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("timestamps")
    .insert({
      hash,
      hash_md5: hash_md5 || null,
      hash_sha1: hash_sha1 || null,
      hash_sha512: hash_sha512 || null,
      file_size,
      file_name: file_name || null,
      created_at,
      server_signature,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: "Failed to create timestamp" }, 500);
  }

  return c.json(data);
});

// ── GET /api/verify?hash=... ─────────────────────────────

app.get("/verify", async (c) => {
  const hash = c.req.query("hash");
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
    return c.json({ error: "Invalid or missing hash parameter" }, 400);
  }

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("timestamps")
    .select("id, hash, created_at, file_size, server_signature")
    .eq("hash", hash)
    .order("created_at", { ascending: true });

  if (error) {
    return c.json({ error: "Query failed" }, 500);
  }

  return c.json(data ?? []);
});

// ── GET /api/my-timestamps ──────────────────────────────

app.get("/my-timestamps", async (c) => {
  const userId = await getUserId(c.req.header("Authorization"));
  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("timestamps")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ error: "Query failed" }, 500);
  }

  return c.json(data ?? []);
});

// ── Health check ────────────────────────────────────────

app.get("/health", (c) => c.json({ status: "ok" }));

// ── OpenAPI spec ────────────────────────────────────────

const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Hashbin API",
    version: "1.0.0",
    description:
      "Trusted file timestamping service. Hash files client-side, store HMAC-signed timestamps server-side.",
    contact: { url: "https://hashbin.net" },
  },
  servers: [{ url: "/functions/v1/api" }],
  paths: {
    "/stamp": {
      post: {
        operationId: "createTimestamp",
        summary: "Create a signed timestamp",
        description:
          "Accepts a SHA-256 hash and file metadata, returns an HMAC-signed timestamp record. Rate-limited to 10 req/min per IP.",
        security: [{ bearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StampRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Timestamp created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Timestamp" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/verify": {
      get: {
        operationId: "verifyHash",
        summary: "Look up timestamps for a hash",
        description:
          "Returns all timestamp records matching a given SHA-256 hash, ordered by creation time.",
        parameters: [
          {
            name: "hash",
            in: "query",
            required: true,
            schema: {
              type: "string",
              pattern: "^[a-f0-9]{64}$",
              description: "SHA-256 hex hash",
            },
          },
        ],
        responses: {
          "200": {
            description: "Array of matching timestamps",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/TimestampPublic" },
                },
              },
            },
          },
          "400": {
            description: "Invalid hash",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/my-timestamps": {
      get: {
        operationId: "listMyTimestamps",
        summary: "List authenticated user's timestamps",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "User's timestamps",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Timestamp" },
                },
              },
            },
          },
          "401": { description: "Not authenticated" },
        },
      },
    },
    "/health": {
      get: {
        operationId: "healthCheck",
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase JWT access token",
      },
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "apikey",
        description: "Supabase anon/publishable key",
      },
    },
    schemas: {
      StampRequest: {
        type: "object",
        required: ["hash", "file_size"],
        properties: {
          hash: {
            type: "string",
            pattern: "^[a-f0-9]{64}$",
            description: "SHA-256 hex digest of the file",
          },
          file_size: {
            type: "number",
            minimum: 0,
            description: "File size in bytes",
          },
          file_name: {
            type: "string",
            maxLength: 500,
            nullable: true,
            description: "Optional original file name",
          },
        },
      },
      Timestamp: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          hash: { type: "string" },
          file_size: { type: "number" },
          file_name: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          server_signature: { type: "string", description: "HMAC-SHA256 signature over hash:created_at" },
          user_id: { type: "string", format: "uuid", nullable: true },
        },
      },
      TimestampPublic: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          hash: { type: "string" },
          file_size: { type: "number" },
          created_at: { type: "string", format: "date-time" },
          server_signature: { type: "string" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
};

app.get("/openapi.json", (c) => {
  return c.json(openApiSpec);
});

Deno.serve(app.fetch);