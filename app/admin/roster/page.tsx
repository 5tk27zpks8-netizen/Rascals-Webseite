import { requireChatGPTUser } from "../../chatgpt-auth";
import { RosterManager } from "./RosterManager";

export const metadata = {
  title: "Season Roster · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminRosterPage() {
  await requireChatGPTUser("/admin/roster");
  return <RosterManager />;
}
