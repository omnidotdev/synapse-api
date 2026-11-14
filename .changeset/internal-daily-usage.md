---
"@omnidotdev/synapse-api": minor
---

Expose managed AI usage per product per day for Aether's reconciliation

`GET /internal/usage/daily?date=YYYY-MM-DD` returns, per product (`api_key.app_id`, or `synapse` for direct keys), the managed cost the gateway reported (cents) and the record count for that UTC day. BYOK usage is excluded. Aether authenticates with the pairwise service key synapse-api already holds as `BILLING_SERVICE_API_KEY`; every request is rejected when it is unset.
