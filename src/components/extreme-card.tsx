import { Card, CardContent } from "@/components/ui/card";

export function ExtremeCard({
  label,
  name,
  value,
}: {
  label: string;
  name: string | undefined;
  value: string | undefined;
}) {
  return (
    <Card className="h-full bg-muted/40">
      <CardContent className="flex h-full flex-1 flex-col items-center justify-center gap-1 text-center">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-base font-semibold">{name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{value ?? "No data yet"}</p>
      </CardContent>
    </Card>
  );
}
