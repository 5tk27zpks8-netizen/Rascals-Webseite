import { requireChatGPTUser } from "../../chatgpt-auth";
import { GamedayRosterManager } from "./GamedayRosterManager";

export const metadata = {
  title: "Gameday Roster · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function GamedayRosterPage() {
  await requireChatGPTUser("/admin/gameday-roster");
  return <GamedayRosterManager />;
}
