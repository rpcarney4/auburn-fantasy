import Image from "next/image";

// Square, stretches to match whatever height its flex siblings resolve to
// (a single name line, or a name line plus the stats line beneath it) —
// object-cover crops rather than distorting, so it never skews.
export function Headshot({ url }: { url: string | null }) {
  return (
    <div className="relative aspect-square shrink-0 self-stretch overflow-hidden rounded bg-muted">
      {url && <Image src={url} alt="" fill sizes="48px" className="object-cover" />}
    </div>
  );
}
