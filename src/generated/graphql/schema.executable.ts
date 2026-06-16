// @ts-nocheck
/* eslint-disable graphile-export/export-instances, graphile-export/export-methods, graphile-export/export-plans, graphile-export/exhaustive-deps */
import { PgCondition, PgExecutor, TYPES, assertPgClassSingleStep, listOfCodec, makeRegistry, recordCodec, sqlValueWithCodec } from "@dataplan/pg";
import { isWithinLimit } from "@omnidotdev/providers/billing";
import { and, desc, eq, gte, isNull, lte, ne, sql as sql2 } from "drizzle-orm";
import { ConnectionStep, __ValueStep, access, connection, constant, context, get as get2, inhibitOnNull, inspect, lambda, list, makeDecodeNodeId, makeGrafastSchema, markSyncAndSafe, object, rootValue } from "grafast";
import { GraphQLError, Kind } from "graphql";
import { encrypt, generateApiKey } from "lib/crypto";
import { apiKeyProviderTable, apiKeyTable, providerKeyTable, usageEventTable, userPreferenceTable, workspaceTable } from "lib/db/schema";
import { publish } from "lib/events/publisher";
import { validateOrgMembership } from "lib/idp";
import { logAuditEvent } from "lib/logging";
import { billing, events } from "lib/providers";
import { isVaultEnabled, listVaultKeys, providerToUUID, removeVaultKey, setVaultKey } from "lib/vault/client";
import { sql } from "pg-sql2";
const rawNodeIdCodec = {
  name: "raw",
  encode: markSyncAndSafe(function rawEncode(value) {
    return typeof value === "string" ? value : null;
  }),
  decode: markSyncAndSafe(function rawDecode(value) {
    return typeof value === "string" ? value : null;
  })
};
const makeTableNodeIdHandler = ({
  typeName,
  nodeIdCodec,
  resource,
  identifier,
  pk,
  deprecationReason
}) => {
  return {
    typeName,
    codec: nodeIdCodec,
    plan($record) {
      return list([constant(identifier, !1), ...pk.map(attribute => $record.get(attribute))]);
    },
    getSpec($list) {
      return Object.fromEntries(pk.map((attribute, index) => [attribute, inhibitOnNull(access($list, [index + 1]))]));
    },
    getIdentifiers(value) {
      return value.slice(1);
    },
    get(spec) {
      return resource.get(spec);
    },
    match(obj) {
      return obj[0] === identifier;
    },
    deprecationReason
  };
};
const base64JSONNodeIdCodec = {
  name: "base64JSON",
  encode: markSyncAndSafe(function base64JSONEncode(value) {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
  }),
  decode: markSyncAndSafe(function base64JSONDecode(value) {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  })
};
const executor = new PgExecutor({
  name: "main",
  context() {
    const ctx = context();
    return object({
      pgSettings: ctx.get("pgSettings"),
      withPgClient: ctx.get("withPgClient")
    });
  }
});
const apiKeyProviderIdentifier = sql.identifier("public", "api_key_provider");
const spec_apiKeyProvider = {
  name: "apiKeyProvider",
  identifier: apiKeyProviderIdentifier,
  attributes: {
    __proto__: null,
    api_key_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    provider_key_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  extensions: {
    oid: "79594",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "api_key_provider"
    }
  },
  executor: executor
};
const apiKeyProviderCodec = recordCodec(spec_apiKeyProvider);
const workspaceIdentifier = sql.identifier("public", "workspace");
const spec_workspace = {
  name: "workspace",
  identifier: workspaceIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    organization_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    slug: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    name: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    description: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  extensions: {
    oid: "79671",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "workspace"
    }
  },
  executor: executor
};
const workspaceCodec = recordCodec(spec_workspace);
const userPreferenceIdentifier = sql.identifier("public", "user_preference");
const spec_userPreference = {
  name: "userPreference",
  identifier: userPreferenceIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    default_provider: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    notify_usage_threshold: {
      codec: TYPES.boolean,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    notify_key_expiry: {
      codec: TYPES.boolean,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  extensions: {
    oid: "79654",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user_preference"
    }
  },
  executor: executor
};
const userPreferenceCodec = recordCodec(spec_userPreference);
const providerKeyIdentifier = sql.identifier("public", "provider_key");
const spec_providerKey = {
  name: "providerKey",
  identifier: providerKeyIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    provider: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    encrypted_key: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    key_hint: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    model_preference: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  extensions: {
    oid: "79602",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "provider_key"
    }
  },
  executor: executor
};
const providerKeyCodec = recordCodec(spec_providerKey);
const userIdentifier = sql.identifier("public", "user");
const spec_user = {
  name: "user",
  identifier: userIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    identity_provider_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    email: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    name: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    avatar_url: {
      codec: TYPES.text,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    plan: {
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  extensions: {
    oid: "79638",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user"
    }
  },
  executor: executor
};
const userCodec = recordCodec(spec_user);
const apiKeyIdentifier = sql.identifier("public", "api_key");
const spec_apiKey = {
  name: "apiKey",
  identifier: apiKeyIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    workspace_id: {
      codec: TYPES.uuid,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    key_hash: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    key_hint: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    name: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    mode: {
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    last_used_at: {
      codec: TYPES.timestamptz,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    expires_at: {
      codec: TYPES.timestamptz,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    revoked_at: {
      codec: TYPES.timestamptz,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    updated_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  extensions: {
    oid: "79575",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "api_key"
    }
  },
  executor: executor
};
const apiKeyCodec = recordCodec(spec_apiKey);
const usageEventIdentifier = sql.identifier("public", "usage_event");
const spec_usageEvent = {
  name: "usageEvent",
  identifier: usageEventIdentifier,
  attributes: {
    __proto__: null,
    id: {
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    workspace_id: {
      codec: TYPES.uuid,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    api_key_id: {
      codec: TYPES.uuid,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    provider: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    model: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    input_tokens: {
      codec: TYPES.int,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    output_tokens: {
      codec: TYPES.int,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    cost_cents: {
      codec: TYPES.int,
      notNull: true,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    mode: {
      codec: TYPES.text,
      notNull: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    created_at: {
      codec: TYPES.timestamptz,
      hasDefault: true,
      extensions: {
        __proto__: null,
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  extensions: {
    oid: "79617",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "usage_event"
    }
  },
  executor: executor
};
const usageEventCodec = recordCodec(spec_usageEvent);
const api_key_providerUniques = [{
  attributes: ["api_key_id", "provider_key_id"],
  isPrimary: true
}];
const api_key_provider_resourceOptionsConfig = {
  executor: executor,
  name: "api_key_provider",
  identifier: "main.public.api_key_provider",
  from: apiKeyProviderIdentifier,
  codec: apiKeyProviderCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "api_key_provider"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: api_key_providerUniques
};
const workspaceUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const user_preferenceUniques = [{
  attributes: ["id"],
  isPrimary: true
}, {
  attributes: ["user_id"]
}];
const user_preference_resourceOptionsConfig = {
  executor: executor,
  name: "user_preference",
  identifier: "main.public.user_preference",
  from: userPreferenceIdentifier,
  codec: userPreferenceCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user_preference"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: user_preferenceUniques
};
const provider_keyUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const provider_key_resourceOptionsConfig = {
  executor: executor,
  name: "provider_key",
  identifier: "main.public.provider_key",
  from: providerKeyIdentifier,
  codec: providerKeyCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "provider_key"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: provider_keyUniques
};
const userUniques = [{
  attributes: ["id"],
  isPrimary: true
}, {
  attributes: ["identity_provider_id"]
}];
const user_resourceOptionsConfig = {
  executor: executor,
  name: "user",
  identifier: "main.public.user",
  from: userIdentifier,
  codec: userCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: userUniques
};
const api_keyUniques = [{
  attributes: ["id"],
  isPrimary: true
}, {
  attributes: ["key_hash"]
}];
const api_key_resourceOptionsConfig = {
  executor: executor,
  name: "api_key",
  identifier: "main.public.api_key",
  from: apiKeyIdentifier,
  codec: apiKeyCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "api_key"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: api_keyUniques
};
const usage_eventUniques = [{
  attributes: ["id"],
  isPrimary: true
}];
const usage_event_resourceOptionsConfig = {
  executor: executor,
  name: "usage_event",
  identifier: "main.public.usage_event",
  from: usageEventIdentifier,
  codec: usageEventCodec,
  extensions: {
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "usage_event"
    },
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  },
  uniques: usage_eventUniques
};
const registryConfig = {
  pgExecutors: {
    __proto__: null,
    main: executor
  },
  pgCodecs: {
    __proto__: null,
    apiKeyProvider: apiKeyProviderCodec,
    uuid: TYPES.uuid,
    timestamptz: TYPES.timestamptz,
    workspace: workspaceCodec,
    text: TYPES.text,
    userPreference: userPreferenceCodec,
    bool: TYPES.boolean,
    providerKey: providerKeyCodec,
    user: userCodec,
    apiKey: apiKeyCodec,
    usageEvent: usageEventCodec,
    int4: TYPES.int
  },
  pgResources: {
    __proto__: null,
    api_key_provider: api_key_provider_resourceOptionsConfig,
    workspace: {
      executor: executor,
      name: "workspace",
      identifier: "main.public.workspace",
      from: workspaceIdentifier,
      codec: workspaceCodec,
      extensions: {
        pg: {
          serviceName: "main",
          schemaName: "public",
          name: "workspace"
        },
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        canDelete: true
      },
      uniques: workspaceUniques
    },
    user_preference: user_preference_resourceOptionsConfig,
    provider_key: provider_key_resourceOptionsConfig,
    user: user_resourceOptionsConfig,
    api_key: api_key_resourceOptionsConfig,
    usage_event: usage_event_resourceOptionsConfig
  },
  pgRelations: {
    __proto__: null,
    apiKey: {
      __proto__: null,
      userByMyUserId: {
        localCodec: apiKeyCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      apiKeyProvidersByTheirApiKeyId: {
        localCodec: apiKeyCodec,
        remoteResourceOptions: api_key_provider_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["api_key_id"],
        isReferencee: true
      },
      usageEventsByTheirApiKeyId: {
        localCodec: apiKeyCodec,
        remoteResourceOptions: usage_event_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["api_key_id"],
        isReferencee: true
      }
    },
    apiKeyProvider: {
      __proto__: null,
      apiKeyByMyApiKeyId: {
        localCodec: apiKeyProviderCodec,
        remoteResourceOptions: api_key_resourceOptionsConfig,
        localAttributes: ["api_key_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      providerKeyByMyProviderKeyId: {
        localCodec: apiKeyProviderCodec,
        remoteResourceOptions: provider_key_resourceOptionsConfig,
        localAttributes: ["provider_key_id"],
        remoteAttributes: ["id"],
        isUnique: true
      }
    },
    providerKey: {
      __proto__: null,
      userByMyUserId: {
        localCodec: providerKeyCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      apiKeyProvidersByTheirProviderKeyId: {
        localCodec: providerKeyCodec,
        remoteResourceOptions: api_key_provider_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["provider_key_id"],
        isReferencee: true
      }
    },
    usageEvent: {
      __proto__: null,
      apiKeyByMyApiKeyId: {
        localCodec: usageEventCodec,
        remoteResourceOptions: api_key_resourceOptionsConfig,
        localAttributes: ["api_key_id"],
        remoteAttributes: ["id"],
        isUnique: true
      },
      userByMyUserId: {
        localCodec: usageEventCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true
      }
    },
    user: {
      __proto__: null,
      apiKeysByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: api_key_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isReferencee: true
      },
      providerKeysByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: provider_key_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isReferencee: true
      },
      usageEventsByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: usage_event_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isReferencee: true
      },
      userPreferenceByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: user_preference_resourceOptionsConfig,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isUnique: true,
        isReferencee: true
      }
    },
    userPreference: {
      __proto__: null,
      userByMyUserId: {
        localCodec: userPreferenceCodec,
        remoteResourceOptions: user_resourceOptionsConfig,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true
      }
    }
  }
};
const registry = makeRegistry(registryConfig);
const spec_resource_api_key_providerPgResource = registry.pgResources["api_key_provider"];
const nodeIdHandler_ApiKeyProvider = makeTableNodeIdHandler({
  typeName: "ApiKeyProvider",
  identifier: "ApiKeyProvider",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_api_key_providerPgResource,
  pk: api_key_providerUniques[0].attributes
});
const spec_resource_workspacePgResource = registry.pgResources["workspace"];
const nodeIdHandler_Workspace = makeTableNodeIdHandler({
  typeName: "Workspace",
  identifier: "Workspace",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_workspacePgResource,
  pk: workspaceUniques[0].attributes
});
const spec_resource_user_preferencePgResource = registry.pgResources["user_preference"];
const nodeIdHandler_UserPreference = makeTableNodeIdHandler({
  typeName: "UserPreference",
  identifier: "UserPreference",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_user_preferencePgResource,
  pk: user_preferenceUniques[0].attributes
});
const spec_resource_provider_keyPgResource = registry.pgResources["provider_key"];
const nodeIdHandler_ProviderKey = makeTableNodeIdHandler({
  typeName: "ProviderKey",
  identifier: "ProviderKey",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_provider_keyPgResource,
  pk: provider_keyUniques[0].attributes
});
const spec_resource_userPgResource = registry.pgResources["user"];
const nodeIdHandler_User = makeTableNodeIdHandler({
  typeName: "User",
  identifier: "User",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_userPgResource,
  pk: userUniques[0].attributes
});
const spec_resource_api_keyPgResource = registry.pgResources["api_key"];
const nodeIdHandler_ApiKey = makeTableNodeIdHandler({
  typeName: "ApiKey",
  identifier: "ApiKey",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_api_keyPgResource,
  pk: api_keyUniques[0].attributes
});
const spec_resource_usage_eventPgResource = registry.pgResources["usage_event"];
const nodeIdHandler_UsageEvent = makeTableNodeIdHandler({
  typeName: "UsageEvent",
  identifier: "UsageEvent",
  nodeIdCodec: base64JSONNodeIdCodec,
  resource: spec_resource_usage_eventPgResource,
  pk: usage_eventUniques[0].attributes
});
const nodeIdHandlerByTypeName = {
  __proto__: null,
  Query: {
    typeName: "Query",
    codec: rawNodeIdCodec,
    match(specifier) {
      return specifier === "query";
    },
    getIdentifiers(_value) {
      return [];
    },
    getSpec() {
      return "irrelevant";
    },
    get() {
      return rootValue();
    },
    plan() {
      return constant`query`;
    }
  },
  ApiKeyProvider: nodeIdHandler_ApiKeyProvider,
  Workspace: nodeIdHandler_Workspace,
  UserPreference: nodeIdHandler_UserPreference,
  ProviderKey: nodeIdHandler_ProviderKey,
  User: nodeIdHandler_User,
  ApiKey: nodeIdHandler_ApiKey,
  UsageEvent: nodeIdHandler_UsageEvent
};
const decodeNodeId = makeDecodeNodeId(Object.values(nodeIdHandlerByTypeName));
function findTypeNameMatch(specifier) {
  if (!specifier) return null;
  for (const [typeName, typeSpec] of Object.entries(nodeIdHandlerByTypeName)) {
    const value = specifier[typeSpec.codec.name];
    if (value != null && typeSpec.match(value)) return typeName;
  }
  console.warn(`Could not find a type that matched the specifier '${inspect(specifier)}'`);
  return null;
}
const nodeIdCodecs = {
  __proto__: null,
  raw: rawNodeIdCodec,
  base64JSON: base64JSONNodeIdCodec,
  pipeString: {
    name: "pipeString",
    encode: markSyncAndSafe(function pipeStringEncode(value) {
      return Array.isArray(value) ? value.join("|") : null;
    }),
    decode: markSyncAndSafe(function pipeStringDecode(value) {
      return typeof value === "string" ? value.split("|") : null;
    })
  }
};
const ApiKeyProvider_apiKeyIdPlan = $record => {
  return $record.get("api_key_id");
};
const ApiKeyProvider_createdAtPlan = $record => {
  return $record.get("created_at");
};
const ApiKeyProvider_apiKeyPlan = $record => spec_resource_api_keyPgResource.get({
  id: $record.get("api_key_id")
});
function toString(value) {
  return "" + value;
}
const coerce = string => {
  if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(string)) throw new GraphQLError("Invalid UUID, expected 32 hexadecimal characters, optionally with hyphens");
  return string;
};
const ApiKey_rowIdPlan = $record => {
  return $record.get("id");
};
const ApiKey_userIdPlan = $record => {
  return $record.get("user_id");
};
const ApiKey_workspaceIdPlan = $record => {
  return $record.get("workspace_id");
};
const ApiKey_keyHintPlan = $record => {
  return $record.get("key_hint");
};
const ApiKey_updatedAtPlan = $record => {
  return $record.get("updated_at");
};
const ApiKey_userPlan = $record => spec_resource_userPgResource.get({
  id: $record.get("user_id")
});
function applyFirstArg(_, $connection, arg) {
  $connection.setFirst(arg.getRaw());
}
function applyLastArg(_, $connection, val) {
  $connection.setLast(val.getRaw());
}
function applyOffsetArg(_, $connection, val) {
  $connection.setOffset(val.getRaw());
}
function applyBeforeArg(_, $connection, val) {
  $connection.setBefore(val.getRaw());
}
function applyAfterArg(_, $connection, val) {
  $connection.setAfter(val.getRaw());
}
function qbWhereBuilder(qb) {
  return qb.whereBuilder();
}
const applyConditionArgToConnection = (_condition, $connection, arg) => {
  const $select = $connection.getSubplan();
  arg.apply($select, qbWhereBuilder);
};
function isEmpty(o) {
  return typeof o === "object" && o !== null && Object.keys(o).length === 0;
}
function assertAllowed(value, mode) {
  if (mode === "object" && !false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
  if (mode === "list" && !false) {
    const arr = value;
    if (arr) {
      const l = arr.length;
      for (let i = 0; i < l; i++) if (isEmpty(arr[i])) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
    }
  }
  if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
}
function ApiKey_apiKeyProvidersfilterApplyPlan(_, $connection, fieldArg) {
  const $pgSelect = $connection.getSubplan();
  fieldArg.apply($pgSelect, (queryBuilder, value) => {
    assertAllowed(value, "object");
    if (value == null) return;
    const condition = new PgCondition(queryBuilder);
    return condition;
  });
}
function applyOrderByArgToConnection(parent, $connection, value) {
  const $select = $connection.getSubplan();
  value.apply($select);
}
const totalCountConnectionPlan = $connection => $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
function applyAttributeCondition(attributeName, attributeCodec, $condition, val) {
  $condition.where({
    type: "attribute",
    attribute: attributeName,
    callback(expression) {
      return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, attributeCodec)}`;
    }
  });
}
const ApiKeyCondition_rowIdApply = ($condition, val) => applyAttributeCondition("id", TYPES.uuid, $condition, val);
const ApiKeyCondition_userIdApply = ($condition, val) => applyAttributeCondition("user_id", TYPES.uuid, $condition, val);
const pgConnectionFilterApplyAttribute = (fieldName, attributeName, attribute, queryBuilder, value) => {
  if (value === void 0) return;
  if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
  if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
  const condition = new PgCondition(queryBuilder);
  condition.extensions.pgFilterAttribute = {
    fieldName,
    attributeName,
    attribute
  };
  return condition;
};
const pgConnectionFilterApplySingleRelation = (foreignTable, foreignTableExpression, localAttributes, remoteAttributes, $where, value) => {
  assertAllowed(value, "object");
  if (value == null) return;
  const $subQuery = $where.existsPlan({
    tableExpression: foreignTableExpression,
    alias: foreignTable.name
  });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  $subQuery.ignoreUnlessAmended();
  return $subQuery;
};
function ApiKeyFilter_andApply($where, value) {
  assertAllowed(value, "list");
  if (value == null) return;
  return $where.andPlan();
}
function ApiKeyFilter_orApply($where, value) {
  assertAllowed(value, "list");
  if (value == null) return;
  const $or = $where.orPlan();
  return () => $or.andPlan();
}
function ApiKeyFilter_notApply($where, value) {
  assertAllowed(value, "object");
  if (value == null) return;
  return $where.notPlan().andPlan();
}
const pgConnectionFilterApplyFromOperator = (fieldName, resolve, resolveInput, resolveInputCodec, resolveSqlIdentifier, resolveSqlValue, $where, value) => {
  if (!$where.extensions?.pgFilterAttribute) throw Error("Planning error: expected 'pgFilterAttribute' to be present on the $where plan's extensions; your extensions to `postgraphile-plugin-connection-filter` does not implement the required interfaces.");
  if (value === void 0) return;
  const {
      fieldName: parentFieldName,
      attributeName,
      attribute,
      codec,
      expression
    } = $where.extensions.pgFilterAttribute,
    sourceAlias = attribute ? attribute.expression ? attribute.expression($where.alias) : sql`${$where.alias}.${sql.identifier(attributeName)}` : expression ? expression : $where.alias,
    sourceCodec = codec ?? attribute.codec,
    [sqlIdentifier, identifierCodec] = resolveSqlIdentifier ? resolveSqlIdentifier(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
  if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
  const resolvedInput = resolveInput ? resolveInput(value) : value,
    inputCodec = resolveInputCodec ? resolveInputCodec(codec ?? attribute.codec) : codec ?? attribute.codec,
    sqlValue = resolveSqlValue ? resolveSqlValue($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
    fragment = resolve(sqlIdentifier, sqlValue, value, $where, {
      fieldName: parentFieldName ?? null,
      operatorName: fieldName
    });
  $where.where(fragment);
};
const resolveIsNull = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveBoolean = () => TYPES.boolean;
const resolveSqlValue_null = () => sql.null;
function pgAggregatesApply_isNull($where, value) {
  return pgConnectionFilterApplyFromOperator("isNull", resolveIsNull, undefined, resolveBoolean, undefined, resolveSqlValue_null, $where, value);
}
const resolveEquality = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodecSensitive(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive.includes(resolveDomains(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifierSensitive(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive.includes(resolveDomains(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
function pgAggregatesApply_equalTo($where, value) {
  return pgConnectionFilterApplyFromOperator("equalTo", resolveEquality, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveInequality = (i, v) => sql`${i} <> ${v}`;
function pgAggregatesApply_notEqualTo($where, value) {
  return pgConnectionFilterApplyFromOperator("notEqualTo", resolveInequality, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveDistinct = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
function pgAggregatesApply_distinctFrom($where, value) {
  return pgConnectionFilterApplyFromOperator("distinctFrom", resolveDistinct, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveNotDistinct = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
function pgAggregatesApply_notDistinctFrom($where, value) {
  return pgConnectionFilterApplyFromOperator("notDistinctFrom", resolveNotDistinct, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveEqualsAny = (i, v) => sql`${i} = ANY(${v})`;
function resolveArrayInputCodecSensitive(c) {
  if (forceTextTypesSensitive.includes(resolveDomains(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
function pgAggregatesApply_in($where, value) {
  return pgConnectionFilterApplyFromOperator("in", resolveEqualsAny, undefined, resolveArrayInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveInequalAll = (i, v) => sql`${i} <> ALL(${v})`;
function pgAggregatesApply_notIn($where, value) {
  return pgConnectionFilterApplyFromOperator("notIn", resolveInequalAll, undefined, resolveArrayInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveLessThan = (i, v) => sql`${i} < ${v}`;
function pgAggregatesApply_lessThan($where, value) {
  return pgConnectionFilterApplyFromOperator("lessThan", resolveLessThan, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveLessThanOrEqualTo = (i, v) => sql`${i} <= ${v}`;
function pgAggregatesApply_lessThanOrEqualTo($where, value) {
  return pgConnectionFilterApplyFromOperator("lessThanOrEqualTo", resolveLessThanOrEqualTo, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveGreaterThan = (i, v) => sql`${i} > ${v}`;
function pgAggregatesApply_greaterThan($where, value) {
  return pgConnectionFilterApplyFromOperator("greaterThan", resolveGreaterThan, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveGreaterThanOrEqualTo = (i, v) => sql`${i} >= ${v}`;
function pgAggregatesApply_greaterThanOrEqualTo($where, value) {
  return pgConnectionFilterApplyFromOperator("greaterThanOrEqualTo", resolveGreaterThanOrEqualTo, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
}
const resolveLike = (i, v) => sql`${i} LIKE ${v}`;
function escapeLikeWildcards(input) {
  if (typeof input !== "string") throw Error("Non-string input was provided to escapeLikeWildcards");else return input.split("%").join("\\%").split("_").join("\\_");
}
const resolveInputContains = input => `%${escapeLikeWildcards(input)}%`;
const resolveNotLike = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolveILike = (i, v) => sql`${i} ILIKE ${v}`;
const forceTextTypesInsensitive = [TYPES.char, TYPES.bpchar];
function resolveInputCodecInsensitive(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesInsensitive.includes(resolveDomains(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesInsensitive.includes(resolveDomains(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifierInsensitive(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesInsensitive.includes(resolveDomains(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesInsensitive.includes(resolveDomains(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolveNotILike = (i, v) => sql`${i} NOT ILIKE ${v}`;
const resolveInputStartsWith = input => `${escapeLikeWildcards(input)}%`;
const resolveInputEndsWith = input => `%${escapeLikeWildcards(input)}`;
function resolveInputCodecInsensitiveOperator(inputCodec) {
  return resolveDomains(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifierInsensitiveOperator(sourceAlias, codec) {
  return resolveDomains(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValueInsensitiveOperator(_unused, input, inputCodec) {
  const sqlValue = sqlValueWithCodec(input, inputCodec);
  if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
}
function resolveInputCodecInsensitiveOperator_list(inputCodec) {
  const t = resolveDomains(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
  return listOfCodec(t, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
function resolveSqlValueInsensitiveOperator_list(_unused, input, inputCodec) {
  const sqlList = sqlValueWithCodec(input, inputCodec);
  if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
}
function ApiKeyToManyApiKeyProviderFilter_everyApply($where, value) {
  assertAllowed(value, "object");
  if (value == null) return;
  if (!$where.extensions.pgFilterRelation) throw Error("Invalid use of filter, 'pgFilterRelation' expected");
  const {
      localAttributes,
      remoteAttributes,
      tableExpression,
      alias
    } = $where.extensions.pgFilterRelation,
    $subQuery = $where.notPlan().existsPlan({
      tableExpression,
      alias
    });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  return $subQuery.notPlan().andPlan();
}
function ApiKeyToManyApiKeyProviderFilter_someApply($where, value) {
  assertAllowed(value, "object");
  if (value == null) return;
  if (!$where.extensions.pgFilterRelation) throw Error("Invalid use of filter, 'pgFilterRelation' expected");
  const {
      localAttributes,
      remoteAttributes,
      tableExpression,
      alias
    } = $where.extensions.pgFilterRelation,
    $subQuery = $where.existsPlan({
      tableExpression,
      alias
    });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  $subQuery.ignoreUnlessAmended();
  return $subQuery;
}
function ApiKeyToManyApiKeyProviderFilter_noneApply($where, value) {
  assertAllowed(value, "object");
  if (value == null) return;
  if (!$where.extensions.pgFilterRelation) throw Error("Invalid use of filter, 'pgFilterRelation' expected");
  const {
      localAttributes,
      remoteAttributes,
      tableExpression,
      alias
    } = $where.extensions.pgFilterRelation,
    $subQuery = $where.notPlan().existsPlan({
      tableExpression,
      alias
    });
  localAttributes.forEach((localAttribute, i) => {
    const remoteAttribute = remoteAttributes[i];
    $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
  });
  $subQuery.ignoreUnlessAmended();
  return $subQuery;
}
const ApiKeyOrderBy_ROW_ID_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "id",
    direction: "ASC"
  });
  queryBuilder.setOrderIsUnique();
};
const ApiKeyOrderBy_ROW_ID_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "id",
    direction: "DESC"
  });
  queryBuilder.setOrderIsUnique();
};
const ApiKeyOrderBy_USER_ID_ASCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "user_id",
    direction: "ASC"
  });
};
const ApiKeyOrderBy_USER_ID_DESCApply = queryBuilder => {
  queryBuilder.orderBy({
    attribute: "user_id",
    direction: "DESC"
  });
};
const ApiKeyProviderCondition_apiKeyIdApply = ($condition, val) => applyAttributeCondition("api_key_id", TYPES.uuid, $condition, val);
const assertOrgPermission = async (userId, organizationId, action) => {
  if (!null) return;
  if (!(await null.checkPermission(userId, "organization", organizationId, action))) throw new GraphQLError(`Insufficient permissions: requires ${action}`, {
    extensions: {
      code: "FORBIDDEN"
    }
  });
};
const extractAccessToken = request => request.headers.get("authorization")?.split("Bearer ")[1];
const specForHandlerCache = new Map();
function specForHandler(handler) {
  const existing = specForHandlerCache.get(handler);
  if (existing) return existing;
  const spec = markSyncAndSafe(function spec(nodeId) {
    if (nodeId == null) return null;
    try {
      const specifier = handler.codec.decode(nodeId);
      if (handler.match(specifier)) return specifier;
    } catch {}
    return null;
  }, `specifier_${handler.typeName}_${handler.codec.name}`);
  specForHandlerCache.set(handler, spec);
  return spec;
}
const nodeFetcher_ApiKeyProvider = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_ApiKeyProvider));
  return nodeIdHandler_ApiKeyProvider.get(nodeIdHandler_ApiKeyProvider.getSpec($decoded));
};
const nodeFetcher_Workspace = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_Workspace));
  return nodeIdHandler_Workspace.get(nodeIdHandler_Workspace.getSpec($decoded));
};
const nodeFetcher_UserPreference = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_UserPreference));
  return nodeIdHandler_UserPreference.get(nodeIdHandler_UserPreference.getSpec($decoded));
};
const nodeFetcher_ProviderKey = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_ProviderKey));
  return nodeIdHandler_ProviderKey.get(nodeIdHandler_ProviderKey.getSpec($decoded));
};
const nodeFetcher_User = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_User));
  return nodeIdHandler_User.get(nodeIdHandler_User.getSpec($decoded));
};
const nodeFetcher_ApiKey = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_ApiKey));
  return nodeIdHandler_ApiKey.get(nodeIdHandler_ApiKey.getSpec($decoded));
};
const nodeFetcher_UsageEvent = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_UsageEvent));
  return nodeIdHandler_UsageEvent.get(nodeIdHandler_UsageEvent.getSpec($decoded));
};
const DEFAULT_RETENTION_DAYS = {
  free: 7,
  pro: 90,
  team: 365
};
const resolveRetentionDays = (entitlements, tier) => {
  const entry = entitlements?.entitlements?.find(e => e.featureKey === "analytics_retention_days");
  if (entry?.value != null) {
    const val = Number(String(entry.value).replace(/"/g, ""));
    if (Number.isFinite(val)) return val === -1 ? 366 : val;
  }
  return DEFAULT_RETENTION_DAYS[tier] ?? DEFAULT_RETENTION_DAYS.free;
};
const assertOrgMembership = async (observerIdpId, organizationId) => {
  if (!(await validateOrgMembership(observerIdpId, organizationId))) throw new GraphQLError("Not a member of this organization", {
    extensions: {
      code: "FORBIDDEN"
    }
  });
};
const DEFAULT_LIMITS = {
  max_api_keys: {
    free: 3,
    pro: 25,
    team: -1
  }
};
const DEFAULT_LIMITS2 = {
  max_provider_keys: {
    free: 6,
    pro: 10,
    team: -1
  }
};
const DEFAULT_LIMITS3 = {
  max_workspaces: {
    free: 1,
    pro: 10,
    team: -1
  }
};
export const typeDefs = /* GraphQL */`"""An object with a globally unique \`ID\`."""
interface Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
}

type ApiKeyProvider implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  apiKeyId: UUID!
  providerKeyId: UUID!
  createdAt: Datetime

  """Reads a single \`ApiKey\` that is related to this \`ApiKeyProvider\`."""
  apiKey: ApiKey

  """Reads a single \`ProviderKey\` that is related to this \`ApiKeyProvider\`."""
  providerKey: ProviderKey
}

"""
A universally unique identifier as defined by [RFC 4122](https://tools.ietf.org/html/rfc4122).
"""
scalar UUID

"""
A point in time as described by the [ISO
8601](https://en.wikipedia.org/wiki/ISO_8601) and, if it has a timezone, [RFC
3339](https://datatracker.ietf.org/doc/html/rfc3339) standards. Input values
that do not conform to both ISO 8601 and RFC 3339 may be coerced, which may lead
to unexpected results.
"""
scalar Datetime

type ApiKey implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  userId: UUID!
  workspaceId: UUID
  keyHash: String!
  keyHint: String!
  name: String!
  mode: String!
  lastUsedAt: Datetime
  expiresAt: Datetime
  revokedAt: Datetime
  createdAt: Datetime
  updatedAt: Datetime

  """Reads a single \`User\` that is related to this \`ApiKey\`."""
  user: User

  """Reads and enables pagination through a set of \`ApiKeyProvider\`."""
  apiKeyProviders(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ApiKeyProviderCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ApiKeyProviderFilter

    """The method to use when ordering \`ApiKeyProvider\`."""
    orderBy: [ApiKeyProviderOrderBy!] = [PRIMARY_KEY_ASC]
  ): ApiKeyProviderConnection!

  """Reads and enables pagination through a set of \`UsageEvent\`."""
  usageEvents(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: UsageEventCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: UsageEventFilter

    """The method to use when ordering \`UsageEvent\`."""
    orderBy: [UsageEventOrderBy!] = [PRIMARY_KEY_ASC]
  ): UsageEventConnection!
}

type User implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  identityProviderId: UUID!
  email: String
  name: String
  avatarUrl: String
  plan: String!
  createdAt: Datetime
  updatedAt: Datetime

  """Reads and enables pagination through a set of \`ApiKey\`."""
  apiKeys(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ApiKeyCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ApiKeyFilter

    """The method to use when ordering \`ApiKey\`."""
    orderBy: [ApiKeyOrderBy!] = [PRIMARY_KEY_ASC]
  ): ApiKeyConnection!

  """Reads and enables pagination through a set of \`ProviderKey\`."""
  providerKeys(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ProviderKeyCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ProviderKeyFilter

    """The method to use when ordering \`ProviderKey\`."""
    orderBy: [ProviderKeyOrderBy!] = [PRIMARY_KEY_ASC]
  ): ProviderKeyConnection!

  """Reads and enables pagination through a set of \`UsageEvent\`."""
  usageEvents(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: UsageEventCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: UsageEventFilter

    """The method to use when ordering \`UsageEvent\`."""
    orderBy: [UsageEventOrderBy!] = [PRIMARY_KEY_ASC]
  ): UsageEventConnection!

  """Reads a single \`UserPreference\` that is related to this \`User\`."""
  userPreference: UserPreference
}

"""A connection to a list of \`ApiKey\` values."""
type ApiKeyConnection {
  """A list of \`ApiKey\` objects."""
  nodes: [ApiKey]!

  """
  A list of edges which contains the \`ApiKey\` and cursor to aid in pagination.
  """
  edges: [ApiKeyEdge]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`ApiKey\` you could get from the connection."""
  totalCount: Int!
}

"""A \`ApiKey\` edge in the connection."""
type ApiKeyEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`ApiKey\` at the end of the edge."""
  node: ApiKey
}

"""A location in a connection that can be used for resuming pagination."""
scalar Cursor

"""Information about pagination in a connection."""
type PageInfo {
  """When paginating forwards, are there more items?"""
  hasNextPage: Boolean!

  """When paginating backwards, are there more items?"""
  hasPreviousPage: Boolean!

  """When paginating backwards, the cursor to continue."""
  startCursor: Cursor

  """When paginating forwards, the cursor to continue."""
  endCursor: Cursor
}

"""
A condition to be used against \`ApiKey\` object types. All fields are tested for equality and combined with a logical ‘and.’
"""
input ApiKeyCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`userId\` field."""
  userId: UUID

  """Checks for equality with the object’s \`keyHash\` field."""
  keyHash: String
}

"""
A filter to be used against \`ApiKey\` object types. All fields are combined with a logical ‘and.’
"""
input ApiKeyFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`userId\` field."""
  userId: UUIDFilter

  """Filter by the object’s \`keyHash\` field."""
  keyHash: StringFilter

  """Filter by the object’s \`apiKeyProviders\` relation."""
  apiKeyProviders: ApiKeyToManyApiKeyProviderFilter

  """Some related \`apiKeyProviders\` exist."""
  apiKeyProvidersExist: Boolean

  """Filter by the object’s \`usageEvents\` relation."""
  usageEvents: ApiKeyToManyUsageEventFilter

  """Some related \`usageEvents\` exist."""
  usageEventsExist: Boolean

  """Filter by the object’s \`user\` relation."""
  user: UserFilter

  """Checks for all expressions in this list."""
  and: [ApiKeyFilter!]

  """Checks for any expressions in this list."""
  or: [ApiKeyFilter!]

  """Negates the expression."""
  not: ApiKeyFilter
}

"""
A filter to be used against UUID fields. All fields are combined with a logical ‘and.’
"""
input UUIDFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: UUID

  """Not equal to the specified value."""
  notEqualTo: UUID

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: UUID

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: UUID

  """Included in the specified list."""
  in: [UUID!]

  """Not included in the specified list."""
  notIn: [UUID!]

  """Less than the specified value."""
  lessThan: UUID

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: UUID

  """Greater than the specified value."""
  greaterThan: UUID

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: UUID
}

"""
A filter to be used against String fields. All fields are combined with a logical ‘and.’
"""
input StringFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: String

  """Not equal to the specified value."""
  notEqualTo: String

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: String

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: String

  """Included in the specified list."""
  in: [String!]

  """Not included in the specified list."""
  notIn: [String!]

  """Less than the specified value."""
  lessThan: String

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: String

  """Greater than the specified value."""
  greaterThan: String

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: String

  """Contains the specified string (case-sensitive)."""
  includes: String

  """Does not contain the specified string (case-sensitive)."""
  notIncludes: String

  """Contains the specified string (case-insensitive)."""
  includesInsensitive: String

  """Does not contain the specified string (case-insensitive)."""
  notIncludesInsensitive: String

  """Starts with the specified string (case-sensitive)."""
  startsWith: String

  """Does not start with the specified string (case-sensitive)."""
  notStartsWith: String

  """Starts with the specified string (case-insensitive)."""
  startsWithInsensitive: String

  """Does not start with the specified string (case-insensitive)."""
  notStartsWithInsensitive: String

  """Ends with the specified string (case-sensitive)."""
  endsWith: String

  """Does not end with the specified string (case-sensitive)."""
  notEndsWith: String

  """Ends with the specified string (case-insensitive)."""
  endsWithInsensitive: String

  """Does not end with the specified string (case-insensitive)."""
  notEndsWithInsensitive: String

  """
  Matches the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.
  """
  like: String

  """
  Does not match the specified pattern (case-sensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.
  """
  notLike: String

  """
  Matches the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.
  """
  likeInsensitive: String

  """
  Does not match the specified pattern (case-insensitive). An underscore (_) matches any single character; a percent sign (%) matches any sequence of zero or more characters.
  """
  notLikeInsensitive: String

  """Equal to the specified value (case-insensitive)."""
  equalToInsensitive: String

  """Not equal to the specified value (case-insensitive)."""
  notEqualToInsensitive: String

  """
  Not equal to the specified value, treating null like an ordinary value (case-insensitive).
  """
  distinctFromInsensitive: String

  """
  Equal to the specified value, treating null like an ordinary value (case-insensitive).
  """
  notDistinctFromInsensitive: String

  """Included in the specified list (case-insensitive)."""
  inInsensitive: [String!]

  """Not included in the specified list (case-insensitive)."""
  notInInsensitive: [String!]

  """Less than the specified value (case-insensitive)."""
  lessThanInsensitive: String

  """Less than or equal to the specified value (case-insensitive)."""
  lessThanOrEqualToInsensitive: String

  """Greater than the specified value (case-insensitive)."""
  greaterThanInsensitive: String

  """Greater than or equal to the specified value (case-insensitive)."""
  greaterThanOrEqualToInsensitive: String
}

"""
A filter to be used against many \`ApiKeyProvider\` object types. All fields are combined with a logical ‘and.’
"""
input ApiKeyToManyApiKeyProviderFilter {
  """
  Every related \`ApiKeyProvider\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: ApiKeyProviderFilter

  """
  Some related \`ApiKeyProvider\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: ApiKeyProviderFilter

  """
  No related \`ApiKeyProvider\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: ApiKeyProviderFilter
}

"""
A filter to be used against \`ApiKeyProvider\` object types. All fields are combined with a logical ‘and.’
"""
input ApiKeyProviderFilter {
  """Filter by the object’s \`apiKeyId\` field."""
  apiKeyId: UUIDFilter

  """Filter by the object’s \`providerKeyId\` field."""
  providerKeyId: UUIDFilter

  """Filter by the object’s \`apiKey\` relation."""
  apiKey: ApiKeyFilter

  """Filter by the object’s \`providerKey\` relation."""
  providerKey: ProviderKeyFilter

  """Checks for all expressions in this list."""
  and: [ApiKeyProviderFilter!]

  """Checks for any expressions in this list."""
  or: [ApiKeyProviderFilter!]

  """Negates the expression."""
  not: ApiKeyProviderFilter
}

"""
A filter to be used against \`ProviderKey\` object types. All fields are combined with a logical ‘and.’
"""
input ProviderKeyFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`userId\` field."""
  userId: UUIDFilter

  """Filter by the object’s \`provider\` field."""
  provider: StringFilter

  """Filter by the object’s \`apiKeyProviders\` relation."""
  apiKeyProviders: ProviderKeyToManyApiKeyProviderFilter

  """Some related \`apiKeyProviders\` exist."""
  apiKeyProvidersExist: Boolean

  """Filter by the object’s \`user\` relation."""
  user: UserFilter

  """Checks for all expressions in this list."""
  and: [ProviderKeyFilter!]

  """Checks for any expressions in this list."""
  or: [ProviderKeyFilter!]

  """Negates the expression."""
  not: ProviderKeyFilter
}

"""
A filter to be used against many \`ApiKeyProvider\` object types. All fields are combined with a logical ‘and.’
"""
input ProviderKeyToManyApiKeyProviderFilter {
  """
  Every related \`ApiKeyProvider\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: ApiKeyProviderFilter

  """
  Some related \`ApiKeyProvider\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: ApiKeyProviderFilter

  """
  No related \`ApiKeyProvider\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: ApiKeyProviderFilter
}

"""
A filter to be used against \`User\` object types. All fields are combined with a logical ‘and.’
"""
input UserFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`identityProviderId\` field."""
  identityProviderId: UUIDFilter

  """Filter by the object’s \`apiKeys\` relation."""
  apiKeys: UserToManyApiKeyFilter

  """Some related \`apiKeys\` exist."""
  apiKeysExist: Boolean

  """Filter by the object’s \`providerKeys\` relation."""
  providerKeys: UserToManyProviderKeyFilter

  """Some related \`providerKeys\` exist."""
  providerKeysExist: Boolean

  """Filter by the object’s \`usageEvents\` relation."""
  usageEvents: UserToManyUsageEventFilter

  """Some related \`usageEvents\` exist."""
  usageEventsExist: Boolean

  """Filter by the object’s \`userPreference\` relation."""
  userPreference: UserPreferenceFilter

  """A related \`userPreference\` exists."""
  userPreferenceExists: Boolean

  """Checks for all expressions in this list."""
  and: [UserFilter!]

  """Checks for any expressions in this list."""
  or: [UserFilter!]

  """Negates the expression."""
  not: UserFilter
}

"""
A filter to be used against many \`ApiKey\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyApiKeyFilter {
  """
  Every related \`ApiKey\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: ApiKeyFilter

  """
  Some related \`ApiKey\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: ApiKeyFilter

  """
  No related \`ApiKey\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: ApiKeyFilter
}

"""
A filter to be used against many \`ProviderKey\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyProviderKeyFilter {
  """
  Every related \`ProviderKey\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: ProviderKeyFilter

  """
  Some related \`ProviderKey\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: ProviderKeyFilter

  """
  No related \`ProviderKey\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: ProviderKeyFilter
}

"""
A filter to be used against many \`UsageEvent\` object types. All fields are combined with a logical ‘and.’
"""
input UserToManyUsageEventFilter {
  """
  Every related \`UsageEvent\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: UsageEventFilter

  """
  Some related \`UsageEvent\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: UsageEventFilter

  """
  No related \`UsageEvent\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: UsageEventFilter
}

"""
A filter to be used against \`UsageEvent\` object types. All fields are combined with a logical ‘and.’
"""
input UsageEventFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`userId\` field."""
  userId: UUIDFilter

  """Filter by the object’s \`apiKeyId\` field."""
  apiKeyId: UUIDFilter

  """Filter by the object’s \`createdAt\` field."""
  createdAt: DatetimeFilter

  """Filter by the object’s \`apiKey\` relation."""
  apiKey: ApiKeyFilter

  """Filter by the object’s \`user\` relation."""
  user: UserFilter

  """Checks for all expressions in this list."""
  and: [UsageEventFilter!]

  """Checks for any expressions in this list."""
  or: [UsageEventFilter!]

  """Negates the expression."""
  not: UsageEventFilter
}

"""
A filter to be used against Datetime fields. All fields are combined with a logical ‘and.’
"""
input DatetimeFilter {
  """
  Is null (if \`true\` is specified) or is not null (if \`false\` is specified).
  """
  isNull: Boolean

  """Equal to the specified value."""
  equalTo: Datetime

  """Not equal to the specified value."""
  notEqualTo: Datetime

  """
  Not equal to the specified value, treating null like an ordinary value.
  """
  distinctFrom: Datetime

  """Equal to the specified value, treating null like an ordinary value."""
  notDistinctFrom: Datetime

  """Included in the specified list."""
  in: [Datetime!]

  """Not included in the specified list."""
  notIn: [Datetime!]

  """Less than the specified value."""
  lessThan: Datetime

  """Less than or equal to the specified value."""
  lessThanOrEqualTo: Datetime

  """Greater than the specified value."""
  greaterThan: Datetime

  """Greater than or equal to the specified value."""
  greaterThanOrEqualTo: Datetime
}

"""
A filter to be used against \`UserPreference\` object types. All fields are combined with a logical ‘and.’
"""
input UserPreferenceFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`userId\` field."""
  userId: UUIDFilter

  """Filter by the object’s \`user\` relation."""
  user: UserFilter

  """Checks for all expressions in this list."""
  and: [UserPreferenceFilter!]

  """Checks for any expressions in this list."""
  or: [UserPreferenceFilter!]

  """Negates the expression."""
  not: UserPreferenceFilter
}

"""
A filter to be used against many \`UsageEvent\` object types. All fields are combined with a logical ‘and.’
"""
input ApiKeyToManyUsageEventFilter {
  """
  Every related \`UsageEvent\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  every: UsageEventFilter

  """
  Some related \`UsageEvent\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  some: UsageEventFilter

  """
  No related \`UsageEvent\` matches the filter criteria. All fields are combined with a logical ‘and.’
  """
  none: UsageEventFilter
}

"""Methods to use when ordering \`ApiKey\`."""
enum ApiKeyOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  USER_ID_ASC
  USER_ID_DESC
  KEY_HASH_ASC
  KEY_HASH_DESC
}

"""A connection to a list of \`ProviderKey\` values."""
type ProviderKeyConnection {
  """A list of \`ProviderKey\` objects."""
  nodes: [ProviderKey]!

  """
  A list of edges which contains the \`ProviderKey\` and cursor to aid in pagination.
  """
  edges: [ProviderKeyEdge]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`ProviderKey\` you could get from the connection."""
  totalCount: Int!
}

type ProviderKey implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  userId: UUID!
  provider: String!
  encryptedKey: String!
  keyHint: String!
  modelPreference: String
  createdAt: Datetime
  updatedAt: Datetime

  """Reads a single \`User\` that is related to this \`ProviderKey\`."""
  user: User

  """Reads and enables pagination through a set of \`ApiKeyProvider\`."""
  apiKeyProviders(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ApiKeyProviderCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ApiKeyProviderFilter

    """The method to use when ordering \`ApiKeyProvider\`."""
    orderBy: [ApiKeyProviderOrderBy!] = [PRIMARY_KEY_ASC]
  ): ApiKeyProviderConnection!
}

"""A connection to a list of \`ApiKeyProvider\` values."""
type ApiKeyProviderConnection {
  """A list of \`ApiKeyProvider\` objects."""
  nodes: [ApiKeyProvider]!

  """
  A list of edges which contains the \`ApiKeyProvider\` and cursor to aid in pagination.
  """
  edges: [ApiKeyProviderEdge]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`ApiKeyProvider\` you could get from the connection."""
  totalCount: Int!
}

"""A \`ApiKeyProvider\` edge in the connection."""
type ApiKeyProviderEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`ApiKeyProvider\` at the end of the edge."""
  node: ApiKeyProvider
}

"""
A condition to be used against \`ApiKeyProvider\` object types. All fields are
tested for equality and combined with a logical ‘and.’
"""
input ApiKeyProviderCondition {
  """Checks for equality with the object’s \`apiKeyId\` field."""
  apiKeyId: UUID

  """Checks for equality with the object’s \`providerKeyId\` field."""
  providerKeyId: UUID
}

"""Methods to use when ordering \`ApiKeyProvider\`."""
enum ApiKeyProviderOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  API_KEY_ID_ASC
  API_KEY_ID_DESC
  PROVIDER_KEY_ID_ASC
  PROVIDER_KEY_ID_DESC
}

"""A \`ProviderKey\` edge in the connection."""
type ProviderKeyEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`ProviderKey\` at the end of the edge."""
  node: ProviderKey
}

"""
A condition to be used against \`ProviderKey\` object types. All fields are tested
for equality and combined with a logical ‘and.’
"""
input ProviderKeyCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`userId\` field."""
  userId: UUID

  """Checks for equality with the object’s \`provider\` field."""
  provider: String
}

"""Methods to use when ordering \`ProviderKey\`."""
enum ProviderKeyOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  USER_ID_ASC
  USER_ID_DESC
  PROVIDER_ASC
  PROVIDER_DESC
}

"""A connection to a list of \`UsageEvent\` values."""
type UsageEventConnection {
  """A list of \`UsageEvent\` objects."""
  nodes: [UsageEvent]!

  """
  A list of edges which contains the \`UsageEvent\` and cursor to aid in pagination.
  """
  edges: [UsageEventEdge]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`UsageEvent\` you could get from the connection."""
  totalCount: Int!
}

type UsageEvent implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  userId: UUID!
  workspaceId: UUID
  apiKeyId: UUID!
  provider: String!
  model: String!
  inputTokens: Int!
  outputTokens: Int!
  costCents: Int!
  mode: String!
  createdAt: Datetime

  """Reads a single \`ApiKey\` that is related to this \`UsageEvent\`."""
  apiKey: ApiKey

  """Reads a single \`User\` that is related to this \`UsageEvent\`."""
  user: User
}

"""A \`UsageEvent\` edge in the connection."""
type UsageEventEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`UsageEvent\` at the end of the edge."""
  node: UsageEvent
}

"""
A condition to be used against \`UsageEvent\` object types. All fields are tested
for equality and combined with a logical ‘and.’
"""
input UsageEventCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`userId\` field."""
  userId: UUID

  """Checks for equality with the object’s \`apiKeyId\` field."""
  apiKeyId: UUID

  """Checks for equality with the object’s \`createdAt\` field."""
  createdAt: Datetime
}

"""Methods to use when ordering \`UsageEvent\`."""
enum UsageEventOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  USER_ID_ASC
  USER_ID_DESC
  API_KEY_ID_ASC
  API_KEY_ID_DESC
  CREATED_AT_ASC
  CREATED_AT_DESC
}

type UserPreference implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  userId: UUID!
  defaultProvider: String
  notifyUsageThreshold: Boolean!
  notifyKeyExpiry: Boolean!
  updatedAt: Datetime

  """Reads a single \`User\` that is related to this \`UserPreference\`."""
  user: User
}

type Workspace implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  organizationId: UUID!
  slug: String!
  name: String!
  description: String
  createdAt: Datetime
  updatedAt: Datetime
}

"""A connection to a list of \`Workspace\` values."""
type WorkspaceConnection {
  """A list of \`Workspace\` objects."""
  nodes: [Workspace]!

  """
  A list of edges which contains the \`Workspace\` and cursor to aid in pagination.
  """
  edges: [WorkspaceEdge]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`Workspace\` you could get from the connection."""
  totalCount: Int!
}

"""A \`Workspace\` edge in the connection."""
type WorkspaceEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`Workspace\` at the end of the edge."""
  node: Workspace
}

"""
A condition to be used against \`Workspace\` object types. All fields are tested
for equality and combined with a logical ‘and.’
"""
input WorkspaceCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`organizationId\` field."""
  organizationId: UUID

  """Checks for equality with the object’s \`slug\` field."""
  slug: String
}

"""
A filter to be used against \`Workspace\` object types. All fields are combined with a logical ‘and.’
"""
input WorkspaceFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`organizationId\` field."""
  organizationId: UUIDFilter

  """Filter by the object’s \`slug\` field."""
  slug: StringFilter

  """Checks for all expressions in this list."""
  and: [WorkspaceFilter!]

  """Checks for any expressions in this list."""
  or: [WorkspaceFilter!]

  """Negates the expression."""
  not: WorkspaceFilter
}

"""Methods to use when ordering \`Workspace\`."""
enum WorkspaceOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  ORGANIZATION_ID_ASC
  ORGANIZATION_ID_DESC
  SLUG_ASC
  SLUG_DESC
}

"""A connection to a list of \`UserPreference\` values."""
type UserPreferenceConnection {
  """A list of \`UserPreference\` objects."""
  nodes: [UserPreference]!

  """
  A list of edges which contains the \`UserPreference\` and cursor to aid in pagination.
  """
  edges: [UserPreferenceEdge]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`UserPreference\` you could get from the connection."""
  totalCount: Int!
}

"""A \`UserPreference\` edge in the connection."""
type UserPreferenceEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`UserPreference\` at the end of the edge."""
  node: UserPreference
}

"""
A condition to be used against \`UserPreference\` object types. All fields are
tested for equality and combined with a logical ‘and.’
"""
input UserPreferenceCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`userId\` field."""
  userId: UUID
}

"""Methods to use when ordering \`UserPreference\`."""
enum UserPreferenceOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  USER_ID_ASC
  USER_ID_DESC
}

"""A connection to a list of \`User\` values."""
type UserConnection {
  """A list of \`User\` objects."""
  nodes: [User]!

  """
  A list of edges which contains the \`User\` and cursor to aid in pagination.
  """
  edges: [UserEdge]!

  """Information to aid in pagination."""
  pageInfo: PageInfo!

  """The count of *all* \`User\` you could get from the connection."""
  totalCount: Int!
}

"""A \`User\` edge in the connection."""
type UserEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`User\` at the end of the edge."""
  node: User
}

"""
A condition to be used against \`User\` object types. All fields are tested for equality and combined with a logical ‘and.’
"""
input UserCondition {
  """Checks for equality with the object’s \`rowId\` field."""
  rowId: UUID

  """Checks for equality with the object’s \`identityProviderId\` field."""
  identityProviderId: UUID
}

"""Methods to use when ordering \`User\`."""
enum UserOrderBy {
  NATURAL
  PRIMARY_KEY_ASC
  PRIMARY_KEY_DESC
  ROW_ID_ASC
  ROW_ID_DESC
  IDENTITY_PROVIDER_ID_ASC
  IDENTITY_PROVIDER_ID_DESC
}

type Observer {
  id: UUID!
  name: String!
  email: String!

  """
  List active API keys for the current user, optionally filtered by workspace.
  """
  apiKeys(workspaceId: UUID): [ApiKeyInfo!]!

  """Fetch current user's preferences."""
  preferences: UserPreferences

  """List provider keys for the current user."""
  providerKeys: [ProviderKeyInfo!]!
}

input GenerateApiKeyInput {
  name: String!
  mode: String!
  workspaceId: UUID
}

type GenerateApiKeyPayload {
  rawKey: String!
  apiKeyId: UUID!
  keyHint: String!
}

type LinkedProviderInfo {
  id: UUID!
  provider: String!
  keyHint: String!
}

type ApiKeyInfo {
  id: UUID!
  name: String!
  keyHint: String!
  mode: String!
  createdAt: Datetime!
  lastUsedAt: Datetime
  expiresAt: Datetime
  revokedAt: Datetime
  linkedProviders: [LinkedProviderInfo!]!
}

input UpdateUserPreferencesInput {
  defaultProvider: String
  notifyUsageThreshold: Boolean
  notifyKeyExpiry: Boolean
}

type UserPreferences {
  defaultProvider: String
  notifyUsageThreshold: Boolean!
  notifyKeyExpiry: Boolean!
}

input SetProviderKeyInput {
  provider: String!
  key: String!
}

type ProviderKeyInfo {
  id: UUID!
  userId: UUID!
  provider: String!
  keyHint: String!
  createdAt: Datetime
  updatedAt: Datetime
  modelPreference: String
}

type ModelBreakdown {
  model: String!
  provider: String!
  inputTokens: Int!
  outputTokens: Int!
  requests: Int!
}

type DailyUsage {
  date: String!
  inputTokens: Int!
  outputTokens: Int!
  requests: Int!
}

type UsageBreakdown {
  byModel: [ModelBreakdown!]!
  byDay: [DailyUsage!]!
}

"""The root query type which gives access points into the data universe."""
type Query implements Node {
  """
  Exposes the root query type nested one level down. This is helpful for Relay 1
  which can only query top level fields if they are in a particular form.
  """
  query: Query!

  """
  The root query type must be a \`Node\` to work well with Relay 1 mutations. This just resolves to \`query\`.
  """
  id: ID!

  """Fetches an object given its globally unique \`ID\`."""
  node(
    """The globally unique \`ID\`."""
    id: ID!
  ): Node

  """Get a single \`ApiKeyProvider\`."""
  apiKeyProvider(apiKeyId: UUID!, providerKeyId: UUID!): ApiKeyProvider

  """Get a single \`Workspace\`."""
  workspace(rowId: UUID!): Workspace

  """Get a single \`UserPreference\`."""
  userPreference(rowId: UUID!): UserPreference

  """Get a single \`UserPreference\`."""
  userPreferenceByUserId(userId: UUID!): UserPreference

  """Get a single \`ProviderKey\`."""
  providerKey(rowId: UUID!): ProviderKey

  """Get a single \`User\`."""
  user(rowId: UUID!): User

  """Get a single \`User\`."""
  userByIdentityProviderId(identityProviderId: UUID!): User

  """Get a single \`ApiKey\`."""
  apiKey(rowId: UUID!): ApiKey

  """Get a single \`ApiKey\`."""
  apiKeyByKeyHash(keyHash: String!): ApiKey

  """Get a single \`UsageEvent\`."""
  usageEvent(rowId: UUID!): UsageEvent

  """Reads a single \`ApiKeyProvider\` using its globally unique \`ID\`."""
  apiKeyProviderById(
    """
    The globally unique \`ID\` to be used in selecting a single \`ApiKeyProvider\`.
    """
    id: ID!
  ): ApiKeyProvider

  """Reads a single \`Workspace\` using its globally unique \`ID\`."""
  workspaceById(
    """The globally unique \`ID\` to be used in selecting a single \`Workspace\`."""
    id: ID!
  ): Workspace

  """Reads a single \`UserPreference\` using its globally unique \`ID\`."""
  userPreferenceById(
    """
    The globally unique \`ID\` to be used in selecting a single \`UserPreference\`.
    """
    id: ID!
  ): UserPreference

  """Reads a single \`ProviderKey\` using its globally unique \`ID\`."""
  providerKeyById(
    """
    The globally unique \`ID\` to be used in selecting a single \`ProviderKey\`.
    """
    id: ID!
  ): ProviderKey

  """Reads a single \`User\` using its globally unique \`ID\`."""
  userById(
    """The globally unique \`ID\` to be used in selecting a single \`User\`."""
    id: ID!
  ): User

  """Reads a single \`ApiKey\` using its globally unique \`ID\`."""
  apiKeyById(
    """The globally unique \`ID\` to be used in selecting a single \`ApiKey\`."""
    id: ID!
  ): ApiKey

  """Reads a single \`UsageEvent\` using its globally unique \`ID\`."""
  usageEventById(
    """
    The globally unique \`ID\` to be used in selecting a single \`UsageEvent\`.
    """
    id: ID!
  ): UsageEvent

  """Reads and enables pagination through a set of \`ApiKeyProvider\`."""
  apiKeyProviders(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ApiKeyProviderCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ApiKeyProviderFilter

    """The method to use when ordering \`ApiKeyProvider\`."""
    orderBy: [ApiKeyProviderOrderBy!] = [PRIMARY_KEY_ASC]
  ): ApiKeyProviderConnection

  """Reads and enables pagination through a set of \`Workspace\`."""
  workspaces(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: WorkspaceCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: WorkspaceFilter

    """The method to use when ordering \`Workspace\`."""
    orderBy: [WorkspaceOrderBy!] = [PRIMARY_KEY_ASC]
  ): WorkspaceConnection

  """Reads and enables pagination through a set of \`UserPreference\`."""
  userPreferences(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: UserPreferenceCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: UserPreferenceFilter

    """The method to use when ordering \`UserPreference\`."""
    orderBy: [UserPreferenceOrderBy!] = [PRIMARY_KEY_ASC]
  ): UserPreferenceConnection

  """Reads and enables pagination through a set of \`ProviderKey\`."""
  providerKeys(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ProviderKeyCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ProviderKeyFilter

    """The method to use when ordering \`ProviderKey\`."""
    orderBy: [ProviderKeyOrderBy!] = [PRIMARY_KEY_ASC]
  ): ProviderKeyConnection

  """Reads and enables pagination through a set of \`User\`."""
  users(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: UserCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: UserFilter

    """The method to use when ordering \`User\`."""
    orderBy: [UserOrderBy!] = [PRIMARY_KEY_ASC]
  ): UserConnection

  """Reads and enables pagination through a set of \`ApiKey\`."""
  apiKeys(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: ApiKeyCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: ApiKeyFilter

    """The method to use when ordering \`ApiKey\`."""
    orderBy: [ApiKeyOrderBy!] = [PRIMARY_KEY_ASC]
  ): ApiKeyConnection

  """Reads and enables pagination through a set of \`UsageEvent\`."""
  usageEvents(
    """Only read the first \`n\` values of the set."""
    first: Int

    """Only read the last \`n\` values of the set."""
    last: Int

    """
    Skip the first \`n\` values from our \`after\` cursor, an alternative to cursor
    based pagination. May not be used with \`last\`.
    """
    offset: Int

    """Read all values in the set before (above) this cursor."""
    before: Cursor

    """Read all values in the set after (below) this cursor."""
    after: Cursor

    """
    A condition to be used in determining which values should be returned by the collection.
    """
    condition: UsageEventCondition

    """
    A filter to be used in determining which values should be returned by the collection.
    """
    filter: UsageEventFilter

    """The method to use when ordering \`UsageEvent\`."""
    orderBy: [UsageEventOrderBy!] = [PRIMARY_KEY_ASC]
  ): UsageEventConnection

  """The currently authenticated user. Returns null if not authenticated."""
  observer: Observer

  """
  Aggregated usage breakdown by model and day for charts.
  Optionally filter by workspaceId for workspace-scoped usage.
  """
  usageBreakdown(startDate: String!, endDate: String!, workspaceId: String): UsageBreakdown

  """List workspaces for an organization"""
  orgWorkspaces(organizationId: UUID!): [WorkspaceResult!]!
}

"""
The root mutation type which contains root level fields which mutate data.
"""
type Mutation {
  """Generate a new API key. The raw key is returned once and never stored."""
  generateApiKey(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: GenerateApiKeyInput!
  ): GenerateApiKeyPayload

  """Revoke an API key by setting its revokedAt timestamp."""
  revokeApiKey(id: UUID!): Boolean

  """Link a provider key to an API key so requests use that provider."""
  linkProviderKey(apiKeyId: UUID!, providerKeyId: UUID!): Boolean

  """Unlink a provider key from an API key."""
  unlinkProviderKey(apiKeyId: UUID!, providerKeyId: UUID!): Boolean

  """Update user preferences. Creates preferences row if it doesn't exist."""
  updateUserPreferences(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateUserPreferencesInput!
  ): UserPreferences

  """Encrypt and upsert a BYOK provider key."""
  setProviderKey(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: SetProviderKeyInput!
  ): ProviderKeyInfo

  """Delete a provider key. Verifies ownership before deletion."""
  removeProviderKey(id: UUID!): Boolean

  """Create a new workspace within an organization"""
  addWorkspace(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: NewWorkspaceInput!
  ): WorkspaceResult

  """Update a workspace's details"""
  patchWorkspace(
    id: UUID!

    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: PatchWorkspaceInput!
  ): WorkspaceResult

  """Delete a workspace"""
  removeWorkspace(id: UUID!): Boolean
}

input NewWorkspaceInput {
  organizationId: UUID!
  name: String!
  slug: String!
  description: String
}

input PatchWorkspaceInput {
  name: String
  slug: String
  description: String
}

type WorkspaceResult {
  id: UUID!
  organizationId: UUID!
  name: String!
  slug: String!
  description: String
  createdAt: Datetime!
}`;
export const objects = {
  Query: {
    assertStep() {
      return !0;
    },
    plans: {
      apiKey(_$root, {
        $rowId
      }) {
        return spec_resource_api_keyPgResource.get({
          id: $rowId
        });
      },
      apiKeyById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_ApiKey($nodeId);
      },
      apiKeyByKeyHash(_$root, {
        $keyHash
      }) {
        return spec_resource_api_keyPgResource.get({
          key_hash: $keyHash
        });
      },
      apiKeyProvider(_$root, {
        $apiKeyId,
        $providerKeyId
      }) {
        return spec_resource_api_key_providerPgResource.get({
          api_key_id: $apiKeyId,
          provider_key_id: $providerKeyId
        });
      },
      apiKeyProviderById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_ApiKeyProvider($nodeId);
      },
      apiKeyProviders: {
        plan() {
          return connection(spec_resource_api_key_providerPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      apiKeys: {
        plan() {
          return connection(spec_resource_api_keyPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      id($parent) {
        const specifier = nodeIdHandlerByTypeName.Query.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandlerByTypeName.Query.codec.name].encode);
      },
      node(_$root, fieldArgs) {
        return fieldArgs.getRaw("id");
      },
      observer: {
        resolve(_source, _args, ctx) {
          if (!ctx.observer) return null;
          return {
            id: ctx.observer.id,
            name: ctx.observer.name,
            email: ctx.observer.email
          };
        },
        subscribe: undefined
      },
      orgWorkspaces: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          await assertOrgMembership(observer.identityProviderId, args.organizationId);
          await assertOrgPermission(observer.id, args.organizationId, "viewer");
          return db.select().from(workspaceTable).where(eq(workspaceTable.organizationId, args.organizationId));
        },
        subscribe: undefined
      },
      providerKey(_$root, {
        $rowId
      }) {
        return spec_resource_provider_keyPgResource.get({
          id: $rowId
        });
      },
      providerKeyById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_ProviderKey($nodeId);
      },
      providerKeys: {
        plan() {
          return connection(spec_resource_provider_keyPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      query() {
        return rootValue();
      },
      usageBreakdown: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const startDate = new Date(args.startDate),
            endDate = new Date(args.endDate);
          if (Number.isNaN(startDate.getTime())) throw new GraphQLError("Invalid startDate", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          if (Number.isNaN(endDate.getTime())) throw new GraphQLError("Invalid endDate", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          if (startDate > endDate) throw new GraphQLError("startDate must not be after endDate", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          const maxRangeMs = 31622400000;
          if (endDate.getTime() - startDate.getTime() > maxRangeMs) throw new GraphQLError("Date range must not exceed 366 days", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          const retentionEntity = args.workspaceId ? "organization" : "user",
            retentionEntityId = retentionEntity === "user" ? observer.identityProviderId ?? observer.id : null,
            retentionEntitlements = retentionEntity === "user" && retentionEntityId ? await billing.getEntitlements(retentionEntity, retentionEntityId, "synapse").catch(() => null) : null,
            tier = observer.plan ?? "free",
            retentionDays = resolveRetentionDays(retentionEntitlements, tier),
            earliestAllowed = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
          if (startDate < earliestAllowed) throw new GraphQLError(`Your plan allows ${retentionDays} days of analytics history. Upgrade for longer retention`, {
            extensions: {
              code: "QUOTA_EXCEEDED"
            }
          });
          const conditions = [eq(usageEventTable.userId, observer.id), gte(usageEventTable.createdAt, args.startDate), lte(usageEventTable.createdAt, args.endDate)];
          if (args.workspaceId) {
            const [workspace] = await db.select({
              organizationId: workspaceTable.organizationId
            }).from(workspaceTable).where(eq(workspaceTable.id, args.workspaceId));
            if (!workspace) throw new GraphQLError("Workspace not found", {
              extensions: {
                code: "NOT_FOUND"
              }
            });
            conditions.push(eq(usageEventTable.workspaceId, args.workspaceId));
          }
          const dateFilter = and(...conditions),
            byModel = await db.select({
              model: usageEventTable.model,
              provider: usageEventTable.provider,
              inputTokens: sql2`sum(${usageEventTable.inputTokens})::int`,
              outputTokens: sql2`sum(${usageEventTable.outputTokens})::int`,
              requests: sql2`count(*)::int`
            }).from(usageEventTable).where(dateFilter).groupBy(usageEventTable.model, usageEventTable.provider),
            byDay = await db.select({
              date: sql2`date_trunc('day', ${usageEventTable.createdAt})::date::text`,
              inputTokens: sql2`sum(${usageEventTable.inputTokens})::int`,
              outputTokens: sql2`sum(${usageEventTable.outputTokens})::int`,
              requests: sql2`count(*)::int`
            }).from(usageEventTable).where(dateFilter).groupBy(sql2`date_trunc('day', ${usageEventTable.createdAt})`).orderBy(sql2`date_trunc('day', ${usageEventTable.createdAt})`);
          return {
            byModel,
            byDay
          };
        },
        subscribe: undefined
      },
      usageEvent(_$root, {
        $rowId
      }) {
        return spec_resource_usage_eventPgResource.get({
          id: $rowId
        });
      },
      usageEventById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_UsageEvent($nodeId);
      },
      usageEvents: {
        plan() {
          return connection(spec_resource_usage_eventPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      user(_$root, {
        $rowId
      }) {
        return spec_resource_userPgResource.get({
          id: $rowId
        });
      },
      userById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_User($nodeId);
      },
      userByIdentityProviderId(_$root, {
        $identityProviderId
      }) {
        return spec_resource_userPgResource.get({
          identity_provider_id: $identityProviderId
        });
      },
      userPreference(_$root, {
        $rowId
      }) {
        return spec_resource_user_preferencePgResource.get({
          id: $rowId
        });
      },
      userPreferenceById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_UserPreference($nodeId);
      },
      userPreferenceByUserId(_$root, {
        $userId
      }) {
        return spec_resource_user_preferencePgResource.get({
          user_id: $userId
        });
      },
      userPreferences: {
        plan() {
          return connection(spec_resource_user_preferencePgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      users: {
        plan() {
          return connection(spec_resource_userPgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      workspace(_$root, {
        $rowId
      }) {
        return spec_resource_workspacePgResource.get({
          id: $rowId
        });
      },
      workspaceById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_Workspace($nodeId);
      },
      workspaces: {
        plan() {
          return connection(spec_resource_workspacePgResource.find());
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      }
    }
  },
  Mutation: {
    assertStep: __ValueStep,
    plans: {
      addWorkspace: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const {
            organizationId,
            name,
            slug,
            description
          } = args.input;
          if (name.length > 100) throw new GraphQLError("Name must be 100 characters or fewer", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          if (slug.length > 63) throw new GraphQLError("Slug must be 63 characters or fewer", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) throw new GraphQLError("Slug must contain only lowercase letters, numbers, and hyphens, and must start and end with a letter or number", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          if (description && description.length > 500) throw new GraphQLError("Description must be 500 characters or fewer", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          await assertOrgMembership(observer.identityProviderId, organizationId);
          await assertOrgPermission(observer.id, organizationId, "editor");
          const entitlements = await billing.getEntitlements("organization", organizationId, "synapse").catch(() => null),
            workspace = await db.transaction(async tx => {
              const existingWorkspaces = await tx.select({
                id: workspaceTable.id
              }).from(workspaceTable).where(eq(workspaceTable.organizationId, organizationId));
              if (!isWithinLimit(entitlements, "max_workspaces", existingWorkspaces.length, DEFAULT_LIMITS3)) throw new GraphQLError("Workspace limit reached. Upgrade your plan for more workspaces", {
                extensions: {
                  code: "QUOTA_EXCEEDED"
                }
              });
              const [inserted] = await tx.insert(workspaceTable).values({
                organizationId,
                name,
                slug,
                description: description ?? null
              }).returning();
              return inserted;
            });
          publish({
            type: "synapse.workspace.created",
            source: "omni.synapse",
            organizationId,
            subject: workspace.id,
            data: {
              workspaceId: workspace.id,
              name,
              slug,
              organizationId
            }
          });
          events.emit({
            type: "synapse.workspace.created",
            data: {
              workspaceId: workspace.id,
              name,
              slug,
              organizationId
            },
            organizationId,
            subject: workspace.id
          });
          logAuditEvent({
            organizationId,
            userId: observer.id,
            userIdpId: observer.identityProviderId,
            workspaceId: workspace.id
          }, {
            action: "workspace.created",
            resource: "workspace",
            resourceId: workspace.id,
            details: {
              name,
              slug
            }
          });
          return workspace;
        },
        subscribe: undefined
      },
      generateApiKey: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const {
            name,
            mode,
            workspaceId
          } = args.input;
          if (name.length > 100) throw new GraphQLError("Name must be 100 characters or fewer", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          if (workspaceId) {
            const [workspace] = await db.select({
              organizationId: workspaceTable.organizationId
            }).from(workspaceTable).where(eq(workspaceTable.id, workspaceId));
            if (!workspace) throw new GraphQLError("Workspace not found", {
              extensions: {
                code: "NOT_FOUND"
              }
            });
            await assertOrgPermission(observer.id, workspace.organizationId, "editor");
          }
          if (mode !== "byok") throw new GraphQLError('Invalid key mode. Only "byok" is allowed', {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          const entitlements = await billing.getEntitlements("user", observer.identityProviderId ?? observer.id, "synapse").catch(() => null),
            {
              raw,
              hash,
              hint
            } = generateApiKey(),
            apiKey = await db.transaction(async tx => {
              const activeKeys = await tx.select({
                id: apiKeyTable.id
              }).from(apiKeyTable).where(and(eq(apiKeyTable.userId, observer.id), isNull(apiKeyTable.revokedAt), ne(apiKeyTable.mode, "managed")));
              if (!isWithinLimit(entitlements, "max_api_keys", activeKeys.length, DEFAULT_LIMITS)) throw new GraphQLError("API key limit reached. Upgrade your plan for more keys", {
                extensions: {
                  code: "QUOTA_EXCEEDED"
                }
              });
              const [inserted] = await tx.insert(apiKeyTable).values({
                userId: observer.id,
                name,
                mode,
                workspaceId: workspaceId ?? null,
                keyHash: hash,
                keyHint: hint
              }).returning();
              return inserted;
            });
          publish({
            type: "synapse.api_key.created",
            source: "omni.synapse",
            organizationId: observer.id,
            subject: observer.id,
            data: {
              apiKeyId: apiKey.id,
              name,
              mode,
              workspaceId: workspaceId ?? null
            }
          });
          logAuditEvent({
            userId: observer.id,
            userIdpId: observer.identityProviderId,
            workspaceId: workspaceId ?? void 0
          }, {
            action: "api_key.created",
            resource: "api_key",
            resourceId: apiKey.id,
            details: {
              name,
              mode,
              workspaceId: workspaceId ?? null
            }
          });
          return {
            rawKey: raw,
            apiKeyId: apiKey.id,
            keyHint: hint
          };
        },
        subscribe: undefined
      },
      linkProviderKey: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const [apiKey] = await db.select({
            id: apiKeyTable.id,
            workspaceId: apiKeyTable.workspaceId
          }).from(apiKeyTable).where(and(eq(apiKeyTable.id, args.apiKeyId), eq(apiKeyTable.userId, observer.id), isNull(apiKeyTable.revokedAt)));
          if (!apiKey) throw new GraphQLError("API key not found", {
            extensions: {
              code: "NOT_FOUND"
            }
          });
          if (apiKey.workspaceId) {
            const [workspace] = await db.select({
              organizationId: workspaceTable.organizationId
            }).from(workspaceTable).where(eq(workspaceTable.id, apiKey.workspaceId));
            if (workspace) await assertOrgPermission(observer.id, workspace.organizationId, "editor");
          }
          const [providerKey] = await db.select({
            id: providerKeyTable.id
          }).from(providerKeyTable).where(and(eq(providerKeyTable.id, args.providerKeyId), eq(providerKeyTable.userId, observer.id)));
          if (!providerKey) throw new GraphQLError("Provider key not found", {
            extensions: {
              code: "NOT_FOUND"
            }
          });
          const [inserted] = await db.insert(apiKeyProviderTable).values({
            apiKeyId: args.apiKeyId,
            providerKeyId: args.providerKeyId
          }).onConflictDoNothing().returning();
          return !!inserted;
        },
        subscribe: undefined
      },
      patchWorkspace: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const [existing] = await db.select({
            organizationId: workspaceTable.organizationId
          }).from(workspaceTable).where(eq(workspaceTable.id, args.id));
          if (!existing) throw new GraphQLError("Workspace not found", {
            extensions: {
              code: "NOT_FOUND"
            }
          });
          if (args.input.name !== void 0 && args.input.name.length > 100) throw new GraphQLError("Name must be 100 characters or fewer", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          if (args.input.slug !== void 0) {
            if (args.input.slug.length > 63) throw new GraphQLError("Slug must be 63 characters or fewer", {
              extensions: {
                code: "BAD_USER_INPUT"
              }
            });
            if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(args.input.slug)) throw new GraphQLError("Slug must contain only lowercase letters, numbers, and hyphens, and must start and end with a letter or number", {
              extensions: {
                code: "BAD_USER_INPUT"
              }
            });
          }
          if (args.input.description !== void 0 && args.input.description.length > 500) throw new GraphQLError("Description must be 500 characters or fewer", {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          await assertOrgMembership(observer.identityProviderId, existing.organizationId);
          await assertOrgPermission(observer.id, existing.organizationId, "editor");
          const set = {
            updatedAt: new Date().toISOString()
          };
          if (args.input.name !== void 0) set.name = args.input.name;
          if (args.input.slug !== void 0) set.slug = args.input.slug;
          if (args.input.description !== void 0) set.description = args.input.description;
          let workspace;
          try {
            [workspace] = await db.update(workspaceTable).set(set).where(eq(workspaceTable.id, args.id)).returning();
          } catch (err) {
            if (err instanceof Error && err.message.includes("unique") && args.input.slug) throw new GraphQLError(`Slug "${args.input.slug}" is already taken in this organization`, {
              extensions: {
                code: "CONFLICT"
              }
            });
            throw err;
          }
          if (!workspace) throw new GraphQLError("Workspace not found", {
            extensions: {
              code: "NOT_FOUND"
            }
          });
          publish({
            type: "synapse.workspace.updated",
            source: "omni.synapse",
            organizationId: workspace.organizationId,
            subject: workspace.id,
            data: {
              workspaceId: workspace.id,
              ...args.input
            }
          });
          events.emit({
            type: "synapse.workspace.updated",
            data: {
              workspaceId: workspace.id,
              ...args.input
            },
            organizationId: workspace.organizationId,
            subject: workspace.id
          });
          return workspace;
        },
        subscribe: undefined
      },
      removeProviderKey: {
        async resolve(_source, args, ctx) {
          const {
            observer
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          if (isVaultEnabled()) {
            const accessToken = extractAccessToken(ctx.request);
            if (!accessToken) throw new GraphQLError("Access token required for vault operations", {
              extensions: {
                code: "UNAUTHENTICATED"
              }
            });
            const target = (await listVaultKeys(accessToken)).find(vk => providerToUUID(vk.provider) === args.id);
            if (!target) return !1;
            const deleted = await removeVaultKey(accessToken, target.provider);
            if (deleted) {
              publish({
                type: "synapse.provider_key.deleted",
                source: "omni.synapse",
                organizationId: observer.id,
                subject: observer.id,
                data: {
                  providerKeyId: args.id
                }
              });
              events.emit({
                type: "synapse.provider_key.deleted",
                data: {
                  providerKeyId: args.id
                },
                organizationId: observer.id,
                subject: observer.id
              });
            }
            return deleted;
          }
          const {
              db
            } = ctx,
            [deleted] = await db.delete(providerKeyTable).where(and(eq(providerKeyTable.id, args.id), eq(providerKeyTable.userId, observer.id))).returning();
          if (deleted) {
            publish({
              type: "synapse.provider_key.deleted",
              source: "omni.synapse",
              organizationId: observer.id,
              subject: observer.id,
              data: {
                providerKeyId: args.id
              }
            });
            events.emit({
              type: "synapse.provider_key.deleted",
              data: {
                providerKeyId: args.id
              },
              organizationId: observer.id,
              subject: observer.id
            });
          }
          return !!deleted;
        },
        subscribe: undefined
      },
      removeWorkspace: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const [existing] = await db.select({
            organizationId: workspaceTable.organizationId
          }).from(workspaceTable).where(eq(workspaceTable.id, args.id));
          if (!existing) throw new GraphQLError("Workspace not found", {
            extensions: {
              code: "NOT_FOUND"
            }
          });
          await assertOrgMembership(observer.identityProviderId, existing.organizationId);
          await assertOrgPermission(observer.id, existing.organizationId, "admin");
          await db.update(apiKeyTable).set({
            revokedAt: new Date().toISOString()
          }).where(and(eq(apiKeyTable.workspaceId, args.id), isNull(apiKeyTable.revokedAt)));
          const [deleted] = await db.delete(workspaceTable).where(eq(workspaceTable.id, args.id)).returning();
          if (deleted) {
            publish({
              type: "synapse.workspace.deleted",
              source: "omni.synapse",
              organizationId: deleted.organizationId,
              subject: args.id,
              data: {
                workspaceId: args.id
              }
            });
            events.emit({
              type: "synapse.workspace.deleted",
              data: {
                workspaceId: args.id
              },
              organizationId: deleted.organizationId,
              subject: args.id
            });
            logAuditEvent({
              organizationId: deleted.organizationId,
              userId: observer.id,
              userIdpId: observer.identityProviderId,
              workspaceId: args.id
            }, {
              action: "workspace.deleted",
              resource: "workspace",
              resourceId: args.id
            });
          }
          return !!deleted;
        },
        subscribe: undefined
      },
      revokeApiKey: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const [existing] = await db.select({
            workspaceId: apiKeyTable.workspaceId
          }).from(apiKeyTable).where(and(eq(apiKeyTable.id, args.id), eq(apiKeyTable.userId, observer.id)));
          if (!existing) throw new GraphQLError("API key not found", {
            extensions: {
              code: "NOT_FOUND"
            }
          });
          if (existing.workspaceId) {
            const [workspace] = await db.select({
              organizationId: workspaceTable.organizationId
            }).from(workspaceTable).where(eq(workspaceTable.id, existing.workspaceId));
            if (workspace) await assertOrgPermission(observer.id, workspace.organizationId, "editor");
          }
          const [updated] = await db.update(apiKeyTable).set({
            revokedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).where(and(eq(apiKeyTable.id, args.id), eq(apiKeyTable.userId, observer.id), isNull(apiKeyTable.revokedAt))).returning();
          if (updated) {
            publish({
              type: "synapse.api_key.revoked",
              source: "omni.synapse",
              organizationId: observer.id,
              subject: observer.id,
              data: {
                apiKeyId: args.id
              }
            });
            logAuditEvent({
              userId: observer.id,
              userIdpId: observer.identityProviderId
            }, {
              action: "api_key.revoked",
              resource: "api_key",
              resourceId: args.id
            });
          }
          return !!updated;
        },
        subscribe: undefined
      },
      setProviderKey: {
        async resolve(_source, args, ctx) {
          const {
            observer
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const {
            provider,
            key
          } = args.input;
          if (isVaultEnabled()) {
            const accessToken = extractAccessToken(ctx.request);
            if (!accessToken) throw new GraphQLError("Access token required for vault operations", {
              extensions: {
                code: "UNAUTHENTICATED"
              }
            });
            const vaultKeys = await listVaultKeys(accessToken);
            if (!vaultKeys.some(vk => vk.provider === provider)) {
              const entitlements = await billing.getEntitlements("user", observer.identityProviderId ?? observer.id, "synapse").catch(() => null);
              if (!isWithinLimit(entitlements, "max_provider_keys", vaultKeys.length, DEFAULT_LIMITS2)) throw new GraphQLError("Provider key limit reached. Upgrade your plan for more keys", {
                extensions: {
                  code: "QUOTA_EXCEEDED"
                }
              });
            }
            const result = await setVaultKey(accessToken, {
              provider,
              key
            });
            if (!result.success) throw new GraphQLError(result.error ?? "Failed to store key in vault", {
              extensions: {
                code: "VAULT_ERROR"
              }
            });
            const now = new Date().toISOString(),
              syntheticKey = {
                id: providerToUUID(provider),
                userId: observer.id,
                provider,
                encryptedKey: "",
                keyHint: key.slice(-4),
                modelPreference: null,
                createdAt: now,
                updatedAt: now
              };
            publish({
              type: "synapse.provider_key.upserted",
              source: "omni.synapse",
              organizationId: observer.id,
              subject: observer.id,
              data: {
                providerKeyId: syntheticKey.id,
                provider
              }
            });
            events.emit({
              type: "synapse.provider_key.upserted",
              data: {
                providerKeyId: syntheticKey.id,
                provider
              },
              organizationId: observer.id,
              subject: observer.id
            });
            return syntheticKey;
          }
          const {
              db
            } = ctx,
            entitlements = await billing.getEntitlements("user", observer.identityProviderId ?? observer.id, "synapse").catch(() => null),
            encryptedKey = encrypt(key),
            keyHint = key.slice(-4),
            providerKey = await db.transaction(async tx => {
              const existingKeys = await tx.select({
                id: providerKeyTable.id
              }).from(providerKeyTable).where(eq(providerKeyTable.userId, observer.id));
              if ((await tx.select({
                id: providerKeyTable.id
              }).from(providerKeyTable).where(and(eq(providerKeyTable.userId, observer.id), eq(providerKeyTable.provider, provider)))).length === 0) {
                if (!isWithinLimit(entitlements, "max_provider_keys", existingKeys.length, DEFAULT_LIMITS2)) throw new GraphQLError("Provider key limit reached. Upgrade your plan for more keys", {
                  extensions: {
                    code: "QUOTA_EXCEEDED"
                  }
                });
              }
              const [inserted] = await tx.insert(providerKeyTable).values({
                userId: observer.id,
                provider,
                encryptedKey,
                keyHint
              }).onConflictDoUpdate({
                target: [providerKeyTable.userId, providerKeyTable.provider],
                set: {
                  encryptedKey,
                  keyHint,
                  updatedAt: new Date().toISOString()
                }
              }).returning();
              return inserted;
            });
          publish({
            type: "synapse.provider_key.upserted",
            source: "omni.synapse",
            organizationId: observer.id,
            subject: observer.id,
            data: {
              providerKeyId: providerKey.id,
              provider
            }
          });
          events.emit({
            type: "synapse.provider_key.upserted",
            data: {
              providerKeyId: providerKey.id,
              provider
            },
            organizationId: observer.id,
            subject: observer.id
          });
          return providerKey;
        },
        subscribe: undefined
      },
      unlinkProviderKey: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const [apiKey] = await db.select({
            id: apiKeyTable.id,
            workspaceId: apiKeyTable.workspaceId
          }).from(apiKeyTable).where(and(eq(apiKeyTable.id, args.apiKeyId), eq(apiKeyTable.userId, observer.id)));
          if (!apiKey) throw new GraphQLError("API key not found", {
            extensions: {
              code: "NOT_FOUND"
            }
          });
          if (apiKey.workspaceId) {
            const [workspace] = await db.select({
              organizationId: workspaceTable.organizationId
            }).from(workspaceTable).where(eq(workspaceTable.id, apiKey.workspaceId));
            if (workspace) await assertOrgPermission(observer.id, workspace.organizationId, "editor");
          }
          const [deleted] = await db.delete(apiKeyProviderTable).where(and(eq(apiKeyProviderTable.apiKeyId, args.apiKeyId), eq(apiKeyProviderTable.providerKeyId, args.providerKeyId))).returning();
          return !!deleted;
        },
        subscribe: undefined
      },
      updateUserPreferences: {
        async resolve(_source, args, ctx) {
          const {
            observer,
            db
          } = ctx;
          if (!observer) throw new GraphQLError("Authentication required", {
            extensions: {
              code: "UNAUTHENTICATED"
            }
          });
          const {
              defaultProvider,
              notifyUsageThreshold,
              notifyKeyExpiry
            } = args.input,
            VALID_PROVIDERS = ["", "anthropic", "openai", "google", "nvidia", "groq", "mistral"];
          if (defaultProvider !== void 0 && !VALID_PROVIDERS.includes(defaultProvider)) throw new GraphQLError(`Invalid provider. Must be one of: ${VALID_PROVIDERS.filter(Boolean).join(", ")}`, {
            extensions: {
              code: "BAD_USER_INPUT"
            }
          });
          const values = {
              userId: observer.id,
              updatedAt: new Date().toISOString(),
              ...(defaultProvider !== void 0 && {
                defaultProvider
              }),
              ...(notifyUsageThreshold !== void 0 && {
                notifyUsageThreshold
              }),
              ...(notifyKeyExpiry !== void 0 && {
                notifyKeyExpiry
              })
            },
            [prefs] = await db.insert(userPreferenceTable).values(values).onConflictDoUpdate({
              target: userPreferenceTable.userId,
              set: {
                ...(defaultProvider !== void 0 && {
                  defaultProvider
                }),
                ...(notifyUsageThreshold !== void 0 && {
                  notifyUsageThreshold
                }),
                ...(notifyKeyExpiry !== void 0 && {
                  notifyKeyExpiry
                }),
                updatedAt: new Date().toISOString()
              }
            }).returning();
          publish({
            type: "synapse.preferences.updated",
            source: "omni.synapse",
            organizationId: observer.id,
            subject: observer.id,
            data: {
              userId: observer.id,
              ...args.input
            }
          });
          events.emit({
            type: "synapse.preferences.updated",
            data: {
              userId: observer.id,
              ...args.input
            },
            organizationId: observer.id,
            subject: observer.id
          });
          return prefs;
        },
        subscribe: undefined
      }
    }
  },
  ApiKey: {
    assertStep: assertPgClassSingleStep,
    plans: {
      apiKeyProviders: {
        plan($record) {
          const $records = spec_resource_api_key_providerPgResource.find({
            api_key_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      createdAt: ApiKeyProvider_createdAtPlan,
      expiresAt($record) {
        return $record.get("expires_at");
      },
      id($parent) {
        const specifier = nodeIdHandler_ApiKey.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_ApiKey.codec.name].encode);
      },
      keyHash($record) {
        return $record.get("key_hash");
      },
      keyHint: ApiKey_keyHintPlan,
      lastUsedAt($record) {
        return $record.get("last_used_at");
      },
      revokedAt($record) {
        return $record.get("revoked_at");
      },
      rowId: ApiKey_rowIdPlan,
      updatedAt: ApiKey_updatedAtPlan,
      usageEvents: {
        plan($record) {
          const $records = spec_resource_usage_eventPgResource.find({
            api_key_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      user: ApiKey_userPlan,
      userId: ApiKey_userIdPlan,
      workspaceId: ApiKey_workspaceIdPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of api_keyUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_api_keyPgResource.get(spec);
    }
  },
  ApiKeyConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount: totalCountConnectionPlan
    }
  },
  ApiKeyInfo: {
    plans: {
      linkedProviders: {
        async resolve(apiKey, _args, ctx) {
          const {
            db
          } = ctx;
          return await db.select({
            id: providerKeyTable.id,
            provider: providerKeyTable.provider,
            keyHint: providerKeyTable.keyHint
          }).from(apiKeyProviderTable).innerJoin(providerKeyTable, eq(apiKeyProviderTable.providerKeyId, providerKeyTable.id)).where(eq(apiKeyProviderTable.apiKeyId, apiKey.id));
        },
        subscribe: undefined
      }
    }
  },
  ApiKeyProvider: {
    assertStep: assertPgClassSingleStep,
    plans: {
      apiKey: ApiKeyProvider_apiKeyPlan,
      apiKeyId: ApiKeyProvider_apiKeyIdPlan,
      createdAt: ApiKeyProvider_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_ApiKeyProvider.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_ApiKeyProvider.codec.name].encode);
      },
      providerKey($record) {
        return spec_resource_provider_keyPgResource.get({
          id: $record.get("provider_key_id")
        });
      },
      providerKeyId($record) {
        return $record.get("provider_key_id");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of api_key_providerUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_api_key_providerPgResource.get(spec);
    }
  },
  ApiKeyProviderConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount: totalCountConnectionPlan
    }
  },
  Observer: {
    plans: {
      apiKeys: {
        async resolve(observer, args, ctx) {
          const {
            db
          } = ctx;
          if (args.workspaceId) {
            const [workspace] = await db.select({
              organizationId: workspaceTable.organizationId
            }).from(workspaceTable).where(eq(workspaceTable.id, args.workspaceId));
            if (workspace) await assertOrgPermission(observer.id, workspace.organizationId, "viewer");
          }
          const conditions = [eq(apiKeyTable.userId, observer.id), isNull(apiKeyTable.revokedAt)];
          if (args.workspaceId) conditions.push(eq(apiKeyTable.workspaceId, args.workspaceId));
          return db.select().from(apiKeyTable).where(and(...conditions)).orderBy(desc(apiKeyTable.createdAt));
        },
        subscribe: undefined
      },
      preferences: {
        async resolve(observer, _args, ctx) {
          const {
              db
            } = ctx,
            [prefs] = await db.select().from(userPreferenceTable).where(eq(userPreferenceTable.userId, observer.id)).limit(1);
          return prefs ?? {
            defaultProvider: null,
            notifyUsageThreshold: !0,
            notifyKeyExpiry: !0
          };
        },
        subscribe: undefined
      },
      providerKeys: {
        async resolve(observer, _args, ctx) {
          if (isVaultEnabled()) {
            const accessToken = extractAccessToken(ctx.request);
            if (!accessToken) return [];
            return (await listVaultKeys(accessToken)).map(vk => ({
              id: providerToUUID(vk.provider),
              userId: observer.id,
              provider: vk.provider,
              encryptedKey: "",
              keyHint: vk.key_hint ?? "",
              modelPreference: vk.model_override ?? null,
              createdAt: vk.created_at,
              updatedAt: vk.updated_at
            }));
          }
          const {
            db
          } = ctx;
          return (await db.select().from(providerKeyTable).where(eq(providerKeyTable.userId, observer.id))).map(row => ({
            ...row,
            encryptedKey: ""
          }));
        },
        subscribe: undefined
      }
    }
  },
  ProviderKey: {
    assertStep: assertPgClassSingleStep,
    plans: {
      apiKeyProviders: {
        plan($record) {
          const $records = spec_resource_api_key_providerPgResource.find({
            provider_key_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      createdAt: ApiKeyProvider_createdAtPlan,
      encryptedKey($record) {
        return $record.get("encrypted_key");
      },
      id($parent) {
        const specifier = nodeIdHandler_ProviderKey.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_ProviderKey.codec.name].encode);
      },
      keyHint: ApiKey_keyHintPlan,
      modelPreference($record) {
        return $record.get("model_preference");
      },
      rowId: ApiKey_rowIdPlan,
      updatedAt: ApiKey_updatedAtPlan,
      user: ApiKey_userPlan,
      userId: ApiKey_userIdPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of provider_keyUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_provider_keyPgResource.get(spec);
    }
  },
  ProviderKeyConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount: totalCountConnectionPlan
    }
  },
  UsageEvent: {
    assertStep: assertPgClassSingleStep,
    plans: {
      apiKey: ApiKeyProvider_apiKeyPlan,
      apiKeyId: ApiKeyProvider_apiKeyIdPlan,
      costCents($record) {
        return $record.get("cost_cents");
      },
      createdAt: ApiKeyProvider_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_UsageEvent.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_UsageEvent.codec.name].encode);
      },
      inputTokens($record) {
        return $record.get("input_tokens");
      },
      outputTokens($record) {
        return $record.get("output_tokens");
      },
      rowId: ApiKey_rowIdPlan,
      user: ApiKey_userPlan,
      userId: ApiKey_userIdPlan,
      workspaceId: ApiKey_workspaceIdPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of usage_eventUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_usage_eventPgResource.get(spec);
    }
  },
  UsageEventConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount: totalCountConnectionPlan
    }
  },
  User: {
    assertStep: assertPgClassSingleStep,
    plans: {
      apiKeys: {
        plan($record) {
          const $records = spec_resource_api_keyPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      avatarUrl($record) {
        return $record.get("avatar_url");
      },
      createdAt: ApiKeyProvider_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_User.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_User.codec.name].encode);
      },
      identityProviderId($record) {
        return $record.get("identity_provider_id");
      },
      providerKeys: {
        plan($record) {
          const $records = spec_resource_provider_keyPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      rowId: ApiKey_rowIdPlan,
      updatedAt: ApiKey_updatedAtPlan,
      usageEvents: {
        plan($record) {
          const $records = spec_resource_usage_eventPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first: applyFirstArg,
          last: applyLastArg,
          offset: applyOffsetArg,
          before: applyBeforeArg,
          after: applyAfterArg,
          condition: applyConditionArgToConnection,
          filter: ApiKey_apiKeyProvidersfilterApplyPlan,
          orderBy: applyOrderByArgToConnection
        }
      },
      userPreference($record) {
        return spec_resource_user_preferencePgResource.get({
          user_id: $record.get("id")
        });
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of userUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_userPgResource.get(spec);
    }
  },
  UserConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount: totalCountConnectionPlan
    }
  },
  UserPreference: {
    assertStep: assertPgClassSingleStep,
    plans: {
      defaultProvider($record) {
        return $record.get("default_provider");
      },
      id($parent) {
        const specifier = nodeIdHandler_UserPreference.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_UserPreference.codec.name].encode);
      },
      notifyKeyExpiry($record) {
        return $record.get("notify_key_expiry");
      },
      notifyUsageThreshold($record) {
        return $record.get("notify_usage_threshold");
      },
      rowId: ApiKey_rowIdPlan,
      updatedAt: ApiKey_updatedAtPlan,
      user: ApiKey_userPlan,
      userId: ApiKey_userIdPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of user_preferenceUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_user_preferencePgResource.get(spec);
    }
  },
  UserPreferenceConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount: totalCountConnectionPlan
    }
  },
  Workspace: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt: ApiKeyProvider_createdAtPlan,
      id($parent) {
        const specifier = nodeIdHandler_Workspace.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_Workspace.codec.name].encode);
      },
      organizationId($record) {
        return $record.get("organization_id");
      },
      rowId: ApiKey_rowIdPlan,
      updatedAt: ApiKey_updatedAtPlan
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of workspaceUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return spec_resource_workspacePgResource.get(spec);
    }
  },
  WorkspaceConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount: totalCountConnectionPlan
    }
  }
};
export const interfaces = {
  Node: {
    planType($nodeId) {
      const $specifier = decodeNodeId($nodeId);
      return {
        $__typename: lambda($specifier, findTypeNameMatch, !0),
        planForType(type) {
          const spec = nodeIdHandlerByTypeName[type.name];
          if (spec) return spec.get(spec.getSpec(access($specifier, [spec.codec.name])));else throw Error(`Failed to find handler for ${type.name}`);
        }
      };
    }
  }
};
export const inputObjects = {
  ApiKeyCondition: {
    plans: {
      keyHash($condition, val) {
        return applyAttributeCondition("key_hash", TYPES.text, $condition, val);
      },
      rowId: ApiKeyCondition_rowIdApply,
      userId: ApiKeyCondition_userIdApply
    }
  },
  ApiKeyFilter: {
    plans: {
      and: ApiKeyFilter_andApply,
      apiKeyProviders($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: apiKeyProviderIdentifier,
          alias: spec_resource_api_key_providerPgResource.name,
          localAttributes: registryConfig.pgRelations.apiKey.apiKeyProvidersByTheirApiKeyId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.apiKey.apiKeyProvidersByTheirApiKeyId.remoteAttributes
        };
        return $rel;
      },
      apiKeyProvidersExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: apiKeyProviderIdentifier,
          alias: spec_resource_api_key_providerPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.apiKey.apiKeyProvidersByTheirApiKeyId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.apiKey.apiKeyProvidersByTheirApiKeyId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      keyHash(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("keyHash", "key_hash", spec_apiKey.attributes.key_hash, queryBuilder, value);
      },
      not: ApiKeyFilter_notApply,
      or: ApiKeyFilter_orApply,
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_apiKey.attributes.id, queryBuilder, value);
      },
      usageEvents($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: usageEventIdentifier,
          alias: spec_resource_usage_eventPgResource.name,
          localAttributes: registryConfig.pgRelations.apiKey.usageEventsByTheirApiKeyId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.apiKey.usageEventsByTheirApiKeyId.remoteAttributes
        };
        return $rel;
      },
      usageEventsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: usageEventIdentifier,
          alias: spec_resource_usage_eventPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.apiKey.usageEventsByTheirApiKeyId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.apiKey.usageEventsByTheirApiKeyId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      user($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.apiKey.userByMyUserId.localAttributes, registryConfig.pgRelations.apiKey.userByMyUserId.remoteAttributes, $where, value);
      },
      userId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("userId", "user_id", spec_apiKey.attributes.user_id, queryBuilder, value);
      }
    }
  },
  ApiKeyProviderCondition: {
    plans: {
      apiKeyId: ApiKeyProviderCondition_apiKeyIdApply,
      providerKeyId($condition, val) {
        return applyAttributeCondition("provider_key_id", TYPES.uuid, $condition, val);
      }
    }
  },
  ApiKeyProviderFilter: {
    plans: {
      and: ApiKeyFilter_andApply,
      apiKey($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_api_keyPgResource, apiKeyIdentifier, registryConfig.pgRelations.apiKeyProvider.apiKeyByMyApiKeyId.localAttributes, registryConfig.pgRelations.apiKeyProvider.apiKeyByMyApiKeyId.remoteAttributes, $where, value);
      },
      apiKeyId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("apiKeyId", "api_key_id", spec_apiKeyProvider.attributes.api_key_id, queryBuilder, value);
      },
      not: ApiKeyFilter_notApply,
      or: ApiKeyFilter_orApply,
      providerKey($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_provider_keyPgResource, providerKeyIdentifier, registryConfig.pgRelations.apiKeyProvider.providerKeyByMyProviderKeyId.localAttributes, registryConfig.pgRelations.apiKeyProvider.providerKeyByMyProviderKeyId.remoteAttributes, $where, value);
      },
      providerKeyId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("providerKeyId", "provider_key_id", spec_apiKeyProvider.attributes.provider_key_id, queryBuilder, value);
      }
    }
  },
  ApiKeyToManyApiKeyProviderFilter: {
    plans: {
      every: ApiKeyToManyApiKeyProviderFilter_everyApply,
      none: ApiKeyToManyApiKeyProviderFilter_noneApply,
      some: ApiKeyToManyApiKeyProviderFilter_someApply
    }
  },
  ApiKeyToManyUsageEventFilter: {
    plans: {
      every: ApiKeyToManyApiKeyProviderFilter_everyApply,
      none: ApiKeyToManyApiKeyProviderFilter_noneApply,
      some: ApiKeyToManyApiKeyProviderFilter_someApply
    }
  },
  DatetimeFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  ProviderKeyCondition: {
    plans: {
      provider($condition, val) {
        return applyAttributeCondition("provider", TYPES.text, $condition, val);
      },
      rowId: ApiKeyCondition_rowIdApply,
      userId: ApiKeyCondition_userIdApply
    }
  },
  ProviderKeyFilter: {
    plans: {
      and: ApiKeyFilter_andApply,
      apiKeyProviders($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: apiKeyProviderIdentifier,
          alias: spec_resource_api_key_providerPgResource.name,
          localAttributes: registryConfig.pgRelations.providerKey.apiKeyProvidersByTheirProviderKeyId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.providerKey.apiKeyProvidersByTheirProviderKeyId.remoteAttributes
        };
        return $rel;
      },
      apiKeyProvidersExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: apiKeyProviderIdentifier,
          alias: spec_resource_api_key_providerPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.providerKey.apiKeyProvidersByTheirProviderKeyId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.providerKey.apiKeyProvidersByTheirProviderKeyId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      not: ApiKeyFilter_notApply,
      or: ApiKeyFilter_orApply,
      provider(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("provider", "provider", spec_providerKey.attributes.provider, queryBuilder, value);
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_providerKey.attributes.id, queryBuilder, value);
      },
      user($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.providerKey.userByMyUserId.localAttributes, registryConfig.pgRelations.providerKey.userByMyUserId.remoteAttributes, $where, value);
      },
      userId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("userId", "user_id", spec_providerKey.attributes.user_id, queryBuilder, value);
      }
    }
  },
  ProviderKeyToManyApiKeyProviderFilter: {
    plans: {
      every: ApiKeyToManyApiKeyProviderFilter_everyApply,
      none: ApiKeyToManyApiKeyProviderFilter_noneApply,
      some: ApiKeyToManyApiKeyProviderFilter_someApply
    }
  },
  StringFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      distinctFromInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("distinctFromInsensitive", resolveDistinct, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      endsWith($where, value) {
        return pgConnectionFilterApplyFromOperator("endsWith", resolveLike, resolveInputEndsWith, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      endsWithInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("endsWithInsensitive", resolveILike, resolveInputEndsWith, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      equalTo: pgAggregatesApply_equalTo,
      equalToInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("equalToInsensitive", resolveEquality, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("greaterThanInsensitive", resolveGreaterThan, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      greaterThanOrEqualToInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("greaterThanOrEqualToInsensitive", resolveGreaterThanOrEqualTo, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      in: pgAggregatesApply_in,
      includes($where, value) {
        return pgConnectionFilterApplyFromOperator("includes", resolveLike, resolveInputContains, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      includesInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("includesInsensitive", resolveILike, resolveInputContains, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      inInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("inInsensitive", resolveEqualsAny, undefined, resolveInputCodecInsensitiveOperator_list, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator_list, $where, value);
      },
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("lessThanInsensitive", resolveLessThan, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      lessThanOrEqualToInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("lessThanOrEqualToInsensitive", resolveLessThanOrEqualTo, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      like($where, value) {
        return pgConnectionFilterApplyFromOperator("like", resolveLike, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      likeInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("likeInsensitive", resolveILike, undefined, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notDistinctFromInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notDistinctFromInsensitive", resolveNotDistinct, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      notEndsWith($where, value) {
        return pgConnectionFilterApplyFromOperator("notEndsWith", resolveNotLike, resolveInputEndsWith, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      notEndsWithInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notEndsWithInsensitive", resolveNotILike, resolveInputEndsWith, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      notEqualTo: pgAggregatesApply_notEqualTo,
      notEqualToInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notEqualToInsensitive", resolveInequality, undefined, resolveInputCodecInsensitiveOperator, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator, $where, value);
      },
      notIn: pgAggregatesApply_notIn,
      notIncludes($where, value) {
        return pgConnectionFilterApplyFromOperator("notIncludes", resolveNotLike, resolveInputContains, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      notIncludesInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notIncludesInsensitive", resolveNotILike, resolveInputContains, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      notInInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notInInsensitive", resolveInequalAll, undefined, resolveInputCodecInsensitiveOperator_list, resolveSqlIdentifierInsensitiveOperator, resolveSqlValueInsensitiveOperator_list, $where, value);
      },
      notLike($where, value) {
        return pgConnectionFilterApplyFromOperator("notLike", resolveNotLike, undefined, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      notLikeInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notLikeInsensitive", resolveNotILike, undefined, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      notStartsWith($where, value) {
        return pgConnectionFilterApplyFromOperator("notStartsWith", resolveNotLike, resolveInputStartsWith, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      notStartsWithInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("notStartsWithInsensitive", resolveNotILike, resolveInputStartsWith, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      },
      startsWith($where, value) {
        return pgConnectionFilterApplyFromOperator("startsWith", resolveLike, resolveInputStartsWith, resolveInputCodecSensitive, resolveSqlIdentifierSensitive, undefined, $where, value);
      },
      startsWithInsensitive($where, value) {
        return pgConnectionFilterApplyFromOperator("startsWithInsensitive", resolveILike, resolveInputStartsWith, resolveInputCodecInsensitive, resolveSqlIdentifierInsensitive, undefined, $where, value);
      }
    }
  },
  UsageEventCondition: {
    plans: {
      apiKeyId: ApiKeyProviderCondition_apiKeyIdApply,
      createdAt($condition, val) {
        return applyAttributeCondition("created_at", TYPES.timestamptz, $condition, val);
      },
      rowId: ApiKeyCondition_rowIdApply,
      userId: ApiKeyCondition_userIdApply
    }
  },
  UsageEventFilter: {
    plans: {
      and: ApiKeyFilter_andApply,
      apiKey($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_api_keyPgResource, apiKeyIdentifier, registryConfig.pgRelations.usageEvent.apiKeyByMyApiKeyId.localAttributes, registryConfig.pgRelations.usageEvent.apiKeyByMyApiKeyId.remoteAttributes, $where, value);
      },
      apiKeyId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("apiKeyId", "api_key_id", spec_usageEvent.attributes.api_key_id, queryBuilder, value);
      },
      createdAt(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("createdAt", "created_at", spec_usageEvent.attributes.created_at, queryBuilder, value);
      },
      not: ApiKeyFilter_notApply,
      or: ApiKeyFilter_orApply,
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_usageEvent.attributes.id, queryBuilder, value);
      },
      user($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.usageEvent.userByMyUserId.localAttributes, registryConfig.pgRelations.usageEvent.userByMyUserId.remoteAttributes, $where, value);
      },
      userId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("userId", "user_id", spec_usageEvent.attributes.user_id, queryBuilder, value);
      }
    }
  },
  UserCondition: {
    plans: {
      identityProviderId($condition, val) {
        return applyAttributeCondition("identity_provider_id", TYPES.uuid, $condition, val);
      },
      rowId: ApiKeyCondition_rowIdApply
    }
  },
  UserFilter: {
    plans: {
      and: ApiKeyFilter_andApply,
      apiKeys($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: apiKeyIdentifier,
          alias: spec_resource_api_keyPgResource.name,
          localAttributes: registryConfig.pgRelations.user.apiKeysByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.apiKeysByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      apiKeysExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: apiKeyIdentifier,
          alias: spec_resource_api_keyPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.apiKeysByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.apiKeysByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      identityProviderId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("identityProviderId", "identity_provider_id", spec_user.attributes.identity_provider_id, queryBuilder, value);
      },
      not: ApiKeyFilter_notApply,
      or: ApiKeyFilter_orApply,
      providerKeys($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: providerKeyIdentifier,
          alias: spec_resource_provider_keyPgResource.name,
          localAttributes: registryConfig.pgRelations.user.providerKeysByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.providerKeysByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      providerKeysExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: providerKeyIdentifier,
          alias: spec_resource_provider_keyPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.providerKeysByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.providerKeysByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_user.attributes.id, queryBuilder, value);
      },
      usageEvents($where, value) {
        assertAllowed(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: usageEventIdentifier,
          alias: spec_resource_usage_eventPgResource.name,
          localAttributes: registryConfig.pgRelations.user.usageEventsByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.usageEventsByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      usageEventsExist($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: usageEventIdentifier,
          alias: spec_resource_usage_eventPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.usageEventsByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.usageEventsByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      userPreference($where, value) {
        assertAllowed(value, "object");
        const $subQuery = $where.existsPlan({
          tableExpression: userPreferenceIdentifier,
          alias: spec_resource_user_preferencePgResource.name
        });
        registryConfig.pgRelations.user.userPreferenceByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.userPreferenceByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      userPreferenceExists($where, value) {
        assertAllowed(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: userPreferenceIdentifier,
          alias: spec_resource_user_preferencePgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.userPreferenceByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.userPreferenceByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      }
    }
  },
  UserPreferenceCondition: {
    plans: {
      rowId: ApiKeyCondition_rowIdApply,
      userId: ApiKeyCondition_userIdApply
    }
  },
  UserPreferenceFilter: {
    plans: {
      and: ApiKeyFilter_andApply,
      not: ApiKeyFilter_notApply,
      or: ApiKeyFilter_orApply,
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_userPreference.attributes.id, queryBuilder, value);
      },
      user($where, value) {
        return pgConnectionFilterApplySingleRelation(spec_resource_userPgResource, userIdentifier, registryConfig.pgRelations.userPreference.userByMyUserId.localAttributes, registryConfig.pgRelations.userPreference.userByMyUserId.remoteAttributes, $where, value);
      },
      userId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("userId", "user_id", spec_userPreference.attributes.user_id, queryBuilder, value);
      }
    }
  },
  UserToManyApiKeyFilter: {
    plans: {
      every: ApiKeyToManyApiKeyProviderFilter_everyApply,
      none: ApiKeyToManyApiKeyProviderFilter_noneApply,
      some: ApiKeyToManyApiKeyProviderFilter_someApply
    }
  },
  UserToManyProviderKeyFilter: {
    plans: {
      every: ApiKeyToManyApiKeyProviderFilter_everyApply,
      none: ApiKeyToManyApiKeyProviderFilter_noneApply,
      some: ApiKeyToManyApiKeyProviderFilter_someApply
    }
  },
  UserToManyUsageEventFilter: {
    plans: {
      every: ApiKeyToManyApiKeyProviderFilter_everyApply,
      none: ApiKeyToManyApiKeyProviderFilter_noneApply,
      some: ApiKeyToManyApiKeyProviderFilter_someApply
    }
  },
  UUIDFilter: {
    plans: {
      distinctFrom: pgAggregatesApply_distinctFrom,
      equalTo: pgAggregatesApply_equalTo,
      greaterThan: pgAggregatesApply_greaterThan,
      greaterThanOrEqualTo: pgAggregatesApply_greaterThanOrEqualTo,
      in: pgAggregatesApply_in,
      isNull: pgAggregatesApply_isNull,
      lessThan: pgAggregatesApply_lessThan,
      lessThanOrEqualTo: pgAggregatesApply_lessThanOrEqualTo,
      notDistinctFrom: pgAggregatesApply_notDistinctFrom,
      notEqualTo: pgAggregatesApply_notEqualTo,
      notIn: pgAggregatesApply_notIn
    }
  },
  WorkspaceCondition: {
    plans: {
      organizationId($condition, val) {
        return applyAttributeCondition("organization_id", TYPES.uuid, $condition, val);
      },
      rowId: ApiKeyCondition_rowIdApply,
      slug($condition, val) {
        return applyAttributeCondition("slug", TYPES.text, $condition, val);
      }
    }
  },
  WorkspaceFilter: {
    plans: {
      and: ApiKeyFilter_andApply,
      not: ApiKeyFilter_notApply,
      or: ApiKeyFilter_orApply,
      organizationId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("organizationId", "organization_id", spec_workspace.attributes.organization_id, queryBuilder, value);
      },
      rowId(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("rowId", "id", spec_workspace.attributes.id, queryBuilder, value);
      },
      slug(queryBuilder, value) {
        return pgConnectionFilterApplyAttribute("slug", "slug", spec_workspace.attributes.slug, queryBuilder, value);
      }
    }
  }
};
export const scalars = {
  Cursor: {
    serialize: toString,
    parseValue: toString,
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return ast.value;
      throw new GraphQLError(`Cursor can only parse string values (kind='${ast.kind}')`);
    }
  },
  Datetime: {
    serialize: toString,
    parseValue: toString,
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return ast.value;
      throw new GraphQLError(`Datetime can only parse string values (kind='${ast.kind}')`);
    }
  },
  UUID: {
    serialize: toString,
    parseValue(value) {
      return coerce("" + value);
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return coerce(ast.value);
      throw new GraphQLError(`UUID can only parse string values (kind = '${ast.kind}')`);
    }
  }
};
export const enums = {
  ApiKeyOrderBy: {
    values: {
      KEY_HASH_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "key_hash",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      KEY_HASH_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "key_hash",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        api_keyUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        api_keyUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_ASC: ApiKeyOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: ApiKeyOrderBy_ROW_ID_DESCApply,
      USER_ID_ASC: ApiKeyOrderBy_USER_ID_ASCApply,
      USER_ID_DESC: ApiKeyOrderBy_USER_ID_DESCApply
    }
  },
  ApiKeyProviderOrderBy: {
    values: {
      API_KEY_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "api_key_id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      API_KEY_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "api_key_id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        api_key_providerUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        api_key_providerUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PROVIDER_KEY_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "provider_key_id",
          direction: "ASC"
        });
      },
      PROVIDER_KEY_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "provider_key_id",
          direction: "DESC"
        });
      }
    }
  },
  ProviderKeyOrderBy: {
    values: {
      PRIMARY_KEY_ASC(queryBuilder) {
        provider_keyUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        provider_keyUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PROVIDER_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "provider",
          direction: "ASC"
        });
      },
      PROVIDER_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "provider",
          direction: "DESC"
        });
      },
      ROW_ID_ASC: ApiKeyOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: ApiKeyOrderBy_ROW_ID_DESCApply,
      USER_ID_ASC: ApiKeyOrderBy_USER_ID_ASCApply,
      USER_ID_DESC: ApiKeyOrderBy_USER_ID_DESCApply
    }
  },
  UsageEventOrderBy: {
    values: {
      API_KEY_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "api_key_id",
          direction: "ASC"
        });
      },
      API_KEY_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "api_key_id",
          direction: "DESC"
        });
      },
      CREATED_AT_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "ASC"
        });
      },
      CREATED_AT_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "created_at",
          direction: "DESC"
        });
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        usage_eventUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        usage_eventUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_ASC: ApiKeyOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: ApiKeyOrderBy_ROW_ID_DESCApply,
      USER_ID_ASC: ApiKeyOrderBy_USER_ID_ASCApply,
      USER_ID_DESC: ApiKeyOrderBy_USER_ID_DESCApply
    }
  },
  UserOrderBy: {
    values: {
      IDENTITY_PROVIDER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "identity_provider_id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      IDENTITY_PROVIDER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "identity_provider_id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        userUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        userUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_ASC: ApiKeyOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: ApiKeyOrderBy_ROW_ID_DESCApply
    }
  },
  UserPreferenceOrderBy: {
    values: {
      PRIMARY_KEY_ASC(queryBuilder) {
        user_preferenceUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        user_preferenceUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_ASC: ApiKeyOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: ApiKeyOrderBy_ROW_ID_DESCApply,
      USER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      USER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      }
    }
  },
  WorkspaceOrderBy: {
    values: {
      ORGANIZATION_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "organization_id",
          direction: "ASC"
        });
      },
      ORGANIZATION_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "organization_id",
          direction: "DESC"
        });
      },
      PRIMARY_KEY_ASC(queryBuilder) {
        workspaceUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "ASC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      PRIMARY_KEY_DESC(queryBuilder) {
        workspaceUniques[0].attributes.forEach(attributeName => {
          queryBuilder.orderBy({
            attribute: attributeName,
            direction: "DESC"
          });
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_ASC: ApiKeyOrderBy_ROW_ID_ASCApply,
      ROW_ID_DESC: ApiKeyOrderBy_ROW_ID_DESCApply,
      SLUG_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "slug",
          direction: "ASC"
        });
      },
      SLUG_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "slug",
          direction: "DESC"
        });
      }
    }
  }
};
export const schema = makeGrafastSchema({
  typeDefs: typeDefs,
  objects: objects,
  interfaces: interfaces,
  inputObjects: inputObjects,
  scalars: scalars,
  enums: enums
});