import { requireChatGPTUser } from "../../chatgpt-auth";
import { InlineImagePositionAddon } from "./InlineImagePositionAddon";
import { LiveWebsiteMirror } from "./LiveWebsiteMirror";
import { TypographyStudioAddon } from "./TypographyStudioAddon";
import { WebsiteBuilder } from "./WebsiteBuilder";
import "./website-builder-v3.css";

export const metadata = {
  title: "Website Builder · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminWebsitePage() {
  await requireChatGPTUser("/admin/website");
  return <><TypographyStudioAddon/><WebsiteBuilder/><LiveWebsiteMirror/><InlineImagePositionAddon/></>;
}
