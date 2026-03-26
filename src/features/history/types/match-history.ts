export type MatchHistoryRow = {
  arena_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  final_score: number;
  final_rank: number;
  rating_before: number | null;
  rating_after: number | null;
  rating_delta: number | null;
  avg_response_seconds: number;
  correct_count: number;
  wrong_count: number;
};

export type HistorySortBy =
  | "end_time"
  | "final_rank"
  | "final_score"
  | "rating_delta"
  | "rating_after"
  | "avg_response_seconds";

export type HistorySortDir = "asc" | "desc";

export type HistorySearchParams = {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDir?: string;
};

export type HistoryQuery = {
  page: number;
  pageSize: number;
  sortBy: HistorySortBy;
  sortDir: HistorySortDir;
};

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
export const DEFAULT_HISTORY_SORT_BY: HistorySortBy = "end_time";
export const DEFAULT_HISTORY_SORT_DIR: HistorySortDir = "desc";
export const HISTORY_SORTABLE_COLUMNS: ReadonlyArray<HistorySortBy> = [
  "end_time",
  "final_rank",
  "final_score",
  "rating_delta",
  "rating_after",
  "avg_response_seconds",
];

function normalizePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function normalizeHistorySortBy(value: string | undefined): HistorySortBy {
  if (!value) {
    return DEFAULT_HISTORY_SORT_BY;
  }

  return HISTORY_SORTABLE_COLUMNS.includes(value as HistorySortBy)
    ? (value as HistorySortBy)
    : DEFAULT_HISTORY_SORT_BY;
}

export function normalizeHistorySortDir(value: string | undefined): HistorySortDir {
  return value === "asc" ? "asc" : DEFAULT_HISTORY_SORT_DIR;
}

export function normalizeHistoryQuery(params: HistorySearchParams): HistoryQuery {
  const requestedPageSize = normalizePositiveInt(params.pageSize, 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : 10;

  return {
    page: normalizePositiveInt(params.page, 1),
    pageSize,
    sortBy: normalizeHistorySortBy(params.sortBy),
    sortDir: normalizeHistorySortDir(params.sortDir),
  };
}
