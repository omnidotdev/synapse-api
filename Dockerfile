# syntax=docker/dockerfile:1

FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS base
WORKDIR /app

# Build
FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG GIT_SHA
RUN echo "$GIT_SHA" > /app/.git-sha
RUN bun run build
# Guard: bun's bundler can emit an undefined __promiseAll helper for concurrent
# async-module init, crash-looping the server on boot (the 2026-06 aether
# incident). Fail the build before a broken bundle can deploy.
RUN if grep -q '__promiseAll' build/server.js && \
      ! grep -qE '(function|var|let|const) +__promiseAll' build/server.js; then \
      echo 'FATAL: bundle references undefined __promiseAll (bun bundler bug); aborting build'; exit 1; \
    fi
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

COPY --from=builder /app/.git-sha ./.git-sha

USER synapse
EXPOSE 4000
CMD ["bun", "run", "start"]
