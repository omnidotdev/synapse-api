/**
 * Product scope for managed keys provisioned by other Omni products.
 *
 * A product (e.g. Facet) provisions a per-end-user managed key so the gateway
 * meters and charges that end user under the product's own Aether app,
 * instead of keeping a local credit ledger. The gateway splices `appId` and
 * the entity into Aether URL paths, so both are validated here at the trust
 * boundary (and again by a DB check constraint)
 */

/** Aether app ids are lowercase slugs (mirrors the `api_key_app_id_slug` check) */
const APP_ID_RE = /^[a-z][a-z0-9-]{0,62}$/;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Entity types Aether bills (mirrors the `api_key_billing_entity_scoped` check) */
const ENTITY_TYPES = ["user", "organization"] as const;

type BillingEntityType = (typeof ENTITY_TYPES)[number];

interface BillingEntity {
  entityType: BillingEntityType;
  entityId: string;
}

export interface ProductScope {
  appId: string;
  billingEntity: BillingEntity;
}

type ScopeResult =
  | { ok: true; scope: ProductScope | null }
  | { ok: false; error: string };

const isEntityType = (value: string): value is BillingEntityType =>
  (ENTITY_TYPES as readonly string[]).includes(value);

/**
 * Validate a provisioning request's product scope.
 *
 * No `appId` means a direct Synapse key (scope `null`). With an `appId` and no
 * entity, the key bills the provisioned user themselves
 */
export const parseProductScope = (input: {
  appId?: string;
  billingEntity?: { entityType: string; entityId: string };
  identityProviderId: string;
}): ScopeResult => {
  if (input.appId === undefined) {
    return input.billingEntity
      ? { ok: false, error: "billingEntity requires appId" }
      : { ok: true, scope: null };
  }

  if (!APP_ID_RE.test(input.appId)) {
    return { ok: false, error: "appId must be a lowercase slug" };
  }

  const entity = input.billingEntity ?? {
    entityType: "user",
    entityId: input.identityProviderId,
  };

  if (!isEntityType(entity.entityType)) {
    return { ok: false, error: "billingEntity.entityType is not supported" };
  }

  if (!UUID_RE.test(entity.entityId)) {
    return { ok: false, error: "billingEntity.entityId must be a UUID" };
  }

  return {
    ok: true,
    scope: {
      appId: input.appId,
      billingEntity: {
        entityType: entity.entityType,
        entityId: entity.entityId,
      },
    },
  };
};

/**
 * Read a stored key's product scope, or `null` for a direct Synapse key.
 *
 * Throws on a half-scoped key rather than treating it as a direct key: billing
 * a product's usage to the gateway's own app would be a silent mis-charge,
 * and the `api_key_billing_entity_scoped` check makes this unreachable
 */
export const storedProductScope = (key: {
  appId: string | null;
  billingEntityType: string | null;
  billingEntityId: string | null;
}): ProductScope | null => {
  if (!key.appId) return null;

  if (
    !key.billingEntityType ||
    !key.billingEntityId ||
    !isEntityType(key.billingEntityType)
  ) {
    throw new Error("product-scoped key is missing a valid billing entity");
  }

  return {
    appId: key.appId,
    billingEntity: {
      entityType: key.billingEntityType,
      entityId: key.billingEntityId,
    },
  };
};
