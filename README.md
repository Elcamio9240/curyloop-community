<p align="center">
  <h1 align="center">Curyloop Community Edition</h1>
  <p align="center">
    Self-hosted, open-source knowledge management and team bookmark curation platform.
    <br />
    <a href="#quick-start"><strong>Quick Start</strong></a> · <a href="#features"><strong>Features</strong></a> · <a href="https://curyloop.com"><strong>Cloud Version</strong></a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/montarist/curyloop-community/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://github.com/montarist/curyloop-community/releases"><img src="https://img.shields.io/github/v/release/montarist/curyloop-community" alt="Release" /></a>
</p>

---

## Quick Start

```bash
docker run -d \
  -v curyloop-data:/data \
  -p 3000:3000 \
  -e ENCRYPTION_KEY=$(openssl rand -hex 32) \
  -e BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
  montarist/curyloop-community
```

Open **http://localhost:3000** and create your first account.

Or with Docker Compose:

```bash
curl -O https://raw.githubusercontent.com/montarist/curyloop-community/main/docker-compose.yml
docker compose up -d
```

## Features

- **Groups & Sessions** — Organize links into team workspaces and weekly trend sessions
- **Tags & Collections** — Categorize and curate content
- **Full-text Search** — SQLite FTS5 with BM25 weighted ranking
- **AI Agent (BYOK)** — Automated content discovery with OpenAI, Anthropic, or Google
- **Import** — Browser bookmarks, Pocket, Raindrop, Notion
- **Export** — JSON and CSV
- **Integrations** — Slack, Discord, Microsoft Teams, Telegram
- **Webhooks** — Subscribe to app events with HMAC-SHA256 signed payloads
- **MCP Endpoint** — Model Context Protocol for AI assistants
- **Browser Extension API** — API key-based authentication
- **Single Container** — One `docker run` command, ~200MB image, zero dependencies

### Community vs Cloud

| Feature                             | Community | Cloud |
| ----------------------------------- | :-------: | :---: |
| Groups, Sessions, Items (unlimited) |    ✅     |  ✅   |
| Tags, Collections, FTS5 Search      |    ✅     |  ✅   |
| AI Agent & Summaries (BYOK)         |    ✅     |  ✅   |
| Import / Export                     |    ✅     |  ✅   |
| Integrations & Webhooks             |    ✅     |  ✅   |
| MCP & Browser Extension             |    ✅     |  ✅   |
| OAuth (Google, GitHub)              |     —     |  ✅   |
| Push Notifications                  |     —     |  ✅   |
| Email Digests                       |     —     |  ✅   |
| Analytics Dashboard                 |     —     |  ✅   |
| Smart Collections                   |     —     |  ✅   |
| Managed Infrastructure              |     —     |  ✅   |

**[Try Curyloop Cloud →](https://curyloop.com)**

## Tech Stack

| Layer     | Choice                                     |
| --------- | ------------------------------------------ |
| Framework | Next.js 16 (App Router, standalone output) |
| Database  | SQLite (WAL mode, single file)             |
| ORM       | Drizzle ORM                                |
| Auth      | better-auth (email/password)               |
| UI        | Tailwind CSS 4 + Radix UI                  |
| AI        | Vercel AI SDK (BYOK)                       |
| Cron      | node-cron (in-process)                     |
| Search    | SQLite FTS5                                |

## Environment Variables

| Variable               | Required | Description                                               |
| ---------------------- | :------: | --------------------------------------------------------- |
| `ENCRYPTION_KEY`       | **Yes**  | 64-char hex string for AES-256-GCM encryption of LLM keys |
| `BETTER_AUTH_SECRET`   | **Yes**  | Random string (32+ chars) for session signing             |
| `DATABASE_PATH`        |    No    | SQLite file path (default: `/data/curyloop.db`)           |
| `NEXT_PUBLIC_SITE_URL` |    No    | Public URL (default: `http://localhost:3000`)             |
| `DISABLE_CLOUD_CTA`    |    No    | Set `true` to hide Cloud upgrade prompts                  |

## Development

```bash
# Clone the repo
git clone https://github.com/montarist/curyloop-community.git
cd curyloop-community

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
export ENCRYPTION_KEY=$(openssl rand -hex 32)
export BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# Run dev server
pnpm dev
```

Open **http://localhost:3000**.

### Available Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Start dev server with Turbopack  |
| `pnpm build`       | Production build                 |
| `pnpm start`       | Start production server          |
| `pnpm lint`        | Run ESLint                       |
| `pnpm type-check`  | Run TypeScript compiler check    |
| `pnpm db:generate` | Generate Drizzle migrations      |
| `pnpm db:migrate`  | Run pending migrations           |
| `pnpm db:studio`   | Open Drizzle Studio (DB browser) |

## Docker Build

```bash
docker build -t curyloop-community .

docker run -d \
  -v curyloop-data:/data \
  -p 3000:3000 \
  -e ENCRYPTION_KEY=$(openssl rand -hex 32) \
  -e BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
  curyloop-community
```

### Production Deployment

For production, run behind a reverse proxy with TLS:

```nginx
server {
    listen 443 ssl;
    server_name curyloop.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## API

### REST API

All endpoints under `/api/v1/` require authentication via session cookie or API key.

| Method   | Endpoint                  | Description          |
| -------- | ------------------------- | -------------------- |
| GET/POST | `/api/v1/groups`          | List / create groups |
| POST     | `/api/v1/sessions`        | Create session       |
| GET/POST | `/api/v1/items`           | List / create items  |
| GET      | `/api/v1/search?q=...`    | Full-text search     |
| POST     | `/api/v1/import`          | Import bookmarks     |
| GET      | `/api/export?format=json` | Export data          |
| POST/GET | `/api/v1/api-keys`        | Manage API keys      |

### Browser Extension API

| Method | Endpoint                  | Description              |
| ------ | ------------------------- | ------------------------ |
| GET    | `/api/extension/auth`     | Verify API key           |
| GET    | `/api/extension/sessions` | List recent sessions     |
| POST   | `/api/extension/items`    | Save item from extension |

### MCP Endpoint

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

- **Bug reports**: [Open an issue](https://github.com/montarist/curyloop-community/issues/new?template=bug_report.yml)
- **Feature requests**: [Open an issue](https://github.com/montarist/curyloop-community/issues/new?template=feature_request.yml)
- **Questions & ideas**: [GitHub Discussions](https://github.com/montarist/curyloop-community/discussions)

## Security

Found a vulnerability? Please see [SECURITY.md](./SECURITY.md) for responsible disclosure guidelines. Do **not** open a public issue for security concerns.

## License

[MIT](./LICENSE) — free to use, modify, and distribute.

---

<p align="center">
  <sub>
    <a href="https://curyloop.com">Curyloop Cloud</a> ·
    <a href="https://github.com/montarist/curyloop-community/issues">Issues</a> ·
    <a href="https://github.com/montarist/curyloop-community/discussions">Discussions</a>
  </sub>
</p>
