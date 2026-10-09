import { StudioPreviewFit } from "./StudioPreviewFit";
import { WebsiteBuilderV4 } from "./WebsiteBuilderV4";
import "./website-studio-layout-fix.css";

export const metadata = {
  title: "Website Builder · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminWebsitePage() {
  return <><WebsiteBuilderV4/><StudioPreviewFit/></>;
}
