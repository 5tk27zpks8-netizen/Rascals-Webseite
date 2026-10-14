import { listPublicTeamPlayers } from "../../lib/public-team-players";
import { Header } from "../../SiteShell";
import { FormationField } from "../FormationField";
import { siteBrand } from "../../lib/brand-server";

export const metadata = {
  title: "Aufstellung · Hellenstein Rascals",
  description: "Der Kader der Hellenstein Rascals als Aufstellung auf dem Feld.",
};

export default async function TeamFormationPage() {
  const players = await listPublicTeamPlayers();

  const brand = await siteBrand();

  return (
    <>
      <Header page="team" brand={brand} />
      <main className="team-formation-page">
        <FormationField players={players} />
      </main>
    </>
  );
}
