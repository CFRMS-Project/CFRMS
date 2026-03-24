export type PaginationInput = {
  pageQuery: unknown;
  limitQuery?: unknown;
  defaultLimit?: number;
  maxLimit?: number;
};

export type PaginationBase = {
  page: number;
  limit: number;
  skip: number;
};

export type PaginationMeta = {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  startItem: number;
  endItem: number;
  pages: number[];
};

export const parsePagination = ({
  pageQuery,
  limitQuery,
  defaultLimit = 10,
  maxLimit = 100,
}: PaginationInput): PaginationBase => {
  const rawPage = Number(pageQuery);
  const rawLimit = Number(limitQuery);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), maxLimit)
      : defaultLimit;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildVisiblePages = (page: number, totalPages: number): number[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  for (let p = 2; p <= 4; p++) pages.add(p);

  return [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const startItem = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(safePage * limit, total);

  return {
    total,
    totalPages,
    page: safePage,
    limit,
    startItem,
    endItem,
    pages: buildVisiblePages(safePage, totalPages),
  };
};
