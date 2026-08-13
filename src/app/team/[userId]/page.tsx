import { notFound } from "next/navigation";
import { getTeamDetail } from "@/lib/queries";
import { TeamDetailView } from "./team-detail-view";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  let detail: Awaited<ReturnType<typeof getTeamDetail>> = null;
  try {
    detail = await getTeamDetail(userId);
  } catch {
    detail = null;
  }

  if (!detail) {
    notFound();
  }

  return <TeamDetailView detail={detail} />;
}
