import { notFound } from "next/navigation";
import {
  getTeamDetail,
  getTeamHeadToHead,
  getTeamTransactions,
} from "@/lib/queries";
import { TeamDetailView } from "./team-detail-view";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  let detail: Awaited<ReturnType<typeof getTeamDetail>> = null;
  let transactions: Awaited<ReturnType<typeof getTeamTransactions>> = [];
  let headToHead: Awaited<ReturnType<typeof getTeamHeadToHead>> = {
    DYNASTY: [],
    REDRAFT: [],
  };
  try {
    [detail, transactions, headToHead] = await Promise.all([
      getTeamDetail(userId),
      getTeamTransactions(userId),
      getTeamHeadToHead(userId),
    ]);
  } catch {
    detail = null;
  }

  if (!detail) {
    notFound();
  }

  return (
    <TeamDetailView
      detail={detail}
      transactions={transactions}
      headToHead={headToHead}
    />
  );
}
