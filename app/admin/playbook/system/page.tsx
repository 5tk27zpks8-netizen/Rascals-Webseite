import { requireChatGPTUser } from "../../../chatgpt-auth";
import { PlaybookManager } from "../PlaybookManager";

export const metadata={title:"Playbook System Editor · Rascals OS",robots:{index:false,follow:false}};
export default async function PlaybookSystemPage(){await requireChatGPTUser("/admin/playbook/system");return <PlaybookManager/>}
