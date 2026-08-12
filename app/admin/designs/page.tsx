import { requireChatGPTUser } from "../../chatgpt-auth";
import { DesignManager } from "./DesignManager";

export const metadata = {
  title: "Designs · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminDesignsPage() {
  await requireChatGPTUser("/admin/designs");
  return <DesignManager />;
}
