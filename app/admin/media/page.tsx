import { requireChatGPTUser } from "../../chatgpt-auth";
import { MediaManager } from "./MediaManager";

export const metadata = { title: "Medien · Rascals CMS", robots: { index: false, follow: false } };

export default async function AdminMediaPage() {
  await requireChatGPTUser("/admin/media");
  return <MediaManager />;
}
