import { createAdminSession, registerAdminUser, safeAdminReturnTo, sessionCookie } from "../../../../lib/admin-auth";

function registerRedirect(error: string, returnTo: string) {
  const location = `/admin/login?mode=register&error=${encodeURIComponent(error)}&return_to=${encodeURIComponent(returnTo)}`;
  return new Response(null, { status: 303, headers: { location } });
}

const errorForCode: Record<string, string> = {
  PASSWORD_TOO_SHORT: "password",
  INVALID_EMAIL: "email",
  ALREADY_REGISTERED: "exists",
};

export async function POST(request: Request) {
  const form = await request.formData();
  const returnTo = safeAdminReturnTo(form.get("return_to"), "/admin");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const displayName = String(form.get("display_name") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!email || !password) return registerRedirect("invalid", returnTo);
  if (password !== confirm) return registerRedirect("mismatch", returnTo);

  try {
    await registerAdminUser(email, password, displayName);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return registerRedirect(errorForCode[code] ?? "register", returnTo);
  }

  const session = await createAdminSession(email);
  return new Response(null, {
    status: 303,
    headers: {
      location: returnTo,
      "set-cookie": sessionCookie(session.token),
      "cache-control": "no-store",
    },
  });
}
