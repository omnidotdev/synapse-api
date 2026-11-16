/**
 * Remove the Relay root `node(id)` accessor.
 *
 * It fetches any row of any table by global id, outside every custom,
 * authorized field, so a caller holding (or guessing) an id could read another
 * user's API key metadata, usage or preferences. The `id` field on each type is
 * kept; only the root lookup is dropped
 */
const RemoveQueryNodePlugin: GraphileConfig.Plugin = {
  name: "RemoveQueryNodePlugin",
  version: "1.0.0",
  schema: {
    hooks: {
      GraphQLObjectType_fields(fields, _build, context) {
        if (context.Self.name !== "Query") return fields;

        const mutable = fields as Record<string, unknown>;
        delete mutable.node;

        return fields;
      },
    },
  },
};

export default RemoveQueryNodePlugin;
