import { listPublicTeamPlayers } from "../../lib/public-team-players";
import { ArenaRoster } from "../../ArenaRoster";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kader im Arena-Design · Vorschau",
  robots: { index: false, follow: false },
};

/** Preview: the Arena drive carrying nothing but the player cards. */
export default async function ArenaRosterPreviewPage() {
  const players = await listPublicTeamPlayers().catch(() => []);
  return <ArenaRoster players={players} />;
}
