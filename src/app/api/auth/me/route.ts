import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  return Response.json({
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl,
    groupId: user.groupId,
    telegramId: user.telegramId,
  });
}
