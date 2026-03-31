# Contributing to InsightArena Backend

NestJS backend for the InsightArena prediction market platform.

---

## Prerequisites

- Node.js 20+
- pnpm 9 — `npm install -g pnpm`
- PostgreSQL database
- Make

---

## Getting Started

### 1. Install Dependencies

```bash
make install
# or directly
pnpm install --frozen-lockfile
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your local DB credentials and secrets
```

### 3. Database Setup

```bash
# Run migrations
pnpm run migration:run

# Generate a new migration
pnpm run migration:generate -- src/migrations/MigrationName

# Revert last migration
pnpm run migration:revert
```

### 4. Run the Project

```bash
# Development (watch mode)
pnpm run start:dev

# Standard start
pnpm run start

# Production
pnpm run start:prod
```

API: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/api/v1/docs`

---

## Health Check

**Endpoint**: `GET /api/v1/health` (public, no auth)

Verifies:

- HTTP service is responding
- PostgreSQL connection is active
- Disk space is available (alerts at 90% usage)

```bash
curl -f http://localhost:3000/api/v1/health || exit 1
```

---

## Development Workflow

```bash
# 1. Create a feature branch
git checkout -b feature/your-feature-name

# 2. Develop with watch mode
pnpm run start:dev

# 3. Run CI checks before committing
make ci

# 4. Commit and push only if all checks pass
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
```

---

## CI Checks

Always run the full pipeline before committing. This mirrors exactly what GitHub Actions runs.

```bash
make ci
```

This runs in order:

1. ✅ ESLint — code quality
2. ✅ Jest unit tests — all `*.spec.ts` files
3. ✅ TypeScript build — via NestJS CLI

### Individual Commands

```bash
make lint    # Run ESLint only
make test    # Run Jest only
make build   # Build only
make clean   # Remove dist/ and coverage/
make help    # List all targets
```

---

## Troubleshooting CI Failures

### Linting errors

```bash
# Auto-fix most issues
pnpm run lint

# Check without fixing
pnpm run lint -- --fix=false

# Check a specific file
pnpm run lint -- src/path/to/file.ts
```

### Test failures

```bash
# Run a specific test file
pnpm run test -- roles.guard.spec.ts

# Run in watch mode for debugging
pnpm run test:watch

# Run with coverage report
pnpm run test:cov
```

### Build errors

```bash
# Clean and rebuild
make clean && make build
```

### pnpm not found

```bash
npm install -g pnpm
```

### make not found

**Ubuntu/Debian:**

```bash
sudo apt-get install build-essential
```

**macOS:**

```bash
xcode-select --install
```

**Windows:** Use WSL or run commands directly:

```bash
pnpm run lint && pnpm run test && pnpm run build
```

### Database connection issues

Ensure `DATABASE_URL` in `.env` is correct:

```
DATABASE_URL=postgresql://user:password@localhost:5432/insightarena
```

---

## Code Quality Standards

### TypeScript

- Avoid `any` — use strict types
- Prefer interfaces for object shapes
- Use enums for fixed value sets

### Testing

- Write unit tests for all guards, services, and controllers
- Target >80% code coverage
- Test both success and error paths
- Use descriptive test names

### Linting & Formatting

- ESLint rules must pass (`make lint`)
- Prettier handles formatting (configured in `.prettierrc`)
- No unused variables or imports

---

## Need Help?

- Check [README.md](../README.md) for setup instructions
- Open an issue for bugs or questions
- Join the community on Telegram: https://t.me/+hR9dZKau8f84YTk0
