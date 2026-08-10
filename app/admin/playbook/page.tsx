import { requireChatGPTUser } from "../../chatgpt-auth";
import { PlaybookStudio } from "./PlaybookStudio";
import { PlaybookWorkspaceNav } from "./PlaybookWorkspaceNav";
import "./playbook-studio-enhancements.css";
import "./playbook-workspace-nav.css";

export const metadata={title:"Playbook & Scheme · Rascals OS",robots:{index:false,follow:false}};
export default async function PlaybookPage(){
  await requireChatGPTUser("/admin/playbook");
  return <>
    <PlaybookWorkspaceNav />
    <PlaybookStudio />
  </>;
}
