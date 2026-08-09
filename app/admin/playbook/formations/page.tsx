import {requireChatGPTUser} from "../../../chatgpt-auth";
import {FormationLibrary} from "./FormationLibrary";

export const metadata={title:"Formation Library · Rascals OS",robots:{index:false,follow:false}};
export default async function FormationLibraryPage(){await requireChatGPTUser("/admin/playbook/formations");return <FormationLibrary/>}
