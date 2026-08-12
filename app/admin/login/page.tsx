import { redirect } from "next/navigation";
import { getChatGPTUser, getExternalIdentity } from "../../chatgpt-auth";
import { canSetupPasswordForEmail, hasAdminCredential, safeAdminReturnTo } from "../../lib/admin-auth";
import "./login.css";

export const metadata = {
  title: "Admin Login · Hellenstein Rascals",
  robots: { index: false, follow: false },
};

type Search = { return_to?: string; error?: string; reset?: string; fresh?: string };

const errorText: Record<string, string> = {
  invalid: "E-Mail oder Passwort ist nicht korrekt.",
  locked: "Zu viele Fehlversuche. Der Zugang ist für 15 Minuten gesperrt.",
  password: "Das Passwort muss mindestens 12 Zeichen lang sein.",
  mismatch: "Die beiden Passwörter stimmen nicht überein.",
  forbidden: "Für dieses Konto ist kein Admin-Zugang freigegeben.",
  setup: "Passwort konnte nicht gespeichert werden. Bitte erneut versuchen.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const returnTo = safeAdminReturnTo(query.return_to, "/admin");
  const current = await getChatGPTUser();
  if (current && query.fresh !== "1") redirect(returnTo);

  const external = await getExternalIdentity();
  const setupAllowed = external ? await canSetupPasswordForEmail(external.email) : false;
  const hasCredential = external ? await hasAdminCredential(external.email) : false;
  const setupMode = Boolean(external && setupAllowed && (!hasCredential || query.reset === "1"));
  const message = query.error ? errorText[query.error] ?? "Anmeldung nicht möglich." : "";

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <a className="admin-login-brand" href="/" aria-label="Zur Rascals Website">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span><b>RASCALS</b><small>WEBSITE ADMIN</small></span>
        </a>

        <div className="admin-login-copy">
          <span>{setupMode ? "SICHERER ERSTZUGANG" : "ADMIN LOGIN"}</span>
          <h1>{setupMode ? "Passwort einrichten" : "Willkommen zurück"}</h1>
          <p>{setupMode ? "Lege jetzt dein persönliches Admin-Passwort fest. Danach ist der Adminbereich nur noch mit einer gültigen Rascals-Session erreichbar." : "Melde dich mit deinem freigegebenen CMS-Konto an."}</p>
        </div>

        {message && <div className="admin-login-error">{message}</div>}

        {setupMode && external ? (
          <form className="admin-login-form" action="/admin/api/auth/setup" method="post">
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="email" value={external.email} />
            <label><span>Konto</span><input value={external.email} readOnly /></label>
            <label><span>Neues Passwort</span><input type="password" name="password" minLength={12} autoComplete="new-password" required placeholder="Mindestens 12 Zeichen" /></label>
            <label><span>Passwort wiederholen</span><input type="password" name="confirm" minLength={12} autoComplete="new-password" required /></label>
            <button type="submit">Passwort speichern & anmelden</button>
          </form>
        ) : (
          <form className="admin-login-form" action="/admin/api/auth/login" method="post">
            <input type="hidden" name="return_to" value={returnTo} />
            <label><span>E-Mail</span><input type="email" name="email" defaultValue={external?.email ?? ""} autoComplete="username" required /></label>
            <label><span>Passwort</span><input type="password" name="password" autoComplete="current-password" required /></label>
            <button type="submit">Anmelden</button>
          </form>
        )}

        <div className="admin-login-footer">
          <a href="/">← Zur Website</a>
          {external && setupAllowed && hasCredential && !setupMode && <a href={`/admin/login?reset=1&return_to=${encodeURIComponent(returnTo)}`}>Passwort neu setzen</a>}
        </div>
      </section>
    </main>
  );
}
