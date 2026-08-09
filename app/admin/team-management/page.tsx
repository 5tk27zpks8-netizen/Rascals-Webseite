import { requireChatGPTUser } from "../../chatgpt-auth";
import { TeamManagementManager } from "./TeamManagementManager";

export const metadata = {
  title: "Team & Kader · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function TeamManagementPage() {
  await requireChatGPTUser("/admin/team-management");
  return <TeamManagementManager />;
}
