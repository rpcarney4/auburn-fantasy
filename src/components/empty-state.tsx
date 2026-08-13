export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
      <p className="text-sm font-medium">{title}</p>
      {detail && <p className="max-w-md text-xs">{detail}</p>}
    </div>
  );
}
