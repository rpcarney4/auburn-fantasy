"use client";

import { useId, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WIDTH = 480;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

// Rounds a domain out to a "nice" step (1/2/5 × a power of ten) so gridline
// labels land on clean numbers instead of e.g. 87.4.
function niceStep(roughStep: number) {
  const exponent = Math.floor(Math.log10(roughStep));
  const base = roughStep / 10 ** exponent;
  const niceBase = base < 1.5 ? 1 : base < 3 ? 2 : base < 7 ? 5 : 10;
  return niceBase * 10 ** exponent;
}

export function WeeklyScoreChart({
  weeklyScores,
  average: averageProp,
}: {
  weeklyScores: { week: number; points: number; isPlayoffs?: boolean }[];
  /** Reference average to draw, e.g. the same "Points For (Avg)" shown
   * elsewhere on the page. Falls back to the plotted weeks' own mean
   * (which, unlike Points For, includes playoff weeks) if omitted. */
  average?: number | null;
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (weeklyScores.length === 0) return null;

    const values = weeklyScores.map((w) => w.points);
    const average =
      averageProp ?? values.reduce((sum, v) => sum + v, 0) / values.length;

    const rawMax = Math.max(...values, average);
    const rawMin = Math.min(...values, average, 0);
    const step = niceStep((rawMax - rawMin) / 4 || 10);
    const yMax = Math.ceil(rawMax / step) * step;
    const yMin = Math.floor(rawMin / step) * step;
    const ticks: number[] = [];
    for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);

    const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const xFor = (i: number) =>
      PAD_LEFT +
      (weeklyScores.length === 1
        ? innerWidth / 2
        : (i / (weeklyScores.length - 1)) * innerWidth);
    const yFor = (v: number) =>
      PAD_TOP + innerHeight - ((v - yMin) / (yMax - yMin || 1)) * innerHeight;

    const points = weeklyScores.map((w, i) => ({
      ...w,
      x: xFor(i),
      y: yFor(w.points),
    }));
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(PAD_TOP + innerHeight).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_TOP + innerHeight).toFixed(1)} Z`;

    return { average, ticks, yMin, yMax, points, linePath, areaPath, innerWidth, innerHeight };
  }, [weeklyScores, averageProp]);

  if (!chart || weeklyScores.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Weekly Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No games played yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { average, ticks, points, linePath, areaPath } = chart;
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline justify-between gap-2 text-base">
          <span>Weekly Scores</span>
          <span className="text-xs font-normal text-muted-foreground">
            Season avg {average.toFixed(1)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full touch-none select-none"
          role="img"
          aria-label={`Weekly score line chart. Season average ${average.toFixed(1)} points.`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* gridlines + y ticks */}
          {ticks.map((t) => {
            const y =
              PAD_TOP +
              chart.innerHeight -
              ((t - chart.yMin) / (chart.yMax - chart.yMin || 1)) * chart.innerHeight;
            return (
              <g key={t}>
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 6}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* week (x) ticks */}
          {points.map((p) =>
            p.week % 2 === 1 || points.length <= 10 ? (
              <text
                key={p.week}
                x={p.x}
                y={HEIGHT - PAD_BOTTOM + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {p.week}
              </text>
            ) : null
          )}

          {/* dashed average reference line */}
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={
              PAD_TOP +
              chart.innerHeight -
              ((average - chart.yMin) / (chart.yMax - chart.yMin || 1)) * chart.innerHeight
            }
            y2={
              PAD_TOP +
              chart.innerHeight -
              ((average - chart.yMin) / (chart.yMax - chart.yMin || 1)) * chart.innerHeight
            }
            className="stroke-muted-foreground"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            className="stroke-sky-400"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* crosshair */}
          {hovered && (
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PAD_TOP}
              y2={PAD_TOP + chart.innerHeight}
              className="stroke-muted-foreground"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}

          {points.map((p, i) => (
            <circle
              key={p.week}
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 5 : 3.5}
              className="fill-sky-400 stroke-card"
              strokeWidth={2}
              tabIndex={0}
              onPointerEnter={() => setHoverIndex(i)}
              onFocus={() => setHoverIndex(i)}
              onBlur={() => setHoverIndex(null)}
            >
              <title>{`Week ${p.week}: ${p.points.toFixed(1)} pts`}</title>
            </circle>
          ))}
        </svg>

        <div
          className={cn(
            "flex h-5 items-center justify-center text-xs text-muted-foreground transition-opacity",
            hovered ? "opacity-100" : "opacity-0"
          )}
        >
          {hovered && (
            <span>
              Week {hovered.week}:{" "}
              <span className="font-semibold text-foreground">
                {hovered.points.toFixed(1)} pts
              </span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
