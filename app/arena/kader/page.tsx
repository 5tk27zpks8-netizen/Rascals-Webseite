import { listActiveCoaches } from "../../lib/coaches";
import { listPublicTeamPlayers } from "../../lib/public-team-players";
import { ArenaRoster, CLUB_LOGO } from "../../ArenaRoster";
import { readPublishedSiteBuilderState } from "../../lib/site-builder";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kader im Arena-Design · Vorschau",
  robots: { index: false, follow: false },
};

/** Preview: the Arena drive carrying nothing but the player cards. */
export default async function ArenaRosterPreviewPage() {
  const [players, coaches, site] = await Promise.all([
    listPublicTeamPlayers().catch(() => []),
    listActiveCoaches().catch(() => []),
    readPublishedSiteBuilderState(),
  ]);
  return (
    <ArenaRoster
      players={players}
      coaches={coaches}
      logo={site.theme.logoUrl?.trim() || CLUB_LOGO}
    />
  );
}
