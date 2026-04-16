import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Simple in-memory rate limiter (per-isolate)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { hash, file_size, file_name } = await req.json();

    // Validate hash
    if (!hash || typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) {
      return new Response(JSON.stringify({ error: "Invalid SHA-256 hash" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file_size with upper bound (10 TB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024 * 1024;
    if (typeof file_size !== "number" || file_size < 0 || file_size > MAX_FILE_SIZE || !Number.isFinite(file_size)) {
      return new Response(JSON.stringify({ error: "Invalid file_size" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file_name if provided
    if (file_name !== undefined && file_name !== null) {
      if (typeof file_name !== "string" || file_name.length > 500) {
        return new Response(JSON.stringify({ error: "Invalid file_name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Extract user_id from JWT (never trust client-supplied value)
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data } = await supabaseAuth.auth.getUser();
      user_id = data.user?.id ?? null;
    }

    const created_at = new Date().toISOString();

    // Create HMAC signature over hash + created_at
    const secret = Deno.env.get("HMAC_SECRET");
    if (!secret) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${hash}:${created_at}`)
    );
    const server_signature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Insert using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("timestamps")
      .insert({
        hash,
        file_size,
        file_name: file_name || null,
        created_at,
        server_signature,
        user_id,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: "Failed to create timestamp" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
