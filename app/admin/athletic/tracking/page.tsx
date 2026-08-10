import { requireChatGPTUser } from "../../../chatgpt-auth";
import { AthleticTrackingManager } from "./AthleticTrackingManager";

export const metadata = {
  title: "Athletic Tracking · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function AthleticTrackingPage() {
  await requireChatGPTUser("/admin/athletic/tracking");
  return <AthleticTrackingManager />;
}
