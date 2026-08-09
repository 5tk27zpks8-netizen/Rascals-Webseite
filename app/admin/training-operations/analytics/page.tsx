import { requireChatGPTUser } from "../../../chatgpt-auth";
import { TrainingAnalyticsManager } from "./TrainingAnalyticsManager";

export const metadata={title:"Training Analytics · Rascals OS",robots:{index:false,follow:false}};
export default async function TrainingAnalyticsPage(){await requireChatGPTUser("/admin/training-operations/analytics");return <TrainingAnalyticsManager/>}