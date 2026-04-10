<div align="center">

# Synapse API

GraphQL API for Synapse

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE.md)

</div>

## Overview

Synapse API is the backend service powering the Synapse dashboard. Built with Elysia, PostGraphile, and Drizzle ORM on PostgreSQL, it exposes a Relay-compliant GraphQL schema for managing provider keys, usage analytics, routing policies, and billing integration.

## Features

- **GraphQL** - PostGraphile-generated schema with Grafast execution and GraphQL Armor
- **Authentication** - JWT validation with remote JWKS support, CSRF protection
- **Database** - PostgreSQL with Drizzle ORM and migrations
- **Observability** - OpenTelemetry traces, metrics, and structured logs

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- PostgreSQL

## Development

```bash
# Copy environment template
cp .env.local.template .env.local

# From metarepo root
tilt up

# Or directly
bun i
bun db:setup
bun db:migrate
bun dev
```

## Database

```bash
bun db:generate   # Generate migrations from schema changes
bun db:migrate    # Apply pending migrations
bun db:seed       # Seed development data
bun db:studio     # Open Drizzle Studio
```

## Testing

```bash
bun test
bun test:watch
bun test:coverage
```

## License

The code in this repository is licensed under Apache 2.0, &copy; [Omni LLC](https://omni.dev). See [LICENSE.md](LICENSE.md) for more information.
