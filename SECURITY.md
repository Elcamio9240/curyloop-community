# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **security@curyloop.com** with:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

We will acknowledge your report within **48 hours** and aim to provide a fix within **7 days** for critical issues.

## Security Considerations

### Self-Hosted Deployment

When self-hosting Curyloop Community, keep in mind:

- **ENCRYPTION_KEY**: Used for AES-256-GCM encryption of stored LLM API keys. Keep this secret and back it up — losing it means losing access to encrypted keys.
- **BETTER_AUTH_SECRET**: Used for session signing. Rotate it to invalidate all sessions.
- **DATABASE_PATH**: The SQLite database contains all user data. Ensure the `/data` volume has appropriate filesystem permissions.
- **Network**: Run behind a reverse proxy (nginx, Caddy, Traefik) with TLS in production.
- **Updates**: Keep your Docker image updated to receive security patches.

### API Keys

- API keys are hashed with SHA-256 before storage — the raw key is only shown once at creation.
- LLM provider keys are encrypted at rest using AES-256-GCM.

## Responsible Disclosure

We appreciate the security research community's efforts to improve our software. Reporters who follow responsible disclosure will be credited (with permission) in our release notes.
