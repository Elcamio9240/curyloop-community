# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-10

### Added

- Initial release of Curyloop Community Edition
- Groups, sessions, and items management with role-based access
- Tags and collections for content organization
- Full-text search powered by SQLite FTS5 with BM25 weighted ranking
- AI Agent with BYOK support (OpenAI, Anthropic, Google)
- Automated content discovery with RSS/Atom feed monitoring
- Import from browser bookmarks, Pocket, Raindrop, and Notion
- Export to JSON and CSV formats
- Integrations: Slack, Discord, Microsoft Teams, Telegram
- Webhook endpoints with HMAC-SHA256 signed payloads
- MCP (Model Context Protocol) endpoint for AI assistants
- Browser extension API with API key authentication
- Email/password authentication via better-auth
- Single Docker container deployment (~200MB image)
- Auto-migration on startup
- In-process cron scheduling with node-cron
