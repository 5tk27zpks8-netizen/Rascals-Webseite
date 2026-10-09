import { GameOperationsManager } from "./GameOperationsManager";

export const metadata = {
  title: "Spielbetrieb · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function GameOperationsPage() {
  return <GameOperationsManager />;
}
