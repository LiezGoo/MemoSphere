export type LegacyEntryScope = {
  scopeType: string;
  scopeCategories: unknown;
  scopeDateFrom: Date | null;
  scopeDateTo: Date | null;
  excludedEntryIds: unknown;
  entryLinks?: { entryId: string }[];
};

export function legacyEntryScopeWhere(policy: LegacyEntryScope) {
  const excluded = Array.isArray(policy.excludedEntryIds) ? policy.excludedEntryIds.filter((id): id is string => typeof id === 'string') : [];
  return {
    status: 'PRESERVED' as const,
    neverShare: false,
    ...(excluded.length ? { id: { notIn: excluded } } : {}),
    ...(policy.scopeType === 'categories' ? { category: { in: Array.isArray(policy.scopeCategories) ? policy.scopeCategories.filter((value): value is string => typeof value === 'string') : [] } } : {}),
    ...(policy.scopeType === 'selected_entries' ? { id: { in: policy.entryLinks?.map((link) => link.entryId) ?? [], notIn: excluded } } : {}),
    ...(policy.scopeDateFrom || policy.scopeDateTo ? { entryDate: { ...(policy.scopeDateFrom ? { gte: policy.scopeDateFrom } : {}), ...(policy.scopeDateTo ? { lte: policy.scopeDateTo } : {}) } } : {}),
  };
}

export function policyIsReleased(policy: { status: string; releasedAt: Date | null; expiresAt: Date | null }, now = new Date()) {
  return policy.status === 'RELEASED' && Boolean(policy.releasedAt) && (!policy.expiresAt || policy.expiresAt > now);
}
