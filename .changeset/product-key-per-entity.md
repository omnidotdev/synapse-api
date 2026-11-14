---
"@omnidotdev/synapse-api": minor
---

Keep one managed key per product billing entity, with a rotation grace window

A managed key is now unique per (user, source, product, billing entity), so a user who belongs to two organizations holds an independent key for each, and provisioning one never rotates or re-points the other. Re-provisioning the same tuple still rotates its key, but the previous key keeps resolving for 10 minutes, so caller replicas that each provision and cache a key no longer invalidate each other. A partial unique index enforces one current key per tuple. Provisioning now checks `api_access` through Aether's authenticated, value-aware entitlement check, which also creates a brand-new end user's free tier (and free credit grant) for the product before the key is handed out; it denies only on Aether's answer and still provisions when billing is unavailable.
