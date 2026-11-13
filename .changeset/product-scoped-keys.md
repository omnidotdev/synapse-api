---
"@omnidotdev/synapse-api": minor
---

Let other Omni products provision managed keys that bill under their own product

`/internal/provision-managed-key` accepts an optional `appId` and `billingEntity`. A product (e.g. Facet) can provision a per-end-user managed key, and `/internal/resolve-key` returns `appId` and `billingEntity` so the gateway meters, charges, and checks entitlements against that product and entity, rather than the user's own Synapse account. A product key reads its entitlements and tier from the product, never overwrites the user's Synapse plan, and is not counted against the user's Synapse monthly request quota. Each user keeps one managed key per product, and rotating one product's key never touches another.

`appId` must be a lowercase slug and the entity must be a `user` or `organization` with a UUID id, enforced at the endpoint and by database check constraints, because the gateway places these values in billing URL paths.

Backward compatible: keys provisioned without an `appId` behave exactly as before, and `resolve-key` returns `appId: null` for them.
