import { requireChatGPTUser } from "../../chatgpt-auth";
import { AdminDashboard } from "../AdminDashboard";

export const metadata = {
  title: "Rascals Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  await requireChatGPTUser("/admin/dashboard");
  return <AdminDashboard />;
}
