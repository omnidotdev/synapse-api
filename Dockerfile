# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base
WORKDIR /app

# Build
FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
RUN bun run src/scripts/cacheSchemaHash.ts

# Run
FROM base AS runner
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 synapse && \
    useradd --system --uid 1001 --gid synapse synapse

COPY --from=builder --chown=synapse:synapse /app/node_modules ./node_modules
COPY --from=builder --chown=synapse:synapse /app/build ./build
COPY --from=builder --chown=synapse:synapse /app/package.json ./
COPY --from=builder --chown=synapse:synapse /app/tsconfig.json ./
COPY --from=builder --chown=synapse:synapse /app/src ./src
COPY --from=builder --chown=synapse:synapse /app/.cache ./.cache

USER synapse
EXPOSE 4000
CMD ["bun", "run", "start"]
