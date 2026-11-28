# @omnidotdev/synapse-api

## 0.1.0

### Minor Changes

- [#93](https://github.com/omnidotdev/synapse-api/pull/93) [`3e36023`](https://github.com/omnidotdev/synapse-api/commit/3e360234a29135299ca57458ace394e22164f3ea) Thanks [@coopbri](https://github.com/coopbri)! - Buying credits has moved to your Omni account, where you can pick a credit pack. The old fixed-amount credit checkout is removed.

- [`e94d386`](https://github.com/omnidotdev/synapse-api/commit/e94d386479d7a0bab27658b6ba2019a5bd8f34bd) Thanks [@coopbri](https://github.com/coopbri)! - Initial release of the Synapse API: manage provider keys, see usage and spend, and configure model routing.

- [#85](https://github.com/omnidotdev/synapse-api/pull/85) [`161a8d6`](https://github.com/omnidotdev/synapse-api/commit/161a8d6b335d9cecada8f7c5099b783cd54ac364) Thanks [@coopbri](https://github.com/coopbri)! - Daily usage per product is now recorded for accurate billing across Omni products.

- [#83](https://github.com/omnidotdev/synapse-api/pull/83) [`9d57953`](https://github.com/omnidotdev/synapse-api/commit/9d57953627366916c301b9ecf74bc80b993bb27d) Thanks [@coopbri](https://github.com/coopbri)! - If you belong to more than one workspace, each workspace now gets its own AI key, so using one never disrupts another. Replacing a key keeps the old one working for a few minutes to avoid interruptions, and new accounts get their free plan and credits set up automatically.

- [#82](https://github.com/omnidotdev/synapse-api/pull/82) [`119438f`](https://github.com/omnidotdev/synapse-api/commit/119438f7749bd78003dfd7732609ad8fce340c74) Thanks [@coopbri](https://github.com/coopbri)! - Other Omni products can now give you AI access billed to that product's plan, without affecting your own Synapse plan or monthly request allowance. Existing keys work exactly as before.

- [#87](https://github.com/omnidotdev/synapse-api/pull/87) [`86cd7c4`](https://github.com/omnidotdev/synapse-api/commit/86cd7c4a213e5c6909c7a96e2bdcd7008c177513) Thanks [@coopbri](https://github.com/coopbri)! - API keys now belong to a workspace and bill to it, so a paid workspace's keys get its plan and share its monthly request allowance. Workspace members can see the workspace's keys, admins can revoke any of them and set a spending limit ($10 minimum), and deleting a workspace revokes its keys. Existing keys move to their owner's personal workspace.

### Patch Changes

- [#101](https://github.com/omnidotdev/synapse-api/pull/101) [`185b104`](https://github.com/omnidotdev/synapse-api/commit/185b104eb817b150855a28ccbec59ac36ff47da7) Thanks [@coopbri](https://github.com/coopbri)! - The production build now runs in production mode, so API errors no longer include internal details and GraphQL runs without development overhead

- [#96](https://github.com/omnidotdev/synapse-api/pull/96) [`ec6ef32`](https://github.com/omnidotdev/synapse-api/commit/ec6ef32686bf1b8441f729a97b2ece238971fb9b) Thanks [@coopbri](https://github.com/coopbri)! - NVIDIA is no longer accepted as a default provider preference: the managed gateway no longer routes to the NVIDIA hosted API, whose terms allow trial use only

- [#95](https://github.com/omnidotdev/synapse-api/pull/95) [`38d855a`](https://github.com/omnidotdev/synapse-api/commit/38d855a1a37ddfecb02a77977a49c2098eccca2c) Thanks [@coopbri](https://github.com/coopbri)! - Security: the GraphQL API no longer exposes raw table reads. Accounts, usage, preferences and API key details are available only through the fields that check you own them, and stored provider credentials are no longer part of the GraphQL schema.

- [#84](https://github.com/omnidotdev/synapse-api/pull/84) [`64b2d68`](https://github.com/omnidotdev/synapse-api/commit/64b2d68a182130bbaf3e2e685b0eca358cd1cd98) Thanks [@coopbri](https://github.com/coopbri)! - Fixed plan and workspace checks that could fail, so quotas and workspace pages reflect your current plan.

- [#97](https://github.com/omnidotdev/synapse-api/pull/97) [`74a8723`](https://github.com/omnidotdev/synapse-api/commit/74a87234aa3817ffa0769c29c2cff619f09839a9) Thanks [@coopbri](https://github.com/coopbri)! - Move to the `@omnidotdev/providers` v0.2.0 release.

- [#86](https://github.com/omnidotdev/synapse-api/pull/86) [`9b3aaaf`](https://github.com/omnidotdev/synapse-api/commit/9b3aaaf967576155ddfea345d695adc7c2fee59a) Thanks [@coopbri](https://github.com/coopbri)! - Request overage now follows your plan's published rate, and the free plan stops at its monthly allowance.

- [#90](https://github.com/omnidotdev/synapse-api/pull/90) [`abbade7`](https://github.com/omnidotdev/synapse-api/commit/abbade7ace2087833e871b167aec534ce9ed2423) Thanks [@coopbri](https://github.com/coopbri)! - Fixed usage not being recorded for some requests. Usage and spend are now tracked for every request at sub-cent precision, across chat, embeddings, transcription, speech, and images.
