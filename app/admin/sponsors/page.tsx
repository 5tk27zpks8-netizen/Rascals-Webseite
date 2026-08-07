import { requireChatGPTUser } from "../../chatgpt-auth";
import { SponsorsManager } from "./SponsorsManager";

export const metadata = {
  title: "Sponsoren verwalten · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminSponsorsPage() {
  await requireChatGPTUser("/admin/sponsors");
  return <SponsorsManager />;
}
