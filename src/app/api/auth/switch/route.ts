import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { memberId } = await request.json();

  const cookieStore = await cookies();
  cookieStore.set("lumm_member_id", memberId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return Response.json({ ok: true, memberId });
}
