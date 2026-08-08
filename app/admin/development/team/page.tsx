import { requireChatGPTUser } from "../../../chatgpt-auth";
import { TeamDevelopmentManager } from "./TeamDevelopmentManager";

export const metadata={title:"Team Development Command Center · Rascals OS",robots:{index:false,follow:false}};
export default async function TeamDevelopmentPage(){await requireChatGPTUser("/admin/development/team");return <TeamDevelopmentManager/>}
