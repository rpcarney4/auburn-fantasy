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
    <Card className="bg-muted/40">
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-base font-semibold">{name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{value ?? "No data yet"}</p>
      </CardContent>
    </Card>
  );
}
