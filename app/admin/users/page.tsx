import { requireChatGPTUser } from "../../chatgpt-auth";
import { UsersManager } from "./UsersManager";

export const metadata = { title: "Benutzer · Rascals CMS", robots: { index: false, follow: false } };

export default async function AdminUsersPage() {
  await requireChatGPTUser("/admin/users");
  return <UsersManager />;
}
