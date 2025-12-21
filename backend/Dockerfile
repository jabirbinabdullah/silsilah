# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY scripts ./scripts
COPY test ./test
COPY AUTHORIZATION.md ./

# Build
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy production node_modules
COPY --from=base /app/package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=base /app/dist ./dist
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/AUTHORIZATION.md ./

# Expose default NestJS port
EXPOSE 3000

# Health check using /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/main.js"]
