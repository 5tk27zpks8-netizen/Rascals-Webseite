import type { Metadata } from "next";
import CoachPlaybook from "./CoachPlaybook";

export const metadata: Metadata = {
  title: "Playbook & Scheme | Rascals Football Operations",
  description: "Formationen, Depth Chart und Positions-Performance der Hellenstein Rascals.",
};

export default function CoachPlaybookPage() {
  return <CoachPlaybook />;
}
