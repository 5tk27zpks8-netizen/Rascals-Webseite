import { requireChatGPTUser } from "../../chatgpt-auth";
import { DevelopmentManager } from "./DevelopmentManager";

export const metadata = { title: "Player Development · Rascals CMS", robots: { index: false, follow: false } };

export default async function DevelopmentPage(){
  await requireChatGPTUser("/admin/development");
  return <DevelopmentManager/>;
}
