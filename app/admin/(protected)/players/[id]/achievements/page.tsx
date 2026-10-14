import { PlayerRecordsManager } from "./PlayerRecordsManager";

export default async function PlayerAchievementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayerRecordsManager playerId={id} />;
}
