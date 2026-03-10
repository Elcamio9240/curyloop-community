# Contributing to Curyloop Community

Thank you for your interest in contributing! Whether it's a bug fix, a new feature, better documentation, or a translation — all contributions are welcome.

## Getting Started

### Prerequisites

- **Node.js** 22+
- **pnpm** 10+
- **Git**

### Development Setup

1. **Fork** this repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/community.git
   cd curyloop-community
   ```
3. **Install dependencies:**
   ```bash
   pnpm install
   ```
4. **Set up environment:**
   ```bash
   cp .env.example .env
   ```
   Then fill in the required values (or generate them):
   ```bash
   export ENCRYPTION_KEY=$(openssl rand -hex 32)
   export BETTER_AUTH_SECRET=$(openssl rand -base64 32)
   ```
5. **Run the dev server:**
   ```bash
   pnpm dev
   ```
6. Open **http://localhost:3000** and create a test account.

## How to Contribute

### Reporting Bugs

- Use the [Bug Report](https://github.com/montarist/curyloop-community/issues/new?template=bug_report.yml) issue template
- Include your deployment method, version, and steps to reproduce
- Attach relevant logs or screenshots

### Suggesting Features

- Use the [Feature Request](https://github.com/montarist/curyloop-community/issues/new?template=feature_request.yml) issue template
- Describe the problem you're trying to solve
- Check existing issues first to avoid duplicates

### Submitting Code

1. **Create a branch** from `main`:
   ```bash
   git checkout -b fix/your-fix-description
   # or
   git checkout -b feat/your-feature-description
   ```

2. **Make your changes** following the code guidelines below

3. **Verify your changes:**
   ```bash
   pnpm lint          # ESLint
   pnpm type-check    # TypeScript
   pnpm build         # Production build
   ```

4. **Commit** with a clear message:
   ```bash
   git commit -m "fix: resolve search ranking for short queries"
   ```

5. **Push** and open a Pull Request against `main`

### Improving Documentation

Documentation improvements are always welcome! This includes:
- README updates
- Code comments for complex logic
- API endpoint documentation
- Deployment guides for different platforms (Railway, Fly.io, etc.)

## Code Guidelines

### General

- Write **TypeScript** with strict mode — avoid `any`
- Follow existing code patterns and project structure
- Keep PRs focused and small — one concern per PR
- Add comments only where the logic isn't self-evident

### Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── (auth)/       # Login, register pages
│   ├── (dashboard)/  # Authenticated pages
│   └── api/          # API endpoints
├── components/       # React components
├── lib/              # Shared utilities
│   ├── db/           # Database schema, connection, migrations
│   ├── auth/         # Authentication config
│   ├── agent/        # AI agent processing
│   ├── import/       # Import parsers
│   ├── integrations/ # Slack, Discord, Teams, Telegram
│   └── webhooks/     # Webhook dispatch
└── middleware.ts     # Route protection
```

### Database Changes

If you modify the Drizzle schema (`src/lib/db/schema.ts`):

```bash
pnpm db:generate    # Generate migration SQL
```

Test with a fresh database to ensure migrations work from scratch.

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `chore:` | Build process, dependencies, CI |
| `style:` | Formatting, missing semicolons, etc. |

### PR Review Process

1. All PRs require at least one review
2. CI checks (lint, type-check, build) must pass
3. Keep the PR description clear — use the PR template
4. Respond to review feedback promptly

## Community

- **Issues**: [GitHub Issues](https://github.com/montarist/curyloop-community/issues) for bugs and features
- **Discussions**: [GitHub Discussions](https://github.com/montarist/curyloop-community/discussions) for questions and ideas

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
