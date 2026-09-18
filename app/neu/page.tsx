import { HomeMatchday } from "../HomeMatchday";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Design-Vorschau · Hellenstein Rascals",
  robots: { index: false, follow: false },
};

/**
 * Preview address for the alternative homepage design, so it can be compared
 * against the live one without touching it. Not indexed, not linked.
 */
export default function DesignPreviewPage() {
  return <HomeMatchday />;
}
