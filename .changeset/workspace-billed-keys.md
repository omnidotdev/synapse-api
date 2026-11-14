---
"@omnidotdev/synapse-api": minor
---

Bill direct API keys to the workspace that owns them

Synapse checkout subscribes a workspace, but direct keys metered and resolved their tier against the user who created them, so a paying workspace's keys were still treated as Free (capped at the free request allowance, no overage). Every direct key now belongs to a workspace (`api_key.organization_id`, the creator's personal workspace by default):

- Key resolution returns the workspace as the billing entity, so the gateway meters, checks, and bills the workspace's Aether account, and the tier and request quota come from the workspace's entitlements. The monthly request quota is shared by every key in the workspace
- `generateApiKey` takes the key's `organizationId` (or inherits it from a Synapse workspace resource) and requires the workspace admin role; the API key limit counts the workspace's keys
- `apiKeys(organizationId:)` lists a workspace's keys to its members, and a workspace admin can revoke any of them
- Deleting a workspace revokes its keys
- Warden permission checks now ask about the identity provider user id; they previously sent Synapse's own user row id, which Warden never recognizes
- `src/scripts/db/backfillKeyWorkspaces.ts` moves legacy direct keys into their owner's personal workspace; keys it has not moved keep billing their owner
- `Observer.spendingLimit(organizationId:)` (workspace members) and `setSpendingLimit(organizationId:, hardLimitCents:)` (workspace admins, $10 minimum) read and change a workspace's Synapse hard spending limit in Aether, Warden-enforced here
