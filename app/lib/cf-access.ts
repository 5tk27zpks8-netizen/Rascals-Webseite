import { env } from "cloudflare:workers";

/**
 * SIGNING IN ONCE INSTEAD OF TWICE.
 *
 * /admin sits behind Cloudflare Access, so getting there already means
 * proving who you are — and then the site asked for an e-mail and a password
 * on top of it. Two logins for one person, the second one carrying no
 * information the first had not already established.
 *
 * Access tells us who it let through. The problem is that it tells us in a
 * request header, and permissions.ts is right about those: a header is
 * whatever the client typed. The Worker answers on its workers.dev hostname
 * as well as through the proxied domain, so anyone could send
 * `Cf-Access-Authenticated-User-Email: <any admin>` straight at it and be
 * that admin. Trusting that header is not a shortcut, it is an open door.
 *
 * What Access also sends is a signed assertion — a JWT in
 * `Cf-Access-Jwt-Assertion`, and in the `CF_Authorization` cookie — and that
 * cannot be made up, because it is signed by keys only the team has. So this
 * verifies the signature itself and takes the e-mail out of the payload. A
 * forged header gets nowhere: it has no valid signature to go with it.
 *
 * ---------------------------------------------------------------------
 * IT IS OFF UNTIL IT IS CONFIGURED, AND THAT IS THE POINT
 *
 * Verification needs two things that cannot be guessed and must not be
 * inferred from the token itself:
 *
 *   CF_ACCESS_TEAM_DOMAIN  the Zero Trust team, e.g. "hellenstein" or the
 *                          whole "hellenstein.cloudflareaccess.com"
 *   CF_ACCESS_AUD          the Application Audience tag of the Access
 *                          application in front of /admin
 *
 * The issuer has to be pinned because the token says where its own keys live;
 * believing that would let anybody host their own key set and sign their own
 * admin. The audience has to be pinned because a token minted for one
 * application in the team is otherwise good for every other one.
 *
 * With either missing this returns null for every request and the password
 * form stays exactly as it was. A half-configured single sign-on that still
 * lets people in would be worse than none.
 */

const CERTS_TTL_MS = 60 * 60_000;

type Jwks = { keys: JsonWebKey[] };

let cachedCerts: { issuer: string; keys: Map<string, CryptoKey>; fetchedAt: number } | null = null;

function setting(name: string): string {
  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" ? value.trim() : "";
}

/** The team's issuer URL, however the team was written down. */
function issuerUrl(): string | null {
  const team = setting("CF_ACCESS_TEAM_DOMAIN").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!team) return null;
  const host = team.includes(".") ? team : `${team}.cloudflareaccess.com`;
  return `https://${host}`;
}

function decodeSegment(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function signatureBytes(segment: string): ArrayBuffer {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * The team's public keys, kept for an hour.
 *
 * Cloudflare rotates these, so they cannot be pinned, but fetching them on
 * every request would put a round trip in front of every admin page load.
 * An hour is short enough that a rotation is picked up on its own and long
 * enough that the fetch effectively never happens.
 */
async function verificationKeys(issuer: string): Promise<Map<string, CryptoKey>> {
  const fresh = cachedCerts && cachedCerts.issuer === issuer && Date.now() - cachedCerts.fetchedAt < CERTS_TTL_MS;
  if (fresh && cachedCerts) return cachedCerts.keys;

  const response = await fetch(`${issuer}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`access certs ${response.status}`);
  const jwks = (await response.json()) as Jwks;

  const keys = new Map<string, CryptoKey>();
  for (const jwk of jwks.keys ?? []) {
    const kid = (jwk as { kid?: string }).kid;
    if (!kid) continue;
    keys.set(
      kid,
      await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]),
    );
  }
  cachedCerts = { issuer, keys, fetchedAt: Date.now() };
  return keys;
}

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * The e-mail address Cloudflare Access signed for, or null.
 *
 * Null covers every "we cannot be sure" case and they are deliberately not
 * told apart: not configured, no token, expired, wrong audience, wrong
 * issuer, bad signature. The caller does the same thing in all of them —
 * show the password form — and a caller that could tell them apart would
 * sooner or later be tempted to treat one of them as good enough.
 */
export async function cloudflareAccessEmail(requestHeaders: Headers): Promise<string | null> {
  const issuer = issuerUrl();
  const audience = setting("CF_ACCESS_AUD");
  if (!issuer || !audience) return null;

  /* The header is what Access adds on the routes it protects; the cookie is
     what the browser carries everywhere on the domain. Reading both means
     sign-in also works on /login, which is deliberately public and therefore
     never gets the header. */
  const token =
    requestHeaders.get("cf-access-jwt-assertion") ||
    cookieValue(requestHeaders.get("cookie"), "CF_Authorization");
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header = decodeSegment(parts[0]) as { alg?: string; kid?: string };
    const payload = decodeSegment(parts[1]) as {
      aud?: string | string[];
      email?: string;
      exp?: number;
      iss?: string;
      nbf?: number;
    };

    if (header.alg !== "RS256" || !header.kid) return null;
    if (payload.iss !== issuer) return null;

    const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
    if (!audiences.includes(audience)) return null;

    /* A minute of slack, because the clock here and the clock that signed the
       token are not the same clock, and a token rejected one second early
       sends somebody back to a login screen they just came from. */
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp + 60 < now) return null;
    if (typeof payload.nbf === "number" && payload.nbf - 60 > now) return null;

    const email = (payload.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) return null;

    const key = (await verificationKeys(issuer)).get(header.kid);
    if (!key) return null;

    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`).buffer;
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signatureBytes(parts[2]), signed);
    return ok ? email : null;
  } catch (error) {
    console.error("cloudflare access token rejected", error);
    return null;
  }
}

/** Whether single sign-on is configured at all, for what the login page says. */
export function cloudflareAccessConfigured(): boolean {
  return Boolean(issuerUrl() && setting("CF_ACCESS_AUD"));
}
