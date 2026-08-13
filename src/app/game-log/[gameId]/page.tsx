import { notFound } from "next/navigation";
import { getBoxScore } from "@/lib/queries";
import { BoxScoreView } from "./box-score-view";

export const dynamic = "force-dynamic";

export default async function BoxScorePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  let boxScore: Awaited<ReturnType<typeof getBoxScore>> = null;
  try {
    boxScore = await getBoxScore(gameId);
  } catch {
    boxScore = null;
  }

  if (!boxScore) {
    notFound();
  }

  return <BoxScoreView boxScore={boxScore} />;
}
