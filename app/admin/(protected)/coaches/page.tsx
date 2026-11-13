import { CoachesManager } from "./CoachesManager";

export const metadata = { title: "Coaches verwalten · Rascals CMS", robots: { index: false, follow: false } };

export default async function CoachesPage() {
  return <CoachesManager />;
}
