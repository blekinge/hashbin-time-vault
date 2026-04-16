# Hashbin — Trusted File Timestamping

[hashbin.net](https://hashbin.net) · [API Docs](https://hashbin.net/docs) · [CLI](https://hashbin.net/cli)

Prove a file existed at a specific moment in time. Files are hashed **locally** in your browser or on the command line — nothing is uploaded. An HMAC-signed timestamp is stored server-side as tamper-proof evidence.

## Features

- **Client-side hashing** — SHA-256, SHA-512, SHA-1, and MD5 computed in-browser via Web Crypto API
- **HMAC-signed timestamps** — each record is signed server-side with `HMAC-SHA256(hash:created_at)`
- **Verify anytime** — look up any hash to see when it was first recorded
- **Multi-algorithm support** — auto-detects hash type by length, or specify explicitly
- **User accounts** — optional sign-in (email + Google OAuth) to track your timestamps
- **REST API** — OpenAPI 3.1 spec with Swagger UI at `/docs`
- **Linux CLI** — standalone Python 3.8+ tool, zero dependencies
- **GNOME integration** — Nautilus right-click script for one-click stamping

## Quick Start

### Web

Visit [hashbin.net](https://hashbin.net), drop a file, and get a signed timestamp.

### CLI

```bash
# Install
curl -sL https://raw.githubusercontent.com/blekinge/hashbin-time-vault/main/cli/hashbin \
  -o ~/.local/bin/hashbin && chmod +x ~/.local/bin/hashbin

# Stamp a file
hashbin stamp document.pdf

# Verify a file
hashbin verify document.pdf

# Check API health
hashbin health
```

See [cli/README.md](cli/README.md) for shell completion (bash/zsh), GNOME integration, and more.

## API

Base URL: `https://pbmxyksctgwezyexzrtk.supabase.co/functions/v1/api`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/stamp` | POST | Optional | Create a signed timestamp (rate-limited: 10 req/min) |
| `/verify?hash=...` | GET | No | Look up timestamps for a hash |
| `/my-timestamps` | GET | Required | List authenticated user's timestamps |
| `/health` | GET | No | Health check |
| `/openapi.json` | GET | No | OpenAPI 3.1 specification |

Interactive docs: [hashbin.net/docs](https://hashbin.net/docs)

## Architecture

```
Browser / CLI
    │
    │  hashes computed locally
    │
    ▼
Edge Function (Hono on Deno)
    │
    │  HMAC signing, validation, rate limiting
    │
    ▼
PostgreSQL (Supabase)
    └── timestamps table (RLS-protected)
```

- **Frontend**: React 18, Vite, Tailwind CSS, TypeScript
- **Backend**: Supabase Edge Functions (Deno + Hono)
- **Database**: PostgreSQL with Row-Level Security
- **Auth**: Supabase Auth (email + Google OAuth)
- **Hosting**: Lovable Cloud

## Project Structure

```
├── src/
│   ├── pages/          # Index, Verify, Explore, Docs, CLI, Auth, MyTimestamps
│   ├── components/     # Layout, NavLink, shadcn/ui components
│   ├── lib/            # hash.ts (Web Crypto), api.ts (API base URL)
│   └── integrations/   # Supabase client (auto-generated)
├── cli/
│   ├── hashbin                    # Python CLI tool
│   ├── hashbin-completion.bash    # Bash completion
│   ├── _hashbin                   # Zsh completion
│   ├── hashbin-nautilus-stamp.sh  # GNOME Nautilus script
│   └── hashbin.desktop            # Desktop entry
├── supabase/
│   └── functions/api/index.ts     # Edge function (Hono API)
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

## Security

- Files never leave the client — only hashes are transmitted
- All timestamps are HMAC-signed with a server-side secret
- Database access is protected by Row-Level Security policies
- Rate limiting prevents abuse (10 requests/min per IP)
- Optional authentication via JWT

## License

Licensed under the [Apache License 2.0](LICENSE).

## Links

- **Website**: [hashbin.net](https://hashbin.net)
- **GitHub**: [github.com/blekinge/hashbin-time-vault](https://github.com/blekinge/hashbin-time-vault)
