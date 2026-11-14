---
"@omnidotdev/synapse-api": patch
---

Read the request overage rate from the catalog's typed `overageRates`

Key resolution decides whether a direct key over its monthly request quota may continue by reading the tier's request overage rate. It now reads `overage_rate_cents:requests` (the catalog's typed `overageRates.requests`, synced by Aether) instead of the retired untyped `overage_rate_per_1k`, and the free tier never continues past its quota whatever rates an account carries. The gateway keeps metering every request into Aether, which invoices the requests above the allowance and enforces the spending limit.
