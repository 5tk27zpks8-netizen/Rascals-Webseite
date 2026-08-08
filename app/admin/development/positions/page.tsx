import { requireChatGPTUser } from "../../../chatgpt-auth";
import { PositionDevelopmentManager } from "./PositionDevelopmentManager";

export const metadata = {
  title: "Position Development · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function PositionDevelopmentPage() {
  await requireChatGPTUser("/admin/development/positions");
  return <PositionDevelopmentManager />;
}
