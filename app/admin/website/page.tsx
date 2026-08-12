import { requireChatGPTUser } from "../../chatgpt-auth";
import { WebsiteBuilder } from "./WebsiteBuilder";

export const metadata = {
  title: "Website Builder · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminWebsitePage() {
  await requireChatGPTUser("/admin/website");
  return <WebsiteBuilder />;
}
