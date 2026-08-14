export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-lg font-semibold">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}
