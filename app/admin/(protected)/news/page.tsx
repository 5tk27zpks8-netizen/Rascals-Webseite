import { NewsManager } from "./NewsManager";

export const metadata = {
  title: "News verwalten · Rascals CMS",
  robots: { index: false, follow: false },
};

export default async function AdminNewsPage() {
  return <NewsManager />;
}
