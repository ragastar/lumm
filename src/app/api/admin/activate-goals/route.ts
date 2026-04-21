import { getCurrentUser } from "@/lib/session";
import { sendGroupMessage } from "@/lib/telegram";

const MESSAGE = `Друзья, команда Level Up!

Время зафиксировать цели на этот сезон — бизнес и спорт.

Зайди в https://lumm.space/profile → «Мои цели».

Как заполнимся — двинем дальше по программе.`;

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }

  const chatId = process.env.GROUP_CHAT_ID;
  if (!chatId) {
    return Response.json({ error: "GROUP_CHAT_ID не задан в .env" }, { status: 500 });
  }

  try {
    await sendGroupMessage({ chatId, text: MESSAGE });
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
    return Response.json({ error: msg }, { status: 502 });
  }
}
