/** Cache TTL for positive results (org exists) in milliseconds */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum cache entries before eviction */
const MAX_CACHE_SIZE = 10_000;

/** Cache for organization existence checks */
const orgExistsCache = new Map<
  string,
  { exists: boolean; expiresAt: number }
>();

/**
 * Add an entry to the org cache, evicting all entries if the cache exceeds
 * the maximum size.
 */
const setOrgCacheEntry = (
  key: string,
  value: { exists: boolean; expiresAt: number },
) => {
  if (orgExistsCache.size >= MAX_CACHE_SIZE) {
    orgExistsCache.clear();
  }

  orgExistsCache.set(key, value);
};

export { CACHE_TTL_MS, orgExistsCache, setOrgCacheEntry };
