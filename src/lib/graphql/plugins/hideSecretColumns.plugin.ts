import { jsonPgSmartTags } from "postgraphile/utils";

/**
 * Keep credential material out of the GraphQL schema entirely.
 *
 * `provider_key.encrypted_key` is a user's BYOK provider credential
 * (ciphertext) and `api_key.key_hash` is the lookup hash for a Synapse key.
 * Neither is ever read through GraphQL (the gateway reads them through
 * Drizzle), and both were exposed to any signed-in caller while the generated
 * root reads were open
 */
const hideSecretColumnsPlugin = jsonPgSmartTags(
  {
    version: 1,
    config: {
      attribute: {
        "provider_key.encrypted_key": { tags: { behavior: "-*" } },
        "api_key.key_hash": { tags: { behavior: "-*" } },
      },
    },
  },
  null,
  { name: "HideSecretColumnsPlugin" },
);

export default hideSecretColumnsPlugin;
