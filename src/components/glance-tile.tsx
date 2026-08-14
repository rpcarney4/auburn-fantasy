import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { LeagueGlanceRankingEntry } from "@/lib/types";

export function GlanceTile({
  label,
  name,
  avatar,
  value,
  ranking,
}: {
  label: string;
  name: string | undefined;
  avatar?: string | null;
  value: string | undefined;
  ranking?: LeagueGlanceRankingEntry[];
}) {
  const tile = (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-base font-semibold">{name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{value ?? "No data yet"}</p>
      </div>
      {name && (
        <Image
          src={avatar || "/img/sleeper-profile.png"}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-full object-cover"
        />
      )}
    </div>
  );

  // "Rest of the field" — the tile already shows rank 1, so the popover
  // only needs ranks 2+.
  const rest = ranking?.slice(1) ?? [];
  if (rest.length === 0) return tile;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer text-left">
          {tile}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <ol className="flex flex-col gap-0.5">
          {rest.map((entry, i) => (
            <li key={i} className="flex items-center gap-2 whitespace-nowrap">
              <span>
                {i + 2}. {entry.name}
              </span>
              <span className="text-muted-foreground">{entry.value}</span>
            </li>
          ))}
        </ol>
      </PopoverContent>
    </Popover>
  );
}
