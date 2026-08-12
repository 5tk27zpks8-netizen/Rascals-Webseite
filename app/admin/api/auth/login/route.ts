import { createAdminSession, safeAdminReturnTo, sessionCookie, verifyAdminPassword } from "../../../../lib/admin-auth";

function loginRedirect(error: string, returnTo: string) {
  const location = `/admin/login?error=${encodeURIComponent(error)}&return_to=${encodeURIComponent(returnTo)}`;
  return new Response(null, { status: 303, headers: { location } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const returnTo = safeAdminReturnTo(form.get("return_to"), "/admin");
  if (!email || !password) return loginRedirect("invalid", returnTo);

  const result = await verifyAdminPassword(email, password);
  if (!result.ok || !result.email) return loginRedirect(result.locked ? "locked" : "invalid", returnTo);

  const session = await createAdminSession(result.email);
  return new Response(null, {
    status: 303,
    headers: {
      location: returnTo,
      "set-cookie": sessionCookie(session.token),
      "cache-control": "no-store",
    },
  });
}
