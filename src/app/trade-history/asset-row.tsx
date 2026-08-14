import { cn } from "@/lib/utils";
import type { TradeCardAsset } from "@/lib/types";

export function AssetRow({
  asset,
  isIncoming,
}: {
  asset: TradeCardAsset;
  isIncoming: boolean;
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
      <span
        className={cn(
          "w-3 shrink-0 text-base font-bold",
          isIncoming ? "text-green-500" : "text-red-500"
        )}
      >
        {isIncoming ? "+" : "−"}
      </span>
      <span className="min-w-0 flex-1 truncate">{asset.label}</span>
      {asset.position && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {asset.position}
        </span>
      )}
    </li>
  );
}
