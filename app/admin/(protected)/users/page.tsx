import { UsersManager } from "./UsersManager";

export const metadata = { title: "Benutzer · Rascals CMS", robots: { index: false, follow: false } };

export default async function AdminUsersPage() {
  return <UsersManager />;
}
