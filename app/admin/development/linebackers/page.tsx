import { requireChatGPTUser } from "../../../chatgpt-auth";
import { LinebackerDevelopmentManager } from "./LinebackerDevelopmentManager";

export const metadata = {
  title: "Linebacker Development Lab · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function LinebackerDevelopmentPage() {
  await requireChatGPTUser("/admin/development/linebackers");
  return <LinebackerDevelopmentManager />;
}
