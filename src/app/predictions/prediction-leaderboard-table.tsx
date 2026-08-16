import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PredictionLeaderboardEntry } from "@/lib/types";

export function PredictionLeaderboardTable({
  entries,
}: {
  entries: PredictionLeaderboardEntry[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No decided games have been predicted yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Correct</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Pct</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.userId}>
            <TableCell className="font-medium">{e.displayName}</TableCell>
            <TableCell className="text-right tabular-nums">{e.correct}</TableCell>
            <TableCell className="text-right tabular-nums">{e.total}</TableCell>
            <TableCell className="text-right tabular-nums">
              {((e.correct / e.total) * 100).toFixed(1)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
