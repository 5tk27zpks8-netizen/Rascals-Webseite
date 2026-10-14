import { accessAccountFor, createAdminSession, getAdminSessionIdentity, safeAdminReturnTo, sessionCookie } from "../../../lib/admin-auth";
import { cloudflareAccessEmail } from "../../../lib/cf-access";

/**
 * The handover from Cloudflare Access to a session on this site.
 *
 * Getting to /admin already means passing Access, so this turns that into a
 * session here instead of asking for an e-mail and a password that prove the
 * same thing a second time.
 *
 * It is a route handler rather than something the login page does while it
 * renders, because the only thing that comes out of it is a cookie, and a
 * page being rendered cannot set one.
 *
 * EVERY WAY OUT OF HERE IS A REDIRECT WITH AN ERROR ON IT, and that is load
 * bearing: the login page sends people here when Access vouches for them, so
 * a failure that sent them back bare would be sent straight here again. The
 * error parameter is what the page checks to know not to try a second time.
 */
function backToLogin(reason: string, returnTo: string) {
  const params = new URLSearchParams({ error: reason, return_to: returnTo });
  return new Response(null, {
    status: 303,
    headers: { location: `/login?${params}`, "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeAdminReturnTo(url.searchParams.get("return_to"), "/admin");

  // Already signed in: nothing to do, and re-issuing a session on every visit
  // would quietly reset the eight hours it is good for.
  if (await getAdminSessionIdentity(request.headers)) {
    return new Response(null, { status: 303, headers: { location: returnTo, "cache-control": "no-store" } });
  }

  const email = await cloudflareAccessEmail(request.headers);
  if (!email) return backToLogin("sso", returnTo);

  const account = await accessAccountFor(email);
  if ("pending" in account) return backToLogin("pending", returnTo);

  const session = await createAdminSession(account.email);
  return new Response(null, {
    status: 303,
    headers: {
      location: returnTo,
      "set-cookie": sessionCookie(session.token),
      "cache-control": "no-store",
    },
  });
}
