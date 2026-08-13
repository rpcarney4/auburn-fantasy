"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { TradeAssetRow } from "@/lib/queries";

const ALL = "__all__";

export function TradeHistoryView({ rows }: { rows: TradeAssetRow[] }) {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState(ALL);
  const [position, setPosition] = useState(ALL);
  const [tradedFrom, setTradedFrom] = useState(ALL);
  const [tradedTo, setTradedTo] = useState(ALL);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "tradeDate", desc: true },
  ]);

  const seasons = useMemo(
    () => Array.from(new Set(rows.map((r) => r.season))).sort((a, b) => b - a),
    [rows]
  );
  const positions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.position))).sort(),
    [rows]
  );
  const teams = useMemo(
    () =>
      Array.from(new Set(rows.flatMap((r) => [r.fromTeam, r.toTeam]))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (season !== ALL && String(row.season) !== season) return false;
      if (position !== ALL && row.position !== position) return false;
      if (tradedFrom !== ALL && row.fromTeam !== tradedFrom) return false;
      if (tradedTo !== ALL && row.toTeam !== tradedTo) return false;
      if (
        search.trim() &&
        !row.label.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [rows, season, position, tradedFrom, tradedTo, search]);

  const columns = useMemo<ColumnDef<TradeAssetRow>[]>(
    () => [
      { accessorKey: "label", header: "Player Name" },
      { accessorKey: "position", header: "Pos." },
      { accessorKey: "fromTeam", header: "Traded From" },
      { accessorKey: "toTeam", header: "Traded To" },
      {
        accessorKey: "tradeDate",
        header: "Trade Date",
        cell: ({ getValue }) =>
          (getValue() as Date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
      },
      {
        id: "linkedLabels",
        header: "Linked To",
        cell: ({ row }) =>
          row.original.linkedLabels.length > 0
            ? row.original.linkedLabels.join(", ")
            : "—",
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Trade History</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search player..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={season} onValueChange={setSeason}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All years</SelectItem>
            {seasons.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={position} onValueChange={setPosition}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All positions</SelectItem>
            {positions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tradedFrom} onValueChange={setTradedFrom}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Traded From" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any team</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tradedTo} onValueChange={setTradedTo}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Traded To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any team</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No trade data synced yet.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No trades match the current filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {{ asc: " ↑", desc: " ↓" }[
                      header.column.getIsSorted() as string
                    ] ?? ""}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
