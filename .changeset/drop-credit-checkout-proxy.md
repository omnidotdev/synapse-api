---
"@omnidotdev/synapse-api": minor
---

Remove `POST /credits/me/checkout`. It forwarded a dollar amount to Aether's credit checkout, which now sells only catalog credit packs; credits are bought on the Omni account hub (`account.omni.dev/billing`), and its only caller (beacon-app) links there now.
