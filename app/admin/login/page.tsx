import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSessionIdentity, safeAdminReturnTo } from "../../lib/admin-auth";
import "./login.css";

export const metadata = {
  title: "Login · Hellenstein Rascals",
  robots: { index: false, follow: false },
};

type Search = { return_to?: string; error?: string; mode?: string };

const errorText: Record<string, string> = {
  invalid: "E-Mail oder Passwort ist nicht korrekt.",
  locked: "Zu viele Fehlversuche. Der Zugang ist für 15 Minuten gesperrt.",
  password: "Das Passwort muss mindestens 12 Zeichen lang sein.",
  mismatch: "Die beiden Passwörter stimmen nicht überein.",
  email: "Bitte eine gültige E-Mail-Adresse angeben.",
  exists: "Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an.",
  register: "Registrierung fehlgeschlagen. Bitte erneut versuchen.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const returnTo = safeAdminReturnTo(query.return_to, "/admin");

  const identity = await getAdminSessionIdentity(await headers());
  if (identity) redirect(returnTo);

  const registerMode = query.mode === "register";
  const message = query.error ? errorText[query.error] ?? "Anmeldung nicht möglich." : "";

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <a className="admin-login-brand" href="/" aria-label="Zur Rascals Website">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span><b>RASCALS</b><small>TEAMBEREICH</small></span>
        </a>

        <div className="admin-login-copy">
          <span>{registerMode ? "NEUES KONTO" : "ANMELDEN"}</span>
          <h1>{registerMode ? "Konto erstellen" : "Willkommen zurück"}</h1>
          <p>
            {registerMode
              ? "Erstelle dein persönliches Konto. Du startest mit der Standard-Spieleransicht; erweiterte Rechte vergibt ein Admin."
              : "Melde dich mit deiner E-Mail und deinem Passwort an."}
          </p>
        </div>

        {message && <div className="admin-login-error">{message}</div>}

        {registerMode ? (
          <form className="admin-login-form" action="/admin/api/auth/register" method="post">
            <input type="hidden" name="return_to" value={returnTo} />
            <label><span>Name</span><input name="display_name" autoComplete="name" placeholder="Vor- und Nachname" /></label>
            <label><span>E-Mail</span><input type="email" name="email" autoComplete="username" required /></label>
            <label><span>Passwort</span><input type="password" name="password" minLength={12} autoComplete="new-password" required placeholder="Mindestens 12 Zeichen" /></label>
            <label><span>Passwort wiederholen</span><input type="password" name="confirm" minLength={12} autoComplete="new-password" required /></label>
            <button type="submit">Konto erstellen</button>
          </form>
        ) : (
          <form className="admin-login-form" action="/admin/api/auth/login" method="post">
            <input type="hidden" name="return_to" value={returnTo} />
            <label><span>E-Mail</span><input type="email" name="email" autoComplete="username" required /></label>
            <label><span>Passwort</span><input type="password" name="password" autoComplete="current-password" required /></label>
            <button type="submit">Anmelden</button>
          </form>
        )}

        <div className="admin-login-footer">
          <a href="/">← Zur Website</a>
          <a href={`/admin/login?mode=${registerMode ? "login" : "register"}&return_to=${encodeURIComponent(returnTo)}`}>
            {registerMode ? "Ich habe bereits ein Konto" : "Neu hier? Konto erstellen"}
          </a>
        </div>
      </section>
    </main>
  );
}
