import { listPublicTeamPlayers } from "../../lib/public-team-players";
import { Header } from "../../SiteShell";
import { FormationField } from "../FormationField";

export const metadata = {
  title: "Aufstellung · Hellenstein Rascals",
  description: "Der Kader der Hellenstein Rascals als Aufstellung auf dem Feld.",
};

export default async function TeamFormationPage() {
  const players = await listPublicTeamPlayers();

  return (
    <>
      <Header page="team" />
      <main className="team-formation-page">
        <FormationField players={players} />
      </main>
    </>
  );
}
