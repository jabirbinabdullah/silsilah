# Deployment & Operations

## Build & Run with Docker

```bash
# Build image
docker build -t silsilah-backend -f backend/Dockerfile backend

# Run (example)
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://user:pass@mongo:27017/silsilah \
  -e JWT_SECRET=change-me-32-characters-min \
  -e ENABLE_AUTH_GUARD=true \
  silsilah-backend
```

### Health Checks
The Docker image includes a `HEALTHCHECK` instruction that pings `/health` every 30 seconds with a 5-second timeout. Orchestrators (Docker Compose, Kubernetes, ECS) will use this to monitor container health and trigger restarts if the endpoint fails 3 times consecutively. You can also call `/ready` to probe MongoDB connectivity specifically.

## Environment Separation
- `.env.example` documents variables for dev/test/prod.
- Recommended:
  - Local/dev: `ENABLE_AUTH_GUARD=false`, local Mongo, simple credentials.
  - E2E/CI: guard off unless testing auth; use isolated DB name.
  - Prod: `ENABLE_AUTH_GUARD=true`, strong `JWT_SECRET`, production Mongo URI.
- Use environment variables or secret mounts; do not commit secrets.

## Secrets Management
- Pass secrets via environment variables or orchestrator secret stores (Docker/K8s secrets, Azure Key Vault, AWS Secrets Manager, GCP Secret Manager).
- Avoid baking secrets into images or source.

## MongoDB Configuration
- `MONGODB_URI`: primary (read/write) connection.
- `MONGODB_READONLY_URI` (optional): read-only user/replica for queries; falls back to primary when unset.
- Tuning (defaults shown):
  - `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (5000)
  - `MONGODB_MAX_POOL_SIZE` (20)
  - `MONGODB_MIN_POOL_SIZE` (0)

### Read-only user (optional, advanced)
- Create a MongoDB user with `read` on the application database.
- Set `MONGODB_READONLY_URI` to point to that user (ideally against a secondary/analytics node).
- Queries and exports will use the read-only client when configured; mutations always use the primary client.

## Production Checklist
- `NODE_ENV=production`
- `ENABLE_AUTH_GUARD=true`
- Strong `JWT_SECRET` (>=32 chars)
- Distinct production database/credentials
- Network allowlist / TLS on MongoDB where applicable
- Run DB user with least privilege; consider read-only URI for viewer traffic

## Useful Commands
```bash
# Local dev
npm install
npm run start:dev

# Tests
npm run test:e2e --silent

# Build
npm run build
```
