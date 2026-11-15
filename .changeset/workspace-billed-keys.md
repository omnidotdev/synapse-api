---
"@omnidotdev/synapse-api": minor
---

API keys now belong to a workspace and bill to it, so a paid workspace's keys get its plan and share its monthly request allowance. Workspace members can see the workspace's keys, admins can revoke any of them and set a spending limit ($10 minimum), and deleting a workspace revokes its keys. Existing keys move to their owner's personal workspace.
