import { dispatch } from "@/lib/server/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  return dispatch(request, path);
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
export async function HEAD(request: Request, context: Context) {
  const response = await handle(new Request(request, { method: "GET" }), context);
  return new Response(null, { status: response.status, headers: response.headers });
}
