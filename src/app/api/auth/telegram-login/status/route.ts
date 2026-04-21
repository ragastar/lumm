import { getNonce } from "@/lib/nonces";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nonce = url.searchParams.get("nonce");

  if (!nonce) {
    return Response.json({ error: "nonce обязателен" }, { status: 400 });
  }

  const row = await getNonce(nonce);

  if (!row) {
    return Response.json({ status: "not_found" });
  }

  return Response.json({
    status: row.status,
    memberId: row.memberId ?? null,
  });
}
