import { requireChatGPTUser } from "../../../chatgpt-auth";
import { StudioFrameClient } from "./StudioFrameClient";

export const metadata={title:"Website Studio Vorschau",robots:{index:false,follow:false}};

export default async function StudioFramePage(){await requireChatGPTUser("/admin/website/studio-frame");return <StudioFrameClient/>}
