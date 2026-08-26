import { redirect } from "next/navigation";
import { AdminDashboard } from "../AdminDashboard";
import { getCmsActor, isStandardViewOnly } from "../../lib/permissions";

export const metadata = {
  title: "Rascals Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEntryPage() {
  // The dashboard is built from data the standard view cannot read, so those
  // accounts land on the Spielplan — the first thing they actually may see.
  const actor = await getCmsActor();
  if (actor && isStandardViewOnly(actor.role)) redirect("/admin/games");
  return <AdminDashboard />;
}
