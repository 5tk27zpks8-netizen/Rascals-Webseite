import { HomeArena } from "../HomeArena";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Arena · Design-Vorschau",
  robots: { index: false, follow: false },
};

/** Preview address for the Arena design, so it can be judged before going live. */
export default function ArenaPreviewPage() {
  return <HomeArena />;
}
