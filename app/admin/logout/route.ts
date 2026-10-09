/** Sign-out moved to the public /logout route; keep the old path working. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to");
  const target = new URL("/logout", url.origin);
  if (returnTo) target.searchParams.set("return_to", returnTo);
  return new Response(null, { status: 307, headers: { location: target.pathname + target.search } });
}
