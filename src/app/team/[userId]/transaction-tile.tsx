import { cn } from "@/lib/utils";
import type { TeamTransaction } from "@/lib/types";

const TRANSACTION_LABEL: Record<TeamTransaction["kind"], string> = {
  TRADE_IN: "Incoming Trade",
  TRADE_OUT: "Outgoing Trade",
  WAIVER_ADD: "Waiver Claim",
  DROP: "Drop",
  DRAFT_PICK: "Draft Pick",
};

export function TransactionTile({ transaction }: { transaction: TeamTransaction }) {
  const isIncoming = transaction.kind !== "TRADE_OUT" && transaction.kind !== "DROP";
  const counterpartyPrefix = transaction.kind === "TRADE_IN" ? "Traded from" : "Traded to";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "w-3 shrink-0 text-base font-bold",
            isIncoming ? "text-green-500" : "text-red-500"
          )}
        >
          {isIncoming ? "+" : "−"}
        </span>
        <span className="truncate font-medium">{transaction.assetName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>
          {TRANSACTION_LABEL[transaction.kind]}
          {transaction.pickLabel ? ` · ${transaction.pickLabel}` : ""}
          {transaction.counterpartyTeamName
            ? ` · ${counterpartyPrefix} ${transaction.counterpartyTeamName}`
            : ""}
        </span>
        <span className="tabular-nums">
          {new Date(transaction.date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
