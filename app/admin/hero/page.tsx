import { requireChatGPTUser } from "../../chatgpt-auth";
import { HeroManager } from "./HeroManager";

export const metadata = {
  title: "Hero verwalten · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminHeroPage() {
  await requireChatGPTUser("/admin/hero");
  return <HeroManager />;
}
