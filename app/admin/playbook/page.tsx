import { requireChatGPTUser } from "../../chatgpt-auth";
import { PlaybookManager } from "./PlaybookManager";

export const metadata={title:"Playbook & Scheme · Rascals OS",robots:{index:false,follow:false}};
export default async function PlaybookPage(){await requireChatGPTUser("/admin/playbook");return <PlaybookManager/>}
