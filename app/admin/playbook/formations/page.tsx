import Link from "next/link";
import {requireChatGPTUser} from "../../../chatgpt-auth";
import {AdminCard,AdminShell} from "../../_components/AdminShell";

export const metadata={title:"Formation Library · Rascals OS",robots:{index:false,follow:false}};

export default async function FormationLibraryPage(){
  await requireChatGPTUser("/admin/playbook/formations");
  return <AdminShell active="playbook" title="Formation Library" eyebrow="RASCALS OS · SCHEME CENTER" actions={<Link className="cms-button secondary" href="/admin/playbook">← Playbook</Link>}>
    <AdminCard>
      <small>FORMATION BUILDER</small>
      <h2>Formation Editor wird integriert</h2>
      <p>Der produktive Playbook-Bereich bleibt verfügbar. Der erweiterte Formation Builder wird nach der Syntax-Reparatur wieder zugeschaltet.</p>
      <Link className="cms-button" href="/admin/playbook">Zum Playbook & Scheme</Link>
    </AdminCard>
  </AdminShell>
}
