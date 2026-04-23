import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, feedbackItems } from "@/db/schema";
import { matchSteeringTrigger } from "./steeringTrigger";

export type SteeringInput = {
  text: string;
  fromId: string;
  reply: (msg: string) => Promise<void> | void;
  baseUrl: string;
  botUsername: string;
};

export async function handleSteering(input: SteeringInput): Promise<boolean> {
  const body = matchSteeringTrigger(input.text, input.botUsername);
  if (!body) return false;

  const rows = await db
    .select({ id: members.id, status: members.status })
    .from(members)
    .where(eq(members.telegramId, input.fromId))
    .limit(1);

  if (rows.length === 0) {
    await input.reply(
      "Не вижу тебя в системе. Админ должен привязать Telegram ID в /admin/members.",
    );
    return true;
  }

  if (rows[0].status !== "active") {
    await input.reply("Ты сейчас неактивен, штурвал не принят.");
    return true;
  }

  const now = new Date().toISOString();
  await db.insert(feedbackItems).values({
    id: randomUUID(),
    memberId: rows[0].id,
    text: body,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });

  await input.reply(`✅ Записал, спасибо. Можно посмотреть на ${input.baseUrl}/feedback`);
  return true;
}
