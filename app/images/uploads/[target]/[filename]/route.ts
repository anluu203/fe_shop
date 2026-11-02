import { serveImage } from "@/lib/server/assets";
import { errorResponse } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ target: string; filename: string }> }) {
  try { const { target, filename } = await params; return await serveImage(target, filename); }
  catch (error) { return errorResponse(error); }
}
