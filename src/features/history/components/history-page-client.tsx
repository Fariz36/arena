"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

type MatchHistoryRow = {
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

type HistoryPageClientProps = {
  email: string | undefined;
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatSignedNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${value > 0 ? "+" : ""}${value}`;
}

export default function HistoryPageClient({ email }: HistoryPageClientProps) {
  const [historyRows, setHistoryRows] = useState<MatchHistoryRow[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historySorting, setHistorySorting] = useState<SortingState>([{ id: "end_time", desc: true }]);

  const pageCount = Math.max(Math.ceil(historyTotal / historyPageSize), 1);

  const columns = useMemo<ColumnDef<MatchHistoryRow>[]>(
    () => [
      {
        id: "end_time",
        accessorKey: "end_time",
        header: "Finished",
        cell: (info) => formatDateTime(info.getValue() as string),
      },
      {
        id: "final_rank",
        accessorKey: "final_rank",
        header: "Rank",
      },
      {
        id: "final_score",
        accessorKey: "final_score",
        header: "Score",
      },
      {
        id: "rating_delta",
        accessorKey: "rating_delta",
        header: "Rating Δ",
        cell: (info) => formatSignedNumber(info.getValue() as number | null),
      },
      {
        id: "rating_after",
        accessorKey: "rating_after",
        header: "Rating After",
      },
      {
        id: "avg_response_seconds",
        accessorKey: "avg_response_seconds",
        header: "Avg Resp (s)",
        cell: (info) => Number(info.getValue() ?? 0).toFixed(2),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: historyRows,
    columns,
    state: {
      sorting: historySorting,
      pagination: {
        pageIndex: historyPageIndex,
        pageSize: historyPageSize,
      },
    },
    pageCount,
    manualPagination: true,
    manualSorting: true,
    onSortingChange: setHistorySorting,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      const sort = historySorting[0];
      const params = new URLSearchParams({
        page: String(historyPageIndex + 1),
        pageSize: String(historyPageSize),
        sortBy: sort?.id ?? "end_time",
        sortDir: sort?.desc ? "desc" : "asc",
      });

      const response = await fetch(`/api/profile/history?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok || disposed) {
        return;
      }

      const payload = (await response.json()) as {
        rows: MatchHistoryRow[];
        total: number;
      };

      if (disposed) {
        return;
      }

      setHistoryRows(payload.rows ?? []);
      setHistoryTotal(Number(payload.total ?? 0));
    };

    void run();
    return () => {
      disposed = true;
    };
  }, [historyPageIndex, historyPageSize, historySorting]);

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{
          overflow: "hidden",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(15, 17, 26, 0.72)",
          backdropFilter: "blur(18px) saturate(170%)",
          WebkitBackdropFilter: "blur(18px) saturate(170%)",
          boxShadow: "0 18px 42px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.06) inset",
          p: { xs: 2.25, sm: 2.75 },
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 12% 18%, rgba(99,102,241,0.22), transparent 40%), radial-gradient(circle at 85% 0%, rgba(56,189,248,0.14), transparent 35%)",
          },
        }}
      >
        <Stack spacing={1.25} sx={{ position: "relative", zIndex: 1 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.03em",
              background: "linear-gradient(120deg, #ffffff 30%, rgba(255,255,255,0.6))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Finished Matches
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
            Account: {email ?? "-"}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={`${historyTotal} Total Matches`}
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                bgcolor: "rgba(99,102,241,0.18)",
                color: "#c7d2fe",
                border: "1px solid rgba(129,140,248,0.26)",
              }}
            />
            <Chip
              size="small"
              label={`Page ${historyPageIndex + 1} / ${pageCount}`}
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                bgcolor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.84)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(17, 20, 31, 0.62)",
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <Stack spacing={2.5} sx={{ p: { xs: 1.3, sm: 1.8 } }}>
          <TableContainer
            sx={{
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <Table
              size="medium"
              sx={{
                "& .MuiTableCell-root": {
                  py: 1.35,
                  px: 1.75,
                  borderBottomColor: "rgba(255,255,255,0.08)",
                },
                "& .MuiTableHead-root .MuiTableCell-root": {
                  color: "rgba(255,255,255,0.72)",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  bgcolor: "rgba(255,255,255,0.02)",
                },
                "& .MuiTableBody-root .MuiTableCell-root": {
                  color: "rgba(255,255,255,0.88)",
                },
                "& .MuiTableRow-hover:hover": {
                  bgcolor: "rgba(165,180,252,0.08)",
                },
              }}
            >
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sort = header.column.getIsSorted();
                      return (
                        <TableCell
                          key={header.id}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          sx={{ cursor: canSort ? "pointer" : "default", whiteSpace: "nowrap" }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sort ? (sort === "desc" ? " ↓" : " ↑") : ""}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length}>
                      <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>No finished matches yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="history-page-size-label" sx={{ color: "rgba(255,255,255,0.66)" }}>
                Rows
              </InputLabel>
              <Select
                labelId="history-page-size-label"
                value={historyPageSize}
                label="Rows"
                sx={{
                  color: "rgba(255,255,255,0.88)",
                  borderRadius: "10px",
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.22)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(129,140,248,0.7)" },
                  "& .MuiSelect-icon": { color: "rgba(255,255,255,0.62)" },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: "rgba(18,22,34,0.98)",
                      color: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(12px)",
                    },
                  },
                }}
                onChange={(event) => {
                  setHistoryPageSize(Number(event.target.value));
                  setHistoryPageIndex(0);
                }}
              >
                {[5, 10, 20, 50].map((size) => (
                  <MenuItem key={size} value={size}>{size}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Pagination
              count={pageCount}
              page={historyPageIndex + 1}
              onChange={(_event, page) => setHistoryPageIndex(page - 1)}
              color="primary"
              size="small"
              sx={{
                "& .MuiPaginationItem-root": {
                  color: "rgba(255,255,255,0.8)",
                  borderColor: "rgba(255,255,255,0.2)",
                },
                "& .Mui-selected": {
                  bgcolor: "rgba(99,102,241,0.25)",
                  borderColor: "rgba(129,140,248,0.5)",
                },
              }}
            />
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
