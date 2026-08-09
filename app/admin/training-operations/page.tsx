import { requireChatGPTUser } from "../../chatgpt-auth";
import { TrainingOperationsManager } from "./TrainingOperationsManager";

export const metadata = {
  title: "Training Operations · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function TrainingOperationsPage() {
  await requireChatGPTUser("/admin/training-operations");
  return <TrainingOperationsManager />;
}
