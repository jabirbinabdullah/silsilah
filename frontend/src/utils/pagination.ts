export function resolvePagination(page: number = 1, limit: number = 50): { page: number; limit: number; offset: number } {
  const safePage = Number.isFinite(page) ? Math.trunc(page) : 1;
  const safeLimit = Number.isFinite(limit) ? Math.trunc(limit) : 50;
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
  returnedCount: number,
): { limit: number; offset: number; hasMore: boolean } {
  const { offset, limit: safeLimit } = resolvePagination(page, limit);
  return {
    limit: safeLimit,
    offset,
    hasMore: offset + returnedCount < total,
  };
}
