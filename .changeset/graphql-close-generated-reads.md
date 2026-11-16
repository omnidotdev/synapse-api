---
"@omnidotdev/synapse-api": patch
---

Security: the GraphQL API no longer exposes raw table reads. Accounts, usage, preferences and API key details are available only through the fields that check you own them, and stored provider credentials are no longer part of the GraphQL schema.
