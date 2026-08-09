import { requireChatGPTUser } from "../../chatgpt-auth";
import { GameOperationsManager } from "./GameOperationsManager";

export const metadata = {
  title: "Spielbetrieb · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function GameOperationsPage() {
  await requireChatGPTUser("/admin/game-operations");
  return <GameOperationsManager />;
}
