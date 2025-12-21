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

CMD ["node", "dist/main.js"]
