import { requireChatGPTUser } from "../../chatgpt-auth";
import { FieldLab } from "./FieldLab";

export const metadata = {
  title: "Field Lab · Rascals OS",
  robots: { index: false, follow: false },
};

export default async function FieldLabPage(){
  await requireChatGPTUser("/admin/field-lab");
  return <FieldLab/>;
}
