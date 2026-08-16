import { requireChatGPTUser } from "../../chatgpt-auth";
import { WebsiteBuilderV4 } from "./WebsiteBuilderV4";
import "./website-studio-layout-fix.css";

export const metadata = {
  title: "Website Builder · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminWebsitePage() {
  await requireChatGPTUser("/admin/website");
  return <WebsiteBuilderV4/>;
}
