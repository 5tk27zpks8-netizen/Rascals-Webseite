import { DesignManager } from "./DesignManager";
import "./design-preview-modal.css";

export const metadata = {
  title: "Designs · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminDesignsPage() {
  return <DesignManager />;
}
