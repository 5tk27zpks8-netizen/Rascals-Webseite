import { createAdminSession, registerAdminUser, safeAdminReturnTo, sessionCookie } from "../../../lib/admin-auth";

function registerRedirect(error: string, returnTo: string, detail?: string) {
  const params = new URLSearchParams({ mode: "register", error, return_to: returnTo });
  // Only unexpected failures carry a detail. Without it a database or schema
  // problem is indistinguishable from a typo, and the person hitting it has no
  // way to tell anyone what actually broke.
  if (detail) params.set("detail", detail.slice(0, 200));
  return new Response(null, { status: 303, headers: { location: `/login?${params}` } });
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
    const known = errorForCode[code];
    if (known) return registerRedirect(known, returnTo);
    console.error("registration failed", error);
    return registerRedirect("register", returnTo, code || String(error));
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
