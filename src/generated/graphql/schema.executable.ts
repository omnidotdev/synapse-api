/* eslint-disable graphile-export/export-instances, graphile-export/export-methods, graphile-export/export-plans, graphile-export/exhaustive-deps */
import { PgCondition, PgDeleteSingleStep, PgExecutor, TYPES, assertPgClassSingleStep, listOfCodec, makeRegistry, pgDeleteSingle, pgInsertSingle, pgSelectFromRecord, pgUpdateSingle, recordCodec, sqlValueWithCodec } from "@dataplan/pg";
import { ConnectionStep, EdgeStep, ObjectStep, __ValueStep, access, assertExecutableStep, bakedInputRuntime, connection, constant, context, createObjectAndApplyChildren, first, get as get2, inhibitOnNull, inspect, lambda, list, makeDecodeNodeId, makeGrafastSchema, object, rootValue, specFromNodeId } from "grafast";
import { GraphQLError, Kind } from "graphql";
import { sql } from "pg-sql2";
const nodeIdHandler_Query = {
  typeName: "Query",
  codec: {
    name: "raw",
    encode: Object.assign(function rawEncode(value) {
      return typeof value === "string" ? value : null;
    }, {
      isSyncAndSafe: true
    }),
    decode: Object.assign(function rawDecode(value) {
      return typeof value === "string" ? value : null;
    }, {
      isSyncAndSafe: true
    })
  },
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
};
const nodeIdCodecs_base64JSON_base64JSON = {
  name: "base64JSON",
  encode: (() => {
    function base64JSONEncode(value) {
      return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
    }
    base64JSONEncode.isSyncAndSafe = !0;
    return base64JSONEncode;
  })(),
  decode: (() => {
    function base64JSONDecode(value) {
      return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    }
    base64JSONDecode.isSyncAndSafe = !0;
    return base64JSONDecode;
  })()
};
const nodeIdCodecs = {
  __proto__: null,
  raw: nodeIdHandler_Query.codec,
  base64JSON: nodeIdCodecs_base64JSON_base64JSON,
  pipeString: {
    name: "pipeString",
    encode: Object.assign(function pipeStringEncode(value) {
      return Array.isArray(value) ? value.join("|") : null;
    }, {
      isSyncAndSafe: true
    }),
    decode: Object.assign(function pipeStringDecode(value) {
      return typeof value === "string" ? value.split("|") : null;
    }, {
      isSyncAndSafe: true
    })
  }
};
const executor = new PgExecutor({
  name: "main",
  context() {
    const ctx = context();
    return object({
      pgSettings: "pgSettings" != null ? ctx.get("pgSettings") : constant(null),
      withPgClient: ctx.get("withPgClient")
    });
  }
});
const providerKeyIdentifier = sql.identifier("public", "provider_key");
const spec_providerKey = {
  name: "providerKey",
  identifier: providerKeyIdentifier,
  attributes: {
    __proto__: null,
    id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    provider: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    encrypted_key: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    key_hint: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    created_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    updated_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "404325",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "provider_key"
    },
    tags: {
      __proto__: null
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
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    identity_provider_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    created_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    updated_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    email: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    name: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    avatar_url: {
      description: undefined,
      codec: TYPES.text,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "404268",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user"
    },
    tags: {
      __proto__: null
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
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    workspace_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    key_hash: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    key_hint: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    name: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    mode: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    last_used_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    expires_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    revoked_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    created_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    updated_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "404306",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "api_key"
    },
    tags: {
      __proto__: null
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
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    user_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    workspace_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: false,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    api_key_id: {
      description: undefined,
      codec: TYPES.uuid,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    },
    provider: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    model: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    input_tokens: {
      description: undefined,
      codec: TYPES.int,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    output_tokens: {
      description: undefined,
      codec: TYPES.int,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    cost_cents: {
      description: undefined,
      codec: TYPES.int,
      notNull: true,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    mode: {
      description: undefined,
      codec: TYPES.text,
      notNull: true,
      hasDefault: false,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true,
        isIndexed: false
      }
    },
    created_at: {
      description: undefined,
      codec: TYPES.timestamptz,
      notNull: false,
      hasDefault: true,
      extensions: {
        tags: {},
        canSelect: true,
        canInsert: true,
        canUpdate: true
      }
    }
  },
  description: undefined,
  extensions: {
    oid: "404340",
    isTableLike: true,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "usage_event"
    },
    tags: {
      __proto__: null
    }
  },
  executor: executor
};
const usageEventCodec = recordCodec(spec_usageEvent);
const provider_keyUniques = [{
  isPrimary: true,
  attributes: ["id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}];
const registryConfig_pgResources_provider_key_provider_key = {
  executor: executor,
  name: "provider_key",
  identifier: "main.public.provider_key",
  from: providerKeyIdentifier,
  codec: providerKeyCodec,
  uniques: provider_keyUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "provider_key"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const userUniques = [{
  isPrimary: true,
  attributes: ["id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}, {
  isPrimary: false,
  attributes: ["identity_provider_id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}];
const registryConfig_pgResources_user_user = {
  executor: executor,
  name: "user",
  identifier: "main.public.user",
  from: userIdentifier,
  codec: userCodec,
  uniques: userUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "user"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const api_keyUniques = [{
  isPrimary: true,
  attributes: ["id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}, {
  isPrimary: false,
  attributes: ["key_hash"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}];
const registryConfig_pgResources_api_key_api_key = {
  executor: executor,
  name: "api_key",
  identifier: "main.public.api_key",
  from: apiKeyIdentifier,
  codec: apiKeyCodec,
  uniques: api_keyUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "api_key"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const usage_eventUniques = [{
  isPrimary: true,
  attributes: ["id"],
  description: undefined,
  extensions: {
    tags: {
      __proto__: null
    }
  }
}];
const registryConfig_pgResources_usage_event_usage_event = {
  executor: executor,
  name: "usage_event",
  identifier: "main.public.usage_event",
  from: usageEventIdentifier,
  codec: usageEventCodec,
  uniques: usage_eventUniques,
  isVirtual: false,
  description: undefined,
  extensions: {
    description: undefined,
    pg: {
      serviceName: "main",
      schemaName: "public",
      name: "usage_event"
    },
    isInsertable: true,
    isUpdatable: true,
    isDeletable: true,
    tags: {},
    canSelect: true,
    canInsert: true,
    canUpdate: true,
    canDelete: true
  }
};
const registryConfig = {
  pgExecutors: {
    __proto__: null,
    main: executor
  },
  pgCodecs: {
    __proto__: null,
    providerKey: providerKeyCodec,
    uuid: TYPES.uuid,
    text: TYPES.text,
    timestamptz: TYPES.timestamptz,
    user: userCodec,
    apiKey: apiKeyCodec,
    usageEvent: usageEventCodec,
    int4: TYPES.int
  },
  pgResources: {
    __proto__: null,
    provider_key: registryConfig_pgResources_provider_key_provider_key,
    user: registryConfig_pgResources_user_user,
    api_key: registryConfig_pgResources_api_key_api_key,
    usage_event: registryConfig_pgResources_usage_event_usage_event
  },
  pgRelations: {
    __proto__: null,
    apiKey: {
      __proto__: null,
      userByMyUserId: {
        localCodec: apiKeyCodec,
        remoteResourceOptions: registryConfig_pgResources_user_user,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      usageEventsByTheirApiKeyId: {
        localCodec: apiKeyCodec,
        remoteResourceOptions: registryConfig_pgResources_usage_event_usage_event,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["api_key_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    },
    providerKey: {
      __proto__: null,
      userByMyUserId: {
        localCodec: providerKeyCodec,
        remoteResourceOptions: registryConfig_pgResources_user_user,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    },
    usageEvent: {
      __proto__: null,
      apiKeyByMyApiKeyId: {
        localCodec: usageEventCodec,
        remoteResourceOptions: registryConfig_pgResources_api_key_api_key,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["api_key_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      userByMyUserId: {
        localCodec: usageEventCodec,
        remoteResourceOptions: registryConfig_pgResources_user_user,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["user_id"],
        remoteAttributes: ["id"],
        isUnique: true,
        isReferencee: false,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    },
    user: {
      __proto__: null,
      apiKeysByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: registryConfig_pgResources_api_key_api_key,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      providerKeysByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: registryConfig_pgResources_provider_key_provider_key,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      },
      usageEventsByTheirUserId: {
        localCodec: userCodec,
        remoteResourceOptions: registryConfig_pgResources_usage_event_usage_event,
        localCodecPolymorphicTypes: undefined,
        localAttributes: ["id"],
        remoteAttributes: ["user_id"],
        isUnique: false,
        isReferencee: true,
        description: undefined,
        extensions: {
          tags: {
            behavior: []
          }
        }
      }
    }
  }
};
const registry = makeRegistry(registryConfig);
const resource_provider_keyPgResource = registry.pgResources["provider_key"];
const resource_userPgResource = registry.pgResources["user"];
const resource_api_keyPgResource = registry.pgResources["api_key"];
const resource_usage_eventPgResource = registry.pgResources["usage_event"];
const nodeIdHandler_ProviderKey = {
  typeName: "ProviderKey",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("ProviderKey", false), $record.get("id")]);
  },
  getSpec($list) {
    return {
      id: inhibitOnNull(access($list, [1]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_provider_keyPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "ProviderKey";
  }
};
const specForHandlerCache = new Map();
function specForHandler(handler) {
  const existing = specForHandlerCache.get(handler);
  if (existing) return existing;
  function spec(nodeId) {
    if (nodeId == null) return null;
    try {
      const specifier = handler.codec.decode(nodeId);
      if (handler.match(specifier)) return specifier;
    } catch {}
    return null;
  }
  spec.displayName = `specifier_${handler.typeName}_${handler.codec.name}`;
  spec.isSyncAndSafe = !0;
  specForHandlerCache.set(handler, spec);
  return spec;
}
const nodeFetcher_ProviderKey = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_ProviderKey));
  return nodeIdHandler_ProviderKey.get(nodeIdHandler_ProviderKey.getSpec($decoded));
};
const nodeIdHandler_User = {
  typeName: "User",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("User", false), $record.get("id")]);
  },
  getSpec($list) {
    return {
      id: inhibitOnNull(access($list, [1]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_userPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "User";
  }
};
const nodeFetcher_User = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_User));
  return nodeIdHandler_User.get(nodeIdHandler_User.getSpec($decoded));
};
const nodeIdHandler_ApiKey = {
  typeName: "ApiKey",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("ApiKey", false), $record.get("id")]);
  },
  getSpec($list) {
    return {
      id: inhibitOnNull(access($list, [1]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_api_keyPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "ApiKey";
  }
};
const nodeFetcher_ApiKey = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_ApiKey));
  return nodeIdHandler_ApiKey.get(nodeIdHandler_ApiKey.getSpec($decoded));
};
const nodeIdHandler_UsageEvent = {
  typeName: "UsageEvent",
  codec: nodeIdCodecs_base64JSON_base64JSON,
  deprecationReason: undefined,
  plan($record) {
    return list([constant("UsageEvent", false), $record.get("id")]);
  },
  getSpec($list) {
    return {
      id: inhibitOnNull(access($list, [1]))
    };
  },
  getIdentifiers(value) {
    return value.slice(1);
  },
  get(spec) {
    return resource_usage_eventPgResource.get(spec);
  },
  match(obj) {
    return obj[0] === "UsageEvent";
  }
};
const nodeFetcher_UsageEvent = $nodeId => {
  const $decoded = lambda($nodeId, specForHandler(nodeIdHandler_UsageEvent));
  return nodeIdHandler_UsageEvent.get(nodeIdHandler_UsageEvent.getSpec($decoded));
};
function qbWhereBuilder(qb) {
  return qb.whereBuilder();
}
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
function assertAllowed2(value, mode) {
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
function assertAllowed3(value, mode) {
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
function assertAllowed4(value, mode) {
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
const nodeIdHandlerByTypeName = {
  __proto__: null,
  Query: nodeIdHandler_Query,
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
function UUIDSerialize(value) {
  return "" + value;
}
const coerce = string => {
  if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(string)) throw new GraphQLError("Invalid UUID, expected 32 hexadecimal characters, optionally with hyphens");
  return string;
};
function assertAllowed5(value, mode) {
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
function assertAllowed6(value, mode) {
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
function assertAllowed7(value, mode) {
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
function assertAllowed8(value, mode) {
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
const colSpec = {
  fieldName: "rowId",
  attributeName: "id",
  attribute: spec_usageEvent.attributes.id
};
const colSpec2 = {
  fieldName: "userId",
  attributeName: "user_id",
  attribute: spec_usageEvent.attributes.user_id
};
const colSpec3 = {
  fieldName: "apiKeyId",
  attributeName: "api_key_id",
  attribute: spec_usageEvent.attributes.api_key_id
};
const colSpec4 = {
  fieldName: "createdAt",
  attributeName: "created_at",
  attribute: spec_usageEvent.attributes.created_at
};
function assertAllowed9(value, mode) {
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
function assertAllowed10(value, mode) {
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
const resolve = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec = () => TYPES.boolean;
const resolveSqlValue = () => sql.null;
const resolve2 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec2(c) {
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
function resolveSqlIdentifier(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive.includes(resolveDomains(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive.includes(resolveDomains(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve3 = (i, v) => sql`${i} <> ${v}`;
const resolve4 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve5 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve6 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec3(c) {
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
const resolve7 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve8 = (i, v) => sql`${i} < ${v}`;
const resolve9 = (i, v) => sql`${i} <= ${v}`;
const resolve10 = (i, v) => sql`${i} > ${v}`;
const resolve11 = (i, v) => sql`${i} >= ${v}`;
const resolve12 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec4 = () => TYPES.boolean;
const resolveSqlValue2 = () => sql.null;
const resolve13 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive2 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains2(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec5(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive2.includes(resolveDomains2(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive2.includes(resolveDomains2(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier2(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive2.includes(resolveDomains2(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive2.includes(resolveDomains2(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve14 = (i, v) => sql`${i} <> ${v}`;
const resolve15 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve16 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve17 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec6(c) {
  if (forceTextTypesSensitive2.includes(resolveDomains2(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve18 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve19 = (i, v) => sql`${i} < ${v}`;
const resolve20 = (i, v) => sql`${i} <= ${v}`;
const resolve21 = (i, v) => sql`${i} > ${v}`;
const resolve22 = (i, v) => sql`${i} >= ${v}`;
const colSpec5 = {
  fieldName: "rowId",
  attributeName: "id",
  attribute: spec_apiKey.attributes.id
};
const colSpec6 = {
  fieldName: "userId",
  attributeName: "user_id",
  attribute: spec_apiKey.attributes.user_id
};
const colSpec7 = {
  fieldName: "keyHash",
  attributeName: "key_hash",
  attribute: spec_apiKey.attributes.key_hash
};
function assertAllowed11(value, mode) {
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
function assertAllowed12(value, mode) {
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
function assertAllowed13(value, mode) {
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
const resolve23 = (i, _v, input) => sql`${i} ${input ? sql`IS NULL` : sql`IS NOT NULL`}`;
const resolveInputCodec7 = () => TYPES.boolean;
const resolveSqlValue3 = () => sql.null;
const resolve24 = (i, v) => sql`${i} = ${v}`;
const forceTextTypesSensitive3 = [TYPES.citext, TYPES.char, TYPES.bpchar];
function resolveDomains3(c) {
  let current = c;
  while (current.domainOfCodec) current = current.domainOfCodec;
  return current;
}
function resolveInputCodec8(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesSensitive3.includes(resolveDomains3(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesSensitive3.includes(resolveDomains3(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier3(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesSensitive3.includes(resolveDomains3(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesSensitive3.includes(resolveDomains3(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve25 = (i, v) => sql`${i} <> ${v}`;
const resolve26 = (i, v) => sql`${i} IS DISTINCT FROM ${v}`;
const resolve27 = (i, v) => sql`${i} IS NOT DISTINCT FROM ${v}`;
const resolve28 = (i, v) => sql`${i} = ANY(${v})`;
function resolveInputCodec9(c) {
  if (forceTextTypesSensitive3.includes(resolveDomains3(c))) return listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: !0
    }
  });else return listOfCodec(c, {
    extensions: {
      listItemNonNull: !0
    }
  });
}
const resolve29 = (i, v) => sql`${i} <> ALL(${v})`;
const resolve30 = (i, v) => sql`${i} < ${v}`;
const resolve31 = (i, v) => sql`${i} <= ${v}`;
const resolve32 = (i, v) => sql`${i} > ${v}`;
const resolve33 = (i, v) => sql`${i} >= ${v}`;
const resolve34 = (i, v) => sql`${i} LIKE ${v}`;
function escapeLikeWildcards(input) {
  if (typeof input !== "string") throw Error("Non-string input was provided to escapeLikeWildcards");else return input.split("%").join("\\%").split("_").join("\\_");
}
const resolveInput = input => `%${escapeLikeWildcards(input)}%`;
const resolve35 = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolveInput2 = input => `%${escapeLikeWildcards(input)}%`;
const resolve36 = (i, v) => sql`${i} ILIKE ${v}`;
const resolveInput3 = input => `%${escapeLikeWildcards(input)}%`;
const forceTextTypesInsensitive = [TYPES.char, TYPES.bpchar];
function resolveInputCodec10(c) {
  if (c.arrayOfCodec) {
    if (forceTextTypesInsensitive.includes(resolveDomains3(c.arrayOfCodec))) return listOfCodec(TYPES.text, {
      extensions: {
        listItemNonNull: c.extensions?.listItemNonNull
      }
    });
    return c;
  } else {
    if (forceTextTypesInsensitive.includes(resolveDomains3(c))) return TYPES.text;
    return c;
  }
}
function resolveSqlIdentifier4(identifier, c) {
  if (c.arrayOfCodec && forceTextTypesInsensitive.includes(resolveDomains3(c.arrayOfCodec))) return [sql`(${identifier})::text[]`, listOfCodec(TYPES.text, {
    extensions: {
      listItemNonNull: c.extensions?.listItemNonNull
    }
  })];else if (forceTextTypesInsensitive.includes(resolveDomains3(c))) return [sql`(${identifier})::text`, TYPES.text];else return [identifier, c];
}
const resolve37 = (i, v) => sql`${i} NOT ILIKE ${v}`;
const resolveInput4 = input => `%${escapeLikeWildcards(input)}%`;
const resolve38 = (i, v) => sql`${i} LIKE ${v}`;
const resolveInput5 = input => `${escapeLikeWildcards(input)}%`;
const resolve39 = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolveInput6 = input => `${escapeLikeWildcards(input)}%`;
const resolve40 = (i, v) => sql`${i} ILIKE ${v}`;
const resolveInput7 = input => `${escapeLikeWildcards(input)}%`;
const resolve41 = (i, v) => sql`${i} NOT ILIKE ${v}`;
const resolveInput8 = input => `${escapeLikeWildcards(input)}%`;
const resolve42 = (i, v) => sql`${i} LIKE ${v}`;
const resolveInput9 = input => `%${escapeLikeWildcards(input)}`;
const resolve43 = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolveInput10 = input => `%${escapeLikeWildcards(input)}`;
const resolve44 = (i, v) => sql`${i} ILIKE ${v}`;
const resolveInput11 = input => `%${escapeLikeWildcards(input)}`;
const resolve45 = (i, v) => sql`${i} NOT ILIKE ${v}`;
const resolveInput12 = input => `%${escapeLikeWildcards(input)}`;
const resolve46 = (i, v) => sql`${i} LIKE ${v}`;
const resolve47 = (i, v) => sql`${i} NOT LIKE ${v}`;
const resolve48 = (i, v) => sql`${i} ILIKE ${v}`;
const resolve49 = (i, v) => sql`${i} NOT ILIKE ${v}`;
function resolveInputCodec11(inputCodec) {
  if ("equalTo" === "in" || "equalTo" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier5(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue4(_unused, input, inputCodec) {
  if ("equalTo" === "in" || "equalTo" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec12(inputCodec) {
  if ("notEqualTo" === "in" || "notEqualTo" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier6(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue5(_unused, input, inputCodec) {
  if ("notEqualTo" === "in" || "notEqualTo" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec13(inputCodec) {
  if ("distinctFrom" === "in" || "distinctFrom" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier7(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue6(_unused, input, inputCodec) {
  if ("distinctFrom" === "in" || "distinctFrom" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec14(inputCodec) {
  if ("notDistinctFrom" === "in" || "notDistinctFrom" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier8(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue7(_unused, input, inputCodec) {
  if ("notDistinctFrom" === "in" || "notDistinctFrom" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec15(inputCodec) {
  if ("in" === "in" || "in" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier9(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue8(_unused, input, inputCodec) {
  if ("in" === "in" || "in" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec16(inputCodec) {
  if ("notIn" === "in" || "notIn" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier10(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue9(_unused, input, inputCodec) {
  if ("notIn" === "in" || "notIn" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec17(inputCodec) {
  if ("lessThan" === "in" || "lessThan" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier11(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue10(_unused, input, inputCodec) {
  if ("lessThan" === "in" || "lessThan" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec18(inputCodec) {
  if ("lessThanOrEqualTo" === "in" || "lessThanOrEqualTo" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier12(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue11(_unused, input, inputCodec) {
  if ("lessThanOrEqualTo" === "in" || "lessThanOrEqualTo" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec19(inputCodec) {
  if ("greaterThan" === "in" || "greaterThan" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier13(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue12(_unused, input, inputCodec) {
  if ("greaterThan" === "in" || "greaterThan" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function resolveInputCodec20(inputCodec) {
  if ("greaterThanOrEqualTo" === "in" || "greaterThanOrEqualTo" === "notIn") {
    const t = resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
    return listOfCodec(t, {
      extensions: {
        listItemNonNull: !0
      }
    });
  } else return resolveDomains3(inputCodec) === TYPES.citext ? inputCodec : TYPES.text;
}
function resolveSqlIdentifier14(sourceAlias, codec) {
  return resolveDomains3(codec) === TYPES.citext ? [sourceAlias, codec] : [sql`lower(${sourceAlias}::text)`, TYPES.text];
}
function resolveSqlValue13(_unused, input, inputCodec) {
  if ("greaterThanOrEqualTo" === "in" || "greaterThanOrEqualTo" === "notIn") {
    const sqlList = sqlValueWithCodec(input, inputCodec);
    if (inputCodec.arrayOfCodec === TYPES.citext) return sqlList;else return sql`(select lower(t) from unnest(${sqlList}) t)`;
  } else {
    const sqlValue = sqlValueWithCodec(input, inputCodec);
    if (inputCodec === TYPES.citext) return sqlValue;else return sql`lower(${sqlValue})`;
  }
}
function assertAllowed14(value, mode) {
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
const colSpec8 = {
  fieldName: "rowId",
  attributeName: "id",
  attribute: spec_user.attributes.id
};
const colSpec9 = {
  fieldName: "identityProviderId",
  attributeName: "identity_provider_id",
  attribute: spec_user.attributes.identity_provider_id
};
function assertAllowed15(value, mode) {
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
function assertAllowed16(value, mode) {
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
function assertAllowed17(value, mode) {
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
function assertAllowed18(value, mode) {
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
const colSpec10 = {
  fieldName: "rowId",
  attributeName: "id",
  attribute: spec_providerKey.attributes.id
};
const colSpec11 = {
  fieldName: "userId",
  attributeName: "user_id",
  attribute: spec_providerKey.attributes.user_id
};
const colSpec12 = {
  fieldName: "provider",
  attributeName: "provider",
  attribute: spec_providerKey.attributes.provider
};
function assertAllowed19(value, mode) {
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
function assertAllowed20(value, mode) {
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
function assertAllowed21(value, mode) {
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
const specFromArgs_ProviderKey = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_ProviderKey, $nodeId);
};
const specFromArgs_User = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_User, $nodeId);
};
const specFromArgs_ApiKey = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_ApiKey, $nodeId);
};
const specFromArgs_UsageEvent = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_UsageEvent, $nodeId);
};
const specFromArgs_ProviderKey2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_ProviderKey, $nodeId);
};
const specFromArgs_User2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_User, $nodeId);
};
const specFromArgs_ApiKey2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_ApiKey, $nodeId);
};
const specFromArgs_UsageEvent2 = args => {
  const $nodeId = args.getRaw(["input", "id"]);
  return specFromNodeId(nodeIdHandler_UsageEvent, $nodeId);
};
const getPgSelectSingleFromMutationResult = (resource, pkAttributes, $mutation) => {
  const $result = $mutation.getStepForKey("result", !0);
  if (!$result) return null;
  if ($result instanceof PgDeleteSingleStep) return pgSelectFromRecord($result.resource, $result.record());else {
    const spec = pkAttributes.reduce((memo, attributeName) => {
      memo[attributeName] = $result.get(attributeName);
      return memo;
    }, Object.create(null));
    return resource.find(spec);
  }
};
const pgMutationPayloadEdge = (resource, pkAttributes, $mutation, fieldArgs) => {
  const $select = getPgSelectSingleFromMutationResult(resource, pkAttributes, $mutation);
  if (!$select) return constant(null);
  fieldArgs.apply($select, "orderBy");
  const $connection = connection($select);
  return new EdgeStep($connection, first($connection));
};
export const typeDefs = /* GraphQL */`"""The root query type which gives access points into the data universe."""
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
}

"""An object with a globally unique \`ID\`."""
interface Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
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
  createdAt: Datetime
  updatedAt: Datetime

  """Reads a single \`User\` that is related to this \`ProviderKey\`."""
  user: User
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

type User implements Node {
  """
  A globally unique identifier. Can be used in various places throughout the system to identify this single value.
  """
  id: ID!
  rowId: UUID!
  identityProviderId: UUID!
  createdAt: Datetime
  updatedAt: Datetime
  email: String
  name: String
  avatarUrl: String

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
A filter to be used against \`ApiKey\` object types. All fields are combined with a logical ‘and.’
"""
input ApiKeyFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`userId\` field."""
  userId: UUIDFilter

  """Filter by the object’s \`keyHash\` field."""
  keyHash: StringFilter

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
A filter to be used against \`ProviderKey\` object types. All fields are combined with a logical ‘and.’
"""
input ProviderKeyFilter {
  """Filter by the object’s \`rowId\` field."""
  rowId: UUIDFilter

  """Filter by the object’s \`userId\` field."""
  userId: UUIDFilter

  """Filter by the object’s \`provider\` field."""
  provider: StringFilter

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

"""A \`ApiKey\` edge in the connection."""
type ApiKeyEdge {
  """A cursor for use in pagination."""
  cursor: Cursor

  """The \`ApiKey\` at the end of the edge."""
  node: ApiKey
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

"""
The root mutation type which contains root level fields which mutate data.
"""
type Mutation {
  """Creates a single \`ProviderKey\`."""
  createProviderKey(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateProviderKeyInput!
  ): CreateProviderKeyPayload

  """Creates a single \`User\`."""
  createUser(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateUserInput!
  ): CreateUserPayload

  """Creates a single \`ApiKey\`."""
  createApiKey(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateApiKeyInput!
  ): CreateApiKeyPayload

  """Creates a single \`UsageEvent\`."""
  createUsageEvent(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: CreateUsageEventInput!
  ): CreateUsageEventPayload

  """
  Updates a single \`ProviderKey\` using its globally unique id and a patch.
  """
  updateProviderKeyById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateProviderKeyByIdInput!
  ): UpdateProviderKeyPayload

  """Updates a single \`ProviderKey\` using a unique key and a patch."""
  updateProviderKey(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateProviderKeyInput!
  ): UpdateProviderKeyPayload

  """Updates a single \`User\` using its globally unique id and a patch."""
  updateUserById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateUserByIdInput!
  ): UpdateUserPayload

  """Updates a single \`User\` using a unique key and a patch."""
  updateUser(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateUserInput!
  ): UpdateUserPayload

  """Updates a single \`User\` using a unique key and a patch."""
  updateUserByIdentityProviderId(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateUserByIdentityProviderIdInput!
  ): UpdateUserPayload

  """Updates a single \`ApiKey\` using its globally unique id and a patch."""
  updateApiKeyById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateApiKeyByIdInput!
  ): UpdateApiKeyPayload

  """Updates a single \`ApiKey\` using a unique key and a patch."""
  updateApiKey(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateApiKeyInput!
  ): UpdateApiKeyPayload

  """Updates a single \`ApiKey\` using a unique key and a patch."""
  updateApiKeyByKeyHash(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateApiKeyByKeyHashInput!
  ): UpdateApiKeyPayload

  """
  Updates a single \`UsageEvent\` using its globally unique id and a patch.
  """
  updateUsageEventById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateUsageEventByIdInput!
  ): UpdateUsageEventPayload

  """Updates a single \`UsageEvent\` using a unique key and a patch."""
  updateUsageEvent(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: UpdateUsageEventInput!
  ): UpdateUsageEventPayload

  """Deletes a single \`ProviderKey\` using its globally unique id."""
  deleteProviderKeyById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteProviderKeyByIdInput!
  ): DeleteProviderKeyPayload

  """Deletes a single \`ProviderKey\` using a unique key."""
  deleteProviderKey(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteProviderKeyInput!
  ): DeleteProviderKeyPayload

  """Deletes a single \`User\` using its globally unique id."""
  deleteUserById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteUserByIdInput!
  ): DeleteUserPayload

  """Deletes a single \`User\` using a unique key."""
  deleteUser(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteUserInput!
  ): DeleteUserPayload

  """Deletes a single \`User\` using a unique key."""
  deleteUserByIdentityProviderId(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteUserByIdentityProviderIdInput!
  ): DeleteUserPayload

  """Deletes a single \`ApiKey\` using its globally unique id."""
  deleteApiKeyById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteApiKeyByIdInput!
  ): DeleteApiKeyPayload

  """Deletes a single \`ApiKey\` using a unique key."""
  deleteApiKey(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteApiKeyInput!
  ): DeleteApiKeyPayload

  """Deletes a single \`ApiKey\` using a unique key."""
  deleteApiKeyByKeyHash(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteApiKeyByKeyHashInput!
  ): DeleteApiKeyPayload

  """Deletes a single \`UsageEvent\` using its globally unique id."""
  deleteUsageEventById(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteUsageEventByIdInput!
  ): DeleteUsageEventPayload

  """Deletes a single \`UsageEvent\` using a unique key."""
  deleteUsageEvent(
    """
    The exclusive input argument for this mutation. An object type, make sure to see documentation for this object’s fields.
    """
    input: DeleteUsageEventInput!
  ): DeleteUsageEventPayload
}

"""The output of our create \`ProviderKey\` mutation."""
type CreateProviderKeyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ProviderKey\` that was created by this mutation."""
  providerKey: ProviderKey

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ProviderKey\`. May be used by Relay 1."""
  providerKeyEdge(
    """The method to use when ordering \`ProviderKey\`."""
    orderBy: [ProviderKeyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ProviderKeyEdge
}

"""All input for the create \`ProviderKey\` mutation."""
input CreateProviderKeyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`ProviderKey\` to be created by this mutation."""
  providerKey: ProviderKeyInput!
}

"""An input for mutations affecting \`ProviderKey\`"""
input ProviderKeyInput {
  rowId: UUID
  userId: UUID!
  provider: String!
  encryptedKey: String!
  keyHint: String!
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our create \`User\` mutation."""
type CreateUserPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`User\` that was created by this mutation."""
  user: User

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`User\`. May be used by Relay 1."""
  userEdge(
    """The method to use when ordering \`User\`."""
    orderBy: [UserOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UserEdge
}

"""All input for the create \`User\` mutation."""
input CreateUserInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`User\` to be created by this mutation."""
  user: UserInput!
}

"""An input for mutations affecting \`User\`"""
input UserInput {
  rowId: UUID
  identityProviderId: UUID!
  createdAt: Datetime
  updatedAt: Datetime
  email: String
  name: String
  avatarUrl: String
}

"""The output of our create \`ApiKey\` mutation."""
type CreateApiKeyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ApiKey\` that was created by this mutation."""
  apiKey: ApiKey

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ApiKey\`. May be used by Relay 1."""
  apiKeyEdge(
    """The method to use when ordering \`ApiKey\`."""
    orderBy: [ApiKeyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ApiKeyEdge
}

"""All input for the create \`ApiKey\` mutation."""
input CreateApiKeyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`ApiKey\` to be created by this mutation."""
  apiKey: ApiKeyInput!
}

"""An input for mutations affecting \`ApiKey\`"""
input ApiKeyInput {
  rowId: UUID
  userId: UUID!
  workspaceId: UUID
  keyHash: String!
  keyHint: String!
  name: String!
  mode: String
  lastUsedAt: Datetime
  expiresAt: Datetime
  revokedAt: Datetime
  createdAt: Datetime
  updatedAt: Datetime
}

"""The output of our create \`UsageEvent\` mutation."""
type CreateUsageEventPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`UsageEvent\` that was created by this mutation."""
  usageEvent: UsageEvent

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`UsageEvent\`. May be used by Relay 1."""
  usageEventEdge(
    """The method to use when ordering \`UsageEvent\`."""
    orderBy: [UsageEventOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UsageEventEdge
}

"""All input for the create \`UsageEvent\` mutation."""
input CreateUsageEventInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """The \`UsageEvent\` to be created by this mutation."""
  usageEvent: UsageEventInput!
}

"""An input for mutations affecting \`UsageEvent\`"""
input UsageEventInput {
  rowId: UUID
  userId: UUID!
  workspaceId: UUID
  apiKeyId: UUID!
  provider: String!
  model: String!
  inputTokens: Int
  outputTokens: Int
  costCents: Int
  mode: String!
  createdAt: Datetime
}

"""The output of our update \`ProviderKey\` mutation."""
type UpdateProviderKeyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ProviderKey\` that was updated by this mutation."""
  providerKey: ProviderKey

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ProviderKey\`. May be used by Relay 1."""
  providerKeyEdge(
    """The method to use when ordering \`ProviderKey\`."""
    orderBy: [ProviderKeyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ProviderKeyEdge
}

"""All input for the \`updateProviderKeyById\` mutation."""
input UpdateProviderKeyByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`ProviderKey\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`ProviderKey\` being updated.
  """
  patch: ProviderKeyPatch!
}

"""
Represents an update to a \`ProviderKey\`. Fields that are set will be updated.
"""
input ProviderKeyPatch {
  rowId: UUID
  userId: UUID
  provider: String
  encryptedKey: String
  keyHint: String
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updateProviderKey\` mutation."""
input UpdateProviderKeyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`ProviderKey\` being updated.
  """
  patch: ProviderKeyPatch!
}

"""The output of our update \`User\` mutation."""
type UpdateUserPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`User\` that was updated by this mutation."""
  user: User

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`User\`. May be used by Relay 1."""
  userEdge(
    """The method to use when ordering \`User\`."""
    orderBy: [UserOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UserEdge
}

"""All input for the \`updateUserById\` mutation."""
input UpdateUserByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`User\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`User\` being updated.
  """
  patch: UserPatch!
}

"""Represents an update to a \`User\`. Fields that are set will be updated."""
input UserPatch {
  rowId: UUID
  identityProviderId: UUID
  createdAt: Datetime
  updatedAt: Datetime
  email: String
  name: String
  avatarUrl: String
}

"""All input for the \`updateUser\` mutation."""
input UpdateUserInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`User\` being updated.
  """
  patch: UserPatch!
}

"""All input for the \`updateUserByIdentityProviderId\` mutation."""
input UpdateUserByIdentityProviderIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  identityProviderId: UUID!

  """
  An object where the defined keys will be set on the \`User\` being updated.
  """
  patch: UserPatch!
}

"""The output of our update \`ApiKey\` mutation."""
type UpdateApiKeyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ApiKey\` that was updated by this mutation."""
  apiKey: ApiKey

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ApiKey\`. May be used by Relay 1."""
  apiKeyEdge(
    """The method to use when ordering \`ApiKey\`."""
    orderBy: [ApiKeyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ApiKeyEdge
}

"""All input for the \`updateApiKeyById\` mutation."""
input UpdateApiKeyByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`ApiKey\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`ApiKey\` being updated.
  """
  patch: ApiKeyPatch!
}

"""
Represents an update to a \`ApiKey\`. Fields that are set will be updated.
"""
input ApiKeyPatch {
  rowId: UUID
  userId: UUID
  workspaceId: UUID
  keyHash: String
  keyHint: String
  name: String
  mode: String
  lastUsedAt: Datetime
  expiresAt: Datetime
  revokedAt: Datetime
  createdAt: Datetime
  updatedAt: Datetime
}

"""All input for the \`updateApiKey\` mutation."""
input UpdateApiKeyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`ApiKey\` being updated.
  """
  patch: ApiKeyPatch!
}

"""All input for the \`updateApiKeyByKeyHash\` mutation."""
input UpdateApiKeyByKeyHashInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  keyHash: String!

  """
  An object where the defined keys will be set on the \`ApiKey\` being updated.
  """
  patch: ApiKeyPatch!
}

"""The output of our update \`UsageEvent\` mutation."""
type UpdateUsageEventPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`UsageEvent\` that was updated by this mutation."""
  usageEvent: UsageEvent

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`UsageEvent\`. May be used by Relay 1."""
  usageEventEdge(
    """The method to use when ordering \`UsageEvent\`."""
    orderBy: [UsageEventOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UsageEventEdge
}

"""All input for the \`updateUsageEventById\` mutation."""
input UpdateUsageEventByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`UsageEvent\` to be updated.
  """
  id: ID!

  """
  An object where the defined keys will be set on the \`UsageEvent\` being updated.
  """
  patch: UsageEventPatch!
}

"""
Represents an update to a \`UsageEvent\`. Fields that are set will be updated.
"""
input UsageEventPatch {
  rowId: UUID
  userId: UUID
  workspaceId: UUID
  apiKeyId: UUID
  provider: String
  model: String
  inputTokens: Int
  outputTokens: Int
  costCents: Int
  mode: String
  createdAt: Datetime
}

"""All input for the \`updateUsageEvent\` mutation."""
input UpdateUsageEventInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!

  """
  An object where the defined keys will be set on the \`UsageEvent\` being updated.
  """
  patch: UsageEventPatch!
}

"""The output of our delete \`ProviderKey\` mutation."""
type DeleteProviderKeyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ProviderKey\` that was deleted by this mutation."""
  providerKey: ProviderKey
  deletedProviderKeyId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ProviderKey\`. May be used by Relay 1."""
  providerKeyEdge(
    """The method to use when ordering \`ProviderKey\`."""
    orderBy: [ProviderKeyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ProviderKeyEdge
}

"""All input for the \`deleteProviderKeyById\` mutation."""
input DeleteProviderKeyByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`ProviderKey\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteProviderKey\` mutation."""
input DeleteProviderKeyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""The output of our delete \`User\` mutation."""
type DeleteUserPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`User\` that was deleted by this mutation."""
  user: User
  deletedUserId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`User\`. May be used by Relay 1."""
  userEdge(
    """The method to use when ordering \`User\`."""
    orderBy: [UserOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UserEdge
}

"""All input for the \`deleteUserById\` mutation."""
input DeleteUserByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`User\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteUser\` mutation."""
input DeleteUserInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""All input for the \`deleteUserByIdentityProviderId\` mutation."""
input DeleteUserByIdentityProviderIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  identityProviderId: UUID!
}

"""The output of our delete \`ApiKey\` mutation."""
type DeleteApiKeyPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`ApiKey\` that was deleted by this mutation."""
  apiKey: ApiKey
  deletedApiKeyId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`ApiKey\`. May be used by Relay 1."""
  apiKeyEdge(
    """The method to use when ordering \`ApiKey\`."""
    orderBy: [ApiKeyOrderBy!]! = [PRIMARY_KEY_ASC]
  ): ApiKeyEdge
}

"""All input for the \`deleteApiKeyById\` mutation."""
input DeleteApiKeyByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`ApiKey\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteApiKey\` mutation."""
input DeleteApiKeyInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
}

"""All input for the \`deleteApiKeyByKeyHash\` mutation."""
input DeleteApiKeyByKeyHashInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  keyHash: String!
}

"""The output of our delete \`UsageEvent\` mutation."""
type DeleteUsageEventPayload {
  """
  The exact same \`clientMutationId\` that was provided in the mutation input,
  unchanged and unused. May be used by a client to track mutations.
  """
  clientMutationId: String

  """The \`UsageEvent\` that was deleted by this mutation."""
  usageEvent: UsageEvent
  deletedUsageEventId: ID

  """
  Our root query field type. Allows us to run any query from our mutation payload.
  """
  query: Query

  """An edge for our \`UsageEvent\`. May be used by Relay 1."""
  usageEventEdge(
    """The method to use when ordering \`UsageEvent\`."""
    orderBy: [UsageEventOrderBy!]! = [PRIMARY_KEY_ASC]
  ): UsageEventEdge
}

"""All input for the \`deleteUsageEventById\` mutation."""
input DeleteUsageEventByIdInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String

  """
  The globally unique \`ID\` which will identify a single \`UsageEvent\` to be deleted.
  """
  id: ID!
}

"""All input for the \`deleteUsageEvent\` mutation."""
input DeleteUsageEventInput {
  """
  An arbitrary string value with no semantic meaning. Will be included in the
  payload verbatim. May be used to track mutations by the client.
  """
  clientMutationId: String
  rowId: UUID!
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
        return resource_api_keyPgResource.get({
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
        return resource_api_keyPgResource.get({
          key_hash: $keyHash
        });
      },
      apiKeys: {
        plan() {
          return connection(resource_api_keyPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed3(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      id($parent) {
        const specifier = nodeIdHandler_Query.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_Query.codec.name].encode);
      },
      node(_$root, fieldArgs) {
        return fieldArgs.getRaw("id");
      },
      providerKey(_$root, {
        $rowId
      }) {
        return resource_provider_keyPgResource.get({
          id: $rowId
        });
      },
      providerKeyById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_ProviderKey($nodeId);
      },
      providerKeys: {
        plan() {
          return connection(resource_provider_keyPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      query() {
        return rootValue();
      },
      usageEvent(_$root, {
        $rowId
      }) {
        return resource_usage_eventPgResource.get({
          id: $rowId
        });
      },
      usageEventById(_$parent, args) {
        const $nodeId = args.getRaw("id");
        return nodeFetcher_UsageEvent($nodeId);
      },
      usageEvents: {
        plan() {
          return connection(resource_usage_eventPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed4(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      user(_$root, {
        $rowId
      }) {
        return resource_userPgResource.get({
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
        return resource_userPgResource.get({
          identity_provider_id: $identityProviderId
        });
      },
      users: {
        plan() {
          return connection(resource_userPgResource.find());
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed2(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      }
    }
  },
  Mutation: {
    assertStep: __ValueStep,
    plans: {
      createApiKey: {
        plan(_, args) {
          const $insert = pgInsertSingle(resource_api_keyPgResource, Object.create(null));
          args.apply($insert);
          return object({
            result: $insert
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      createProviderKey: {
        plan(_, args) {
          const $insert = pgInsertSingle(resource_provider_keyPgResource, Object.create(null));
          args.apply($insert);
          return object({
            result: $insert
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      createUsageEvent: {
        plan(_, args) {
          const $insert = pgInsertSingle(resource_usage_eventPgResource, Object.create(null));
          args.apply($insert);
          return object({
            result: $insert
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      createUser: {
        plan(_, args) {
          const $insert = pgInsertSingle(resource_userPgResource, Object.create(null));
          args.apply($insert);
          return object({
            result: $insert
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteApiKey: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_api_keyPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteApiKeyById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_api_keyPgResource, specFromArgs_ApiKey2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteApiKeyByKeyHash: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_api_keyPgResource, {
            key_hash: args.getRaw(['input', "keyHash"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteProviderKey: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_provider_keyPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteProviderKeyById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_provider_keyPgResource, specFromArgs_ProviderKey2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteUsageEvent: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_usage_eventPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteUsageEventById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_usage_eventPgResource, specFromArgs_UsageEvent2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteUser: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_userPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteUserById: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_userPgResource, specFromArgs_User2(args));
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      deleteUserByIdentityProviderId: {
        plan(_$root, args) {
          const $delete = pgDeleteSingle(resource_userPgResource, {
            identity_provider_id: args.getRaw(['input', "identityProviderId"])
          });
          args.apply($delete);
          return object({
            result: $delete
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateApiKey: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_api_keyPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateApiKeyById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_api_keyPgResource, specFromArgs_ApiKey(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateApiKeyByKeyHash: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_api_keyPgResource, {
            key_hash: args.getRaw(['input', "keyHash"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateProviderKey: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_provider_keyPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateProviderKeyById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_provider_keyPgResource, specFromArgs_ProviderKey(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateUsageEvent: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_usage_eventPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateUsageEventById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_usage_eventPgResource, specFromArgs_UsageEvent(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateUser: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_userPgResource, {
            id: args.getRaw(['input', "rowId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateUserById: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_userPgResource, specFromArgs_User(args));
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      },
      updateUserByIdentityProviderId: {
        plan(_$root, args) {
          const $update = pgUpdateSingle(resource_userPgResource, {
            identity_provider_id: args.getRaw(['input', "identityProviderId"])
          });
          args.apply($update);
          return object({
            result: $update
          });
        },
        args: {
          input(_, $object) {
            return $object;
          }
        }
      }
    }
  },
  ApiKey: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt($record) {
        return $record.get("created_at");
      },
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
      keyHint($record) {
        return $record.get("key_hint");
      },
      lastUsedAt($record) {
        return $record.get("last_used_at");
      },
      revokedAt($record) {
        return $record.get("revoked_at");
      },
      rowId($record) {
        return $record.get("id");
      },
      updatedAt($record) {
        return $record.get("updated_at");
      },
      usageEvents: {
        plan($record) {
          const $records = resource_usage_eventPgResource.find({
            api_key_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed8(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      user($record) {
        return resource_userPgResource.get({
          id: $record.get("user_id")
        });
      },
      userId($record) {
        return $record.get("user_id");
      },
      workspaceId($record) {
        return $record.get("workspace_id");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of api_keyUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return resource_api_keyPgResource.get(spec);
    }
  },
  ApiKeyConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
    }
  },
  CreateApiKeyPayload: {
    assertStep: assertExecutableStep,
    plans: {
      apiKey($object) {
        return $object.get("result");
      },
      apiKeyEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_api_keyPgResource, api_keyUniques[0].attributes, $mutation, fieldArgs);
      },
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      }
    }
  },
  CreateProviderKeyPayload: {
    assertStep: assertExecutableStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      providerKey($object) {
        return $object.get("result");
      },
      providerKeyEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_provider_keyPgResource, provider_keyUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  CreateUsageEventPayload: {
    assertStep: assertExecutableStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      usageEvent($object) {
        return $object.get("result");
      },
      usageEventEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_usage_eventPgResource, usage_eventUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  CreateUserPayload: {
    assertStep: assertExecutableStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      user($object) {
        return $object.get("result");
      },
      userEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_userPgResource, userUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  DeleteApiKeyPayload: {
    assertStep: ObjectStep,
    plans: {
      apiKey($object) {
        return $object.get("result");
      },
      apiKeyEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_api_keyPgResource, api_keyUniques[0].attributes, $mutation, fieldArgs);
      },
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedApiKeyId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_ApiKey.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      query() {
        return rootValue();
      }
    }
  },
  DeleteProviderKeyPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedProviderKeyId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_ProviderKey.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      providerKey($object) {
        return $object.get("result");
      },
      providerKeyEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_provider_keyPgResource, provider_keyUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  DeleteUsageEventPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedUsageEventId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_UsageEvent.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      query() {
        return rootValue();
      },
      usageEvent($object) {
        return $object.get("result");
      },
      usageEventEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_usage_eventPgResource, usage_eventUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  DeleteUserPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      deletedUserId($object) {
        const $record = $object.getStepForKey("result"),
          specifier = nodeIdHandler_User.plan($record);
        return lambda(specifier, nodeIdCodecs_base64JSON_base64JSON.encode);
      },
      query() {
        return rootValue();
      },
      user($object) {
        return $object.get("result");
      },
      userEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_userPgResource, userUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  ProviderKey: {
    assertStep: assertPgClassSingleStep,
    plans: {
      createdAt($record) {
        return $record.get("created_at");
      },
      encryptedKey($record) {
        return $record.get("encrypted_key");
      },
      id($parent) {
        const specifier = nodeIdHandler_ProviderKey.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_ProviderKey.codec.name].encode);
      },
      keyHint($record) {
        return $record.get("key_hint");
      },
      rowId($record) {
        return $record.get("id");
      },
      updatedAt($record) {
        return $record.get("updated_at");
      },
      user($record) {
        return resource_userPgResource.get({
          id: $record.get("user_id")
        });
      },
      userId($record) {
        return $record.get("user_id");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of provider_keyUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return resource_provider_keyPgResource.get(spec);
    }
  },
  ProviderKeyConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
    }
  },
  UpdateApiKeyPayload: {
    assertStep: ObjectStep,
    plans: {
      apiKey($object) {
        return $object.get("result");
      },
      apiKeyEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_api_keyPgResource, api_keyUniques[0].attributes, $mutation, fieldArgs);
      },
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      }
    }
  },
  UpdateProviderKeyPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      providerKey($object) {
        return $object.get("result");
      },
      providerKeyEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_provider_keyPgResource, provider_keyUniques[0].attributes, $mutation, fieldArgs);
      },
      query() {
        return rootValue();
      }
    }
  },
  UpdateUsageEventPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      usageEvent($object) {
        return $object.get("result");
      },
      usageEventEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_usage_eventPgResource, usage_eventUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  UpdateUserPayload: {
    assertStep: ObjectStep,
    plans: {
      clientMutationId($mutation) {
        return $mutation.getStepForKey("result").getMeta("clientMutationId");
      },
      query() {
        return rootValue();
      },
      user($object) {
        return $object.get("result");
      },
      userEdge($mutation, fieldArgs) {
        return pgMutationPayloadEdge(resource_userPgResource, userUniques[0].attributes, $mutation, fieldArgs);
      }
    }
  },
  UsageEvent: {
    assertStep: assertPgClassSingleStep,
    plans: {
      apiKey($record) {
        return resource_api_keyPgResource.get({
          id: $record.get("api_key_id")
        });
      },
      apiKeyId($record) {
        return $record.get("api_key_id");
      },
      costCents($record) {
        return $record.get("cost_cents");
      },
      createdAt($record) {
        return $record.get("created_at");
      },
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
      rowId($record) {
        return $record.get("id");
      },
      user($record) {
        return resource_userPgResource.get({
          id: $record.get("user_id")
        });
      },
      userId($record) {
        return $record.get("user_id");
      },
      workspaceId($record) {
        return $record.get("workspace_id");
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of usage_eventUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return resource_usage_eventPgResource.get(spec);
    }
  },
  UsageEventConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
    }
  },
  User: {
    assertStep: assertPgClassSingleStep,
    plans: {
      apiKeys: {
        plan($record) {
          const $records = resource_api_keyPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed5(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      avatarUrl($record) {
        return $record.get("avatar_url");
      },
      createdAt($record) {
        return $record.get("created_at");
      },
      id($parent) {
        const specifier = nodeIdHandler_User.plan($parent);
        return lambda(specifier, nodeIdCodecs[nodeIdHandler_User.codec.name].encode);
      },
      identityProviderId($record) {
        return $record.get("identity_provider_id");
      },
      providerKeys: {
        plan($record) {
          const $records = resource_provider_keyPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed6(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      },
      rowId($record) {
        return $record.get("id");
      },
      updatedAt($record) {
        return $record.get("updated_at");
      },
      usageEvents: {
        plan($record) {
          const $records = resource_usage_eventPgResource.find({
            user_id: $record.get("id")
          });
          return connection($records);
        },
        args: {
          first(_, $connection, arg) {
            $connection.setFirst(arg.getRaw());
          },
          last(_, $connection, val) {
            $connection.setLast(val.getRaw());
          },
          offset(_, $connection, val) {
            $connection.setOffset(val.getRaw());
          },
          before(_, $connection, val) {
            $connection.setBefore(val.getRaw());
          },
          after(_, $connection, val) {
            $connection.setAfter(val.getRaw());
          },
          condition(_condition, $connection, arg) {
            const $select = $connection.getSubplan();
            arg.apply($select, qbWhereBuilder);
          },
          filter(_, $connection, fieldArg) {
            const $pgSelect = $connection.getSubplan();
            fieldArg.apply($pgSelect, (queryBuilder, value) => {
              assertAllowed7(value, "object");
              if (value == null) return;
              const condition = new PgCondition(queryBuilder);
              return condition;
            });
          },
          orderBy(parent, $connection, value) {
            const $select = $connection.getSubplan();
            value.apply($select);
          }
        }
      }
    },
    planType($specifier) {
      const spec = Object.create(null);
      for (const pkCol of userUniques[0].attributes) spec[pkCol] = get2($specifier, pkCol);
      return resource_userPgResource.get(spec);
    }
  },
  UserConnection: {
    assertStep: ConnectionStep,
    plans: {
      totalCount($connection) {
        return $connection.cloneSubplanWithoutPagination("aggregate").singleAsRecord().select(sql`count(*)`, TYPES.bigint, !1);
      }
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
        $condition.where({
          type: "attribute",
          attribute: "key_hash",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      rowId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      userId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "user_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      }
    }
  },
  ApiKeyFilter: {
    plans: {
      and($where, value) {
        assertAllowed13(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      keyHash(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec7;
        return condition;
      },
      not($where, value) {
        assertAllowed13(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed13(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      rowId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec5;
        return condition;
      },
      usageEvents($where, value) {
        assertAllowed11(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: usageEventIdentifier,
          alias: resource_usage_eventPgResource.name,
          localAttributes: registryConfig.pgRelations.apiKey.usageEventsByTheirApiKeyId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.apiKey.usageEventsByTheirApiKeyId.remoteAttributes
        };
        return $rel;
      },
      usageEventsExist($where, value) {
        assertAllowed11(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: usageEventIdentifier,
          alias: resource_usage_eventPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.apiKey.usageEventsByTheirApiKeyId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.apiKey.usageEventsByTheirApiKeyId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      user($where, value) {
        assertAllowed12(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: userIdentifier,
          alias: resource_userPgResource.name
        });
        registryConfig.pgRelations.apiKey.userByMyUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.apiKey.userByMyUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      userId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec6;
        return condition;
      }
    }
  },
  ApiKeyInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      expiresAt(obj, val, {
        field,
        schema
      }) {
        obj.set("expires_at", bakedInputRuntime(schema, field.type, val));
      },
      keyHash(obj, val, {
        field,
        schema
      }) {
        obj.set("key_hash", bakedInputRuntime(schema, field.type, val));
      },
      keyHint(obj, val, {
        field,
        schema
      }) {
        obj.set("key_hint", bakedInputRuntime(schema, field.type, val));
      },
      lastUsedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("last_used_at", bakedInputRuntime(schema, field.type, val));
      },
      mode(obj, val, {
        field,
        schema
      }) {
        obj.set("mode", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      revokedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("revoked_at", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      },
      workspaceId(obj, val, {
        field,
        schema
      }) {
        obj.set("workspace_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  ApiKeyPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      expiresAt(obj, val, {
        field,
        schema
      }) {
        obj.set("expires_at", bakedInputRuntime(schema, field.type, val));
      },
      keyHash(obj, val, {
        field,
        schema
      }) {
        obj.set("key_hash", bakedInputRuntime(schema, field.type, val));
      },
      keyHint(obj, val, {
        field,
        schema
      }) {
        obj.set("key_hint", bakedInputRuntime(schema, field.type, val));
      },
      lastUsedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("last_used_at", bakedInputRuntime(schema, field.type, val));
      },
      mode(obj, val, {
        field,
        schema
      }) {
        obj.set("mode", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      revokedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("revoked_at", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      },
      workspaceId(obj, val, {
        field,
        schema
      }) {
        obj.set("workspace_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  ApiKeyToManyUsageEventFilter: {
    plans: {
      every($where, value) {
        assertAllowed14(value, "object");
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
      },
      none($where, value) {
        assertAllowed14(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed14(value, "object");
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
        return $subQuery;
      }
    }
  },
  CreateApiKeyInput: {
    plans: {
      apiKey(qb, arg) {
        if (arg != null) return qb.setBuilder();
      },
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  CreateProviderKeyInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      providerKey(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  CreateUsageEventInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      usageEvent(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  CreateUserInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      user(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  DatetimeFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve15(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve13(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve21(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve22(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec6 ? resolveInputCodec6(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve17(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec4 ? resolveInputCodec4(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue2 ? resolveSqlValue2($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve12(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve19(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve20(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve16(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec5 ? resolveInputCodec5(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve14(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier2 ? resolveSqlIdentifier2(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec6 ? resolveInputCodec6(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve18(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  },
  DeleteApiKeyByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteApiKeyByKeyHashInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteApiKeyInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteProviderKeyByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteProviderKeyInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteUsageEventByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteUsageEventInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteUserByIdentityProviderIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteUserByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  DeleteUserInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      }
    }
  },
  ProviderKeyCondition: {
    plans: {
      provider($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "provider",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.text)}`;
          }
        });
      },
      rowId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      userId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "user_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      }
    }
  },
  ProviderKeyFilter: {
    plans: {
      and($where, value) {
        assertAllowed20(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      not($where, value) {
        assertAllowed20(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed20(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      provider(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec12;
        return condition;
      },
      rowId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec10;
        return condition;
      },
      user($where, value) {
        assertAllowed19(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: userIdentifier,
          alias: resource_userPgResource.name
        });
        registryConfig.pgRelations.providerKey.userByMyUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.providerKey.userByMyUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      userId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec11;
        return condition;
      }
    }
  },
  ProviderKeyInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      encryptedKey(obj, val, {
        field,
        schema
      }) {
        obj.set("encrypted_key", bakedInputRuntime(schema, field.type, val));
      },
      keyHint(obj, val, {
        field,
        schema
      }) {
        obj.set("key_hint", bakedInputRuntime(schema, field.type, val));
      },
      provider(obj, val, {
        field,
        schema
      }) {
        obj.set("provider", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  ProviderKeyPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      encryptedKey(obj, val, {
        field,
        schema
      }) {
        obj.set("encrypted_key", bakedInputRuntime(schema, field.type, val));
      },
      keyHint(obj, val, {
        field,
        schema
      }) {
        obj.set("key_hint", bakedInputRuntime(schema, field.type, val));
      },
      provider(obj, val, {
        field,
        schema
      }) {
        obj.set("provider", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  StringFilter: {
    plans: {
      distinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve26(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      distinctFromInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier7 ? resolveSqlIdentifier7(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec13 ? resolveInputCodec13(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue6 ? resolveSqlValue6($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve26(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFromInsensitive"
          });
        $where.where(fragment);
      },
      endsWith($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput9 ? resolveInput9(value) : value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve42(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "endsWith"
          });
        $where.where(fragment);
      },
      endsWithInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput11 ? resolveInput11(value) : value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve44(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "endsWithInsensitive"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve24(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      equalToInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier5 ? resolveSqlIdentifier5(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec11 ? resolveInputCodec11(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue4 ? resolveSqlValue4($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve24(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalToInsensitive"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve32(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier13 ? resolveSqlIdentifier13(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec19 ? resolveInputCodec19(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue12 ? resolveSqlValue12($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve32(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanInsensitive"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve33(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualToInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier14 ? resolveSqlIdentifier14(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec20 ? resolveInputCodec20(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue13 ? resolveSqlValue13($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve33(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualToInsensitive"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec9 ? resolveInputCodec9(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve28(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      includes($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput ? resolveInput(value) : value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve34(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "includes"
          });
        $where.where(fragment);
      },
      includesInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput3 ? resolveInput3(value) : value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve36(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "includesInsensitive"
          });
        $where.where(fragment);
      },
      inInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier9 ? resolveSqlIdentifier9(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec15 ? resolveInputCodec15(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue8 ? resolveSqlValue8($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve28(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "inInsensitive"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec7 ? resolveInputCodec7(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue3 ? resolveSqlValue3($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve23(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve30(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier11 ? resolveSqlIdentifier11(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec17 ? resolveInputCodec17(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue10 ? resolveSqlValue10($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve30(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanInsensitive"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve31(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      lessThanOrEqualToInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier12 ? resolveSqlIdentifier12(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec18 ? resolveInputCodec18(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue11 ? resolveSqlValue11($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve31(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualToInsensitive"
          });
        $where.where(fragment);
      },
      like($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve46(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "like"
          });
        $where.where(fragment);
      },
      likeInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve48(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "likeInsensitive"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve27(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notDistinctFromInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier8 ? resolveSqlIdentifier8(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec14 ? resolveInputCodec14(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue7 ? resolveSqlValue7($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve27(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFromInsensitive"
          });
        $where.where(fragment);
      },
      notEndsWith($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput10 ? resolveInput10(value) : value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve43(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEndsWith"
          });
        $where.where(fragment);
      },
      notEndsWithInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput12 ? resolveInput12(value) : value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve45(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEndsWithInsensitive"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve25(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notEqualToInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier6 ? resolveSqlIdentifier6(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec12 ? resolveInputCodec12(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue5 ? resolveSqlValue5($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve25(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualToInsensitive"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec9 ? resolveInputCodec9(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve29(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      },
      notIncludes($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput2 ? resolveInput2(value) : value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve35(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIncludes"
          });
        $where.where(fragment);
      },
      notIncludesInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput4 ? resolveInput4(value) : value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve37(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIncludesInsensitive"
          });
        $where.where(fragment);
      },
      notInInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier10 ? resolveSqlIdentifier10(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec16 ? resolveInputCodec16(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue9 ? resolveSqlValue9($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve29(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notInInsensitive"
          });
        $where.where(fragment);
      },
      notLike($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve47(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notLike"
          });
        $where.where(fragment);
      },
      notLikeInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve49(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notLikeInsensitive"
          });
        $where.where(fragment);
      },
      notStartsWith($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput6 ? resolveInput6(value) : value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve39(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notStartsWith"
          });
        $where.where(fragment);
      },
      notStartsWithInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput8 ? resolveInput8(value) : value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve41(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notStartsWithInsensitive"
          });
        $where.where(fragment);
      },
      startsWith($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier3 ? resolveSqlIdentifier3(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput5 ? resolveInput5(value) : value,
          inputCodec = resolveInputCodec8 ? resolveInputCodec8(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve38(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "startsWith"
          });
        $where.where(fragment);
      },
      startsWithInsensitive($where, value) {
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
          [sqlIdentifier, identifierCodec] = resolveSqlIdentifier4 ? resolveSqlIdentifier4(sourceAlias, sourceCodec) : [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = resolveInput7 ? resolveInput7(value) : value,
          inputCodec = resolveInputCodec10 ? resolveInputCodec10(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve40(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "startsWithInsensitive"
          });
        $where.where(fragment);
      }
    }
  },
  UpdateApiKeyByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateApiKeyByKeyHashInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateApiKeyInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateProviderKeyByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateProviderKeyInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateUsageEventByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateUsageEventInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateUserByIdentityProviderIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateUserByIdInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UpdateUserInput: {
    plans: {
      clientMutationId(qb, val) {
        qb.setMeta("clientMutationId", val);
      },
      patch(qb, arg) {
        if (arg != null) return qb.setBuilder();
      }
    }
  },
  UsageEventCondition: {
    plans: {
      apiKeyId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "api_key_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      createdAt($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "created_at",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.timestamptz)}`;
          }
        });
      },
      rowId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      userId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "user_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      }
    }
  },
  UsageEventFilter: {
    plans: {
      and($where, value) {
        assertAllowed10(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      apiKey($where, value) {
        assertAllowed9(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: apiKeyIdentifier,
          alias: resource_api_keyPgResource.name
        });
        registryConfig.pgRelations.usageEvent.apiKeyByMyApiKeyId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.usageEvent.apiKeyByMyApiKeyId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      apiKeyId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec3;
        return condition;
      },
      createdAt(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec4;
        return condition;
      },
      not($where, value) {
        assertAllowed10(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed10(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      rowId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec;
        return condition;
      },
      user($where, value) {
        assertAllowed9(value, "object");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: userIdentifier,
          alias: resource_userPgResource.name
        });
        registryConfig.pgRelations.usageEvent.userByMyUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.usageEvent.userByMyUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
        return $subQuery;
      },
      userId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec2;
        return condition;
      }
    }
  },
  UsageEventInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      apiKeyId(obj, val, {
        field,
        schema
      }) {
        obj.set("api_key_id", bakedInputRuntime(schema, field.type, val));
      },
      costCents(obj, val, {
        field,
        schema
      }) {
        obj.set("cost_cents", bakedInputRuntime(schema, field.type, val));
      },
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      inputTokens(obj, val, {
        field,
        schema
      }) {
        obj.set("input_tokens", bakedInputRuntime(schema, field.type, val));
      },
      mode(obj, val, {
        field,
        schema
      }) {
        obj.set("mode", bakedInputRuntime(schema, field.type, val));
      },
      model(obj, val, {
        field,
        schema
      }) {
        obj.set("model", bakedInputRuntime(schema, field.type, val));
      },
      outputTokens(obj, val, {
        field,
        schema
      }) {
        obj.set("output_tokens", bakedInputRuntime(schema, field.type, val));
      },
      provider(obj, val, {
        field,
        schema
      }) {
        obj.set("provider", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      },
      workspaceId(obj, val, {
        field,
        schema
      }) {
        obj.set("workspace_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  UsageEventPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      apiKeyId(obj, val, {
        field,
        schema
      }) {
        obj.set("api_key_id", bakedInputRuntime(schema, field.type, val));
      },
      costCents(obj, val, {
        field,
        schema
      }) {
        obj.set("cost_cents", bakedInputRuntime(schema, field.type, val));
      },
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      inputTokens(obj, val, {
        field,
        schema
      }) {
        obj.set("input_tokens", bakedInputRuntime(schema, field.type, val));
      },
      mode(obj, val, {
        field,
        schema
      }) {
        obj.set("mode", bakedInputRuntime(schema, field.type, val));
      },
      model(obj, val, {
        field,
        schema
      }) {
        obj.set("model", bakedInputRuntime(schema, field.type, val));
      },
      outputTokens(obj, val, {
        field,
        schema
      }) {
        obj.set("output_tokens", bakedInputRuntime(schema, field.type, val));
      },
      provider(obj, val, {
        field,
        schema
      }) {
        obj.set("provider", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      userId(obj, val, {
        field,
        schema
      }) {
        obj.set("user_id", bakedInputRuntime(schema, field.type, val));
      },
      workspaceId(obj, val, {
        field,
        schema
      }) {
        obj.set("workspace_id", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  UserCondition: {
    plans: {
      identityProviderId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "identity_provider_id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      },
      rowId($condition, val) {
        $condition.where({
          type: "attribute",
          attribute: "id",
          callback(expression) {
            return val === null ? sql`${expression} is null` : sql`${expression} = ${sqlValueWithCodec(val, TYPES.uuid)}`;
          }
        });
      }
    }
  },
  UserFilter: {
    plans: {
      and($where, value) {
        assertAllowed16(value, "list");
        if (value == null) return;
        return $where.andPlan();
      },
      apiKeys($where, value) {
        assertAllowed15(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: apiKeyIdentifier,
          alias: resource_api_keyPgResource.name,
          localAttributes: registryConfig.pgRelations.user.apiKeysByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.apiKeysByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      apiKeysExist($where, value) {
        assertAllowed15(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: apiKeyIdentifier,
          alias: resource_api_keyPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.apiKeysByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.apiKeysByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      identityProviderId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec9;
        return condition;
      },
      not($where, value) {
        assertAllowed16(value, "object");
        if (value == null) return;
        return $where.notPlan().andPlan();
      },
      or($where, value) {
        assertAllowed16(value, "list");
        if (value == null) return;
        const $or = $where.orPlan();
        return () => $or.andPlan();
      },
      providerKeys($where, value) {
        assertAllowed15(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: providerKeyIdentifier,
          alias: resource_provider_keyPgResource.name,
          localAttributes: registryConfig.pgRelations.user.providerKeysByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.providerKeysByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      providerKeysExist($where, value) {
        assertAllowed15(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: providerKeyIdentifier,
          alias: resource_provider_keyPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.providerKeysByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.providerKeysByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      },
      rowId(queryBuilder, value) {
        if (value === void 0) return;
        if (!false && isEmpty(value)) throw Object.assign(Error("Empty objects are forbidden in filter argument input."), {});
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const condition = new PgCondition(queryBuilder);
        condition.extensions.pgFilterAttribute = colSpec8;
        return condition;
      },
      usageEvents($where, value) {
        assertAllowed15(value, "object");
        const $rel = $where.andPlan();
        $rel.extensions.pgFilterRelation = {
          tableExpression: usageEventIdentifier,
          alias: resource_usage_eventPgResource.name,
          localAttributes: registryConfig.pgRelations.user.usageEventsByTheirUserId.localAttributes,
          remoteAttributes: registryConfig.pgRelations.user.usageEventsByTheirUserId.remoteAttributes
        };
        return $rel;
      },
      usageEventsExist($where, value) {
        assertAllowed15(value, "scalar");
        if (value == null) return;
        const $subQuery = $where.existsPlan({
          tableExpression: usageEventIdentifier,
          alias: resource_usage_eventPgResource.name,
          equals: value
        });
        registryConfig.pgRelations.user.usageEventsByTheirUserId.localAttributes.forEach((localAttribute, i) => {
          const remoteAttribute = registryConfig.pgRelations.user.usageEventsByTheirUserId.remoteAttributes[i];
          $subQuery.where(sql`${$where.alias}.${sql.identifier(localAttribute)} = ${$subQuery.alias}.${sql.identifier(remoteAttribute)}`);
        });
      }
    }
  },
  UserInput: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl(obj, val, {
        field,
        schema
      }) {
        obj.set("avatar_url", bakedInputRuntime(schema, field.type, val));
      },
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      email(obj, val, {
        field,
        schema
      }) {
        obj.set("email", bakedInputRuntime(schema, field.type, val));
      },
      identityProviderId(obj, val, {
        field,
        schema
      }) {
        obj.set("identity_provider_id", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  UserPatch: {
    baked: createObjectAndApplyChildren,
    plans: {
      avatarUrl(obj, val, {
        field,
        schema
      }) {
        obj.set("avatar_url", bakedInputRuntime(schema, field.type, val));
      },
      createdAt(obj, val, {
        field,
        schema
      }) {
        obj.set("created_at", bakedInputRuntime(schema, field.type, val));
      },
      email(obj, val, {
        field,
        schema
      }) {
        obj.set("email", bakedInputRuntime(schema, field.type, val));
      },
      identityProviderId(obj, val, {
        field,
        schema
      }) {
        obj.set("identity_provider_id", bakedInputRuntime(schema, field.type, val));
      },
      name(obj, val, {
        field,
        schema
      }) {
        obj.set("name", bakedInputRuntime(schema, field.type, val));
      },
      rowId(obj, val, {
        field,
        schema
      }) {
        obj.set("id", bakedInputRuntime(schema, field.type, val));
      },
      updatedAt(obj, val, {
        field,
        schema
      }) {
        obj.set("updated_at", bakedInputRuntime(schema, field.type, val));
      }
    }
  },
  UserToManyApiKeyFilter: {
    plans: {
      every($where, value) {
        assertAllowed17(value, "object");
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
      },
      none($where, value) {
        assertAllowed17(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed17(value, "object");
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
        return $subQuery;
      }
    }
  },
  UserToManyProviderKeyFilter: {
    plans: {
      every($where, value) {
        assertAllowed18(value, "object");
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
      },
      none($where, value) {
        assertAllowed18(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed18(value, "object");
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
        return $subQuery;
      }
    }
  },
  UserToManyUsageEventFilter: {
    plans: {
      every($where, value) {
        assertAllowed21(value, "object");
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
      },
      none($where, value) {
        assertAllowed21(value, "object");
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
        return $subQuery;
      },
      some($where, value) {
        assertAllowed21(value, "object");
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
        return $subQuery;
      }
    }
  },
  UUIDFilter: {
    plans: {
      distinctFrom($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve4(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "distinctFrom"
          });
        $where.where(fragment);
      },
      equalTo($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve2(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "equalTo"
          });
        $where.where(fragment);
      },
      greaterThan($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve10(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThan"
          });
        $where.where(fragment);
      },
      greaterThanOrEqualTo($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve11(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "greaterThanOrEqualTo"
          });
        $where.where(fragment);
      },
      in($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec3 ? resolveInputCodec3(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve6(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "in"
          });
        $where.where(fragment);
      },
      isNull($where, value) {
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
          [sqlIdentifier, identifierCodec] = [sourceAlias, sourceCodec];
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec ? resolveInputCodec(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = resolveSqlValue ? resolveSqlValue($where, value, inputCodec) : sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "isNull"
          });
        $where.where(fragment);
      },
      lessThan($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve8(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThan"
          });
        $where.where(fragment);
      },
      lessThanOrEqualTo($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve9(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "lessThanOrEqualTo"
          });
        $where.where(fragment);
      },
      notDistinctFrom($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve5(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notDistinctFrom"
          });
        $where.where(fragment);
      },
      notEqualTo($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec2 ? resolveInputCodec2(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve3(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notEqualTo"
          });
        $where.where(fragment);
      },
      notIn($where, value) {
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
        if (false && value === null) return;
        if (!false && value === null) throw Object.assign(Error("Null literals are forbidden in filter argument input."), {});
        const resolvedInput = value,
          inputCodec = resolveInputCodec3 ? resolveInputCodec3(codec ?? attribute.codec) : codec ?? attribute.codec,
          sqlValue = sqlValueWithCodec(resolvedInput, inputCodec),
          fragment = resolve7(sqlIdentifier, sqlValue, value, $where, {
            fieldName: parentFieldName ?? null,
            operatorName: "notIn"
          });
        $where.where(fragment);
      }
    }
  }
};
export const scalars = {
  Cursor: {
    serialize: UUIDSerialize,
    parseValue: UUIDSerialize,
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new GraphQLError(`${"Cursor" ?? "This scalar"} can only parse string values (kind='${ast.kind}')`);
      return ast.value;
    }
  },
  Datetime: {
    serialize: UUIDSerialize,
    parseValue: UUIDSerialize,
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new GraphQLError(`${"Datetime" ?? "This scalar"} can only parse string values (kind='${ast.kind}')`);
      return ast.value;
    }
  },
  UUID: {
    serialize: UUIDSerialize,
    parseValue(value) {
      return coerce("" + value);
    },
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new GraphQLError(`${"UUID" ?? "This scalar"} can only parse string values (kind = '${ast.kind}')`);
      return coerce(ast.value);
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
      ROW_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      USER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "ASC"
        });
      },
      USER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
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
      ROW_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      USER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "ASC"
        });
      },
      USER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "DESC"
        });
      }
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
      ROW_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
      },
      USER_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "ASC"
        });
      },
      USER_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "user_id",
          direction: "DESC"
        });
      }
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
      ROW_ID_ASC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "ASC"
        });
        queryBuilder.setOrderIsUnique();
      },
      ROW_ID_DESC(queryBuilder) {
        queryBuilder.orderBy({
          attribute: "id",
          direction: "DESC"
        });
        queryBuilder.setOrderIsUnique();
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