import { HomeHybrid } from "../HomeHybrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hybrid · Design-Vorschau",
  robots: { index: false, follow: false },
};

/** Preview address for the Hybrid design. */
export default function HybridPreviewPage() {
  return <HomeHybrid />;
}
