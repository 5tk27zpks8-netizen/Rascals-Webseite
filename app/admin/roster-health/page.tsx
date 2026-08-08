import { requireChatGPTUser } from "../../chatgpt-auth";
import { RosterHealthManager } from "./RosterHealthManager";

export const metadata = {
  title: "Roster Health · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminRosterHealthPage() {
  await requireChatGPTUser("/admin/roster-health");
  return <RosterHealthManager />;
}
