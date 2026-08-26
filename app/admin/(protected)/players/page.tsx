import { PlayersManager } from "./PlayersManager";

export const metadata = { title: "Spieler verwalten · Rascals CMS", robots: { index: false, follow: false } };

export default async function PlayersPage(){
  return <PlayersManager/>;
}
