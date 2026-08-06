import { AdminDashboard } from "./AdminDashboard";

export const metadata = {
  title: "Rascals Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
