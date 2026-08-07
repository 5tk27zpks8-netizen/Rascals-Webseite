import { redirect } from "next/navigation";

export const metadata = {
  title: "Rascals Admin",
  robots: { index: false, follow: false },
};

export default function AdminEntryPage() {
  redirect("/admin/dashboard");
}
