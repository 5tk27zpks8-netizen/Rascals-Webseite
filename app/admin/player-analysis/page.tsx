import { requireChatGPTUser } from "../../chatgpt-auth";
import { PlayerAnalysisManager } from "./PlayerAnalysisManager";

export const metadata = {
  title: "Spieler & Analyse · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function PlayerAnalysisPage() {
  await requireChatGPTUser("/admin/player-analysis");
  return <PlayerAnalysisManager />;
}
