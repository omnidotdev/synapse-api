<div align="center">
  <h1 align="center">🧠 Synapse API</h1>

[Website](https://synapse.omni.dev) | [Docs](https://docs.omni.dev/products/synapse) | [Feedback](https://github.com/omnidotdev/synapse-stack/issues) | [Discord](https://discord.gg/omnidotdev) | [X](https://x.com/omnidotdev) | [Threads](https://www.threads.com/@omnidotdev)

</div>

**Synapse API** is the GraphQL API for Synapse, built with [Bun](https://bun.sh), [Elysia](https://elysiajs.com), and TypeScript.

## Features

- 🚀 **Modern Stack**: Built with [Bun](https://bun.sh), [Elysia](https://elysiajs.com), and TypeScript
- 🧩 **Powerful GraphQL API**: [PostGraphile](https://postgraphile.org), [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server), [Grafast](https://grafast.org), [Relay](https://relay.dev/docs/guides/graphql-server-specification) compliance
- 🔒 **Security**: [GraphQL Armor](https://escape.tech/graphql-armor), JWT/JWKS validation, CORS, rate limiting, TLS
- ⚡ **Performance**: Query caching, connection pooling, optimized execution
- 🗄️ **Database**: [Drizzle ORM](https://orm.drizzle.team), automated migrations, seeding, [Drizzle Studio](https://orm.drizzle.team/drizzle-studio)
- 📡 **Observability**: [OpenTelemetry](https://opentelemetry.io) traces, metrics, and structured logs
- 🧪 **Testing**: [Bun test runner](https://bun.sh/docs/cli/test), [Testcontainers](https://testcontainers.com), [MSW](https://mswjs.io)
- 🛠️ **DX**: Hot reloading, [Biome](https://biomejs.dev), [Husky](https://typicode.github.io/husky), [Knip](https://knip.dev), [Tilt](https://tilt.dev)
- 🚢 **Production Ready**: Health checks (`/health`, `/ready`), graceful shutdown, security headers

## Local Development

First, `cp .env.local.template .env.local` and fill in the values. Then, generate TLS certificates by running `bun src/scripts/generateTlsCert.ts`.

### Building and Running

Run `tilt up`, or:

Install dependencies:

```sh
bun install
```

Set up the database (only required once, to create the database):

```sh
bun db:setup
```

Run database migrations:

```sh
bun db:migrate
```

Run the dev server:

```sh
bun dev
```

### Database Scripts

| Script | Description |
|--------|-------------|
| `bun db:setup` | Create the database (first-time setup) |
| `bun db:generate` | Generate migration files from schema changes |
| `bun db:migrate` | Run pending migrations |
| `bun db:migrate:drop` | Drop a migration |
| `bun db:pull` | Introspect existing database schema |
| `bun db:push` | Push schema changes directly (dev only) |
| `bun db:seed` | Seed database with test data |
| `bun db:studio` | Open Drizzle Studio |

### Code Quality

| Script | Description |
|--------|-------------|
| `bun check` | Lint and format check (Biome) |
| `bun format` | Auto-format the codebase (Biome) |
| `bun lint` | Lint only (Biome) |
| `bun knip` | Detect unused files, exports, and dependencies |
| `bunx tsc --noEmit` | Type-check without emitting output |

## Diagnostics

The server exposes two unauthenticated probes:

- `GET /health` returns service status and the running commit.
- `GET /ready` returns `200` when the database is reachable, `503` otherwise.

```sh
curl -k https://localhost:4000/health
curl -k https://localhost:4000/ready
```

In development the server runs over TLS (see the certificate step above), so pass `-k` to `curl`. In production authorization is mandatory: the server refuses to boot when `AUTHZ_API_URL` is unset. Optional integrations (billing, event streaming, vault) log a warning and degrade gracefully when unconfigured.

## Docker

Build and run with Docker:

```sh
docker build -t synapse-api .
docker run -p 4000:4000 synapse-api
```

## Testing

```sh
bun test

# or in watch mode
bun test:watch

# or test with coverage reporting
bun test:coverage
```

## License

The code in this repository is licensed under Apache 2.0, &copy; [Omni LLC](https://omni.dev). See [LICENSE.md](LICENSE.md) for more information.
