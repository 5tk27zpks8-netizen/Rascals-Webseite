import { TrashManager } from "./TrashManager";

export const metadata = {
  title: "Papierkorb · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminTrashPage() {
  return <TrashManager />;
}
