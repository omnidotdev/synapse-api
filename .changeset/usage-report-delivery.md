---
"@omnidotdev/synapse-api": patch
---

Record every usage report the gateway sends, at sub-cent precision

`POST /internal/report-usage` rejected every gateway batch (422) because the gateway sends `workspaceId: null` for keys outside a workspace, so `usage_event` stayed empty and dashboard usage and Aether's daily reconciliation had nothing to read. It now accepts a null workspace, stores `cost_cents` as `numeric(14,2)` (Aether's $0.0001 ledger precision instead of whole cents), records the served `modality` (completion, embedding, transcription, speech, image_generation, image_edit) and the gateway's served time (`occurredAt`), and skips an event with an unknown user or key instead of failing its whole batch. `GET /internal/usage/daily` sums every modality and counts only charged records, matching what Aether charges.
