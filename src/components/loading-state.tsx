import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}
