import { cookies } from "next/headers";

export async function getCurrentMemberId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("lumm_member_id")?.value ?? null;
}
