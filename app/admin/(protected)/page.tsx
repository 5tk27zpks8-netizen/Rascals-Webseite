import { AdminDashboard } from "../AdminDashboard";

export const metadata = {
  title: "Rascals Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEntryPage() {
  return <AdminDashboard />;
}
