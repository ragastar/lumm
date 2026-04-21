import type { Bot } from "grammy";
import { db } from "@/db";
import { members, invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getNonce, confirmNonce } from "@/lib/nonces";
import { randomUUID } from "crypto";

export function registerLoginHandlers(bot: Bot) {
  bot.command("start", async (ctx) => {
    const payload = ctx.match;

    if (!payload || !payload.startsWith("tg_")) {
      await ctx.reply("LUMM Bot. Чтобы войти на сайт, нажмите «Войти через Telegram» на lumm.space.");
      return;
    }

    const nonce = payload;
    const row = await getNonce(nonce);

    if (!row || row.status === "expired") {
      await ctx.reply("⏱ Ссылка устарела. Вернитесь на сайт и попробуйте снова.");
      return;
    }

    if (row.status === "confirmed") {
      await ctx.reply("Этот запрос уже подтверждён.");
      return;
    }

    await ctx.reply("Подтвердите вход в LUMM:", {
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Войти", callback_data: `confirm:${nonce}` }]],
      },
    });
  });

  bot.callbackQuery(/^confirm:(.+)$/, async (ctx) => {
    const nonce = ctx.match[1];
    const telegramId = String(ctx.from.id);

    const row = await getNonce(nonce);

    if (!row) {
      await ctx.answerCallbackQuery({ text: "Запрос не найден", show_alert: true });
      return;
    }

    if (row.status === "expired") {
      await ctx.answerCallbackQuery({ text: "Ссылка устарела", show_alert: true });
      return;
    }

    if (row.status === "confirmed") {
      await ctx.answerCallbackQuery({ text: "Уже подтверждено", show_alert: true });
      return;
    }

    let memberId: string;

    if (row.purpose === "login") {
      const memberRows = await db
        .select()
        .from(members)
        .where(eq(members.telegramId, telegramId))
        .limit(1);

      if (memberRows.length === 0) {
        await ctx.answerCallbackQuery({
          text: "Вы не зарегистрированы. Попросите админа прислать ссылку-приглашение.",
          show_alert: true,
        });
        return;
      }
      memberId = memberRows[0].id;
    } else {
      // purpose === "invite"
      if (!row.inviteToken) {
        await ctx.answerCallbackQuery({ text: "Приглашение не привязано", show_alert: true });
        return;
      }

      const inviteRows = await db
        .select()
        .from(invites)
        .where(eq(invites.token, row.inviteToken))
        .limit(1);

      if (inviteRows.length === 0) {
        await ctx.answerCallbackQuery({ text: "Приглашение не найдено", show_alert: true });
        return;
      }

      const invite = inviteRows[0];
      if (invite.usedCount >= invite.maxUses) {
        await ctx.answerCallbackQuery({ text: "Приглашение исчерпано", show_alert: true });
        return;
      }
      if (new Date(invite.expiresAt) < new Date()) {
        await ctx.answerCallbackQuery({ text: "Приглашение истекло", show_alert: true });
        return;
      }

      const existing = await db
        .select()
        .from(members)
        .where(eq(members.telegramId, telegramId))
        .limit(1);

      if (existing.length > 0) {
        await ctx.answerCallbackQuery({
          text: "Этот Telegram уже зарегистрирован",
          show_alert: true,
        });
        return;
      }

      memberId = randomUUID();
      const firstName = ctx.from.first_name || "Участник";
      const now = new Date().toISOString();

      await db.insert(members).values({
        id: memberId,
        groupId: invite.groupId,
        telegramId,
        displayName: firstName,
        role: "member",
        status: "active",
        avatarColor: "#c9a84c",
        createdAt: now,
      });

      await db
        .update(invites)
        .set({ usedCount: invite.usedCount + 1, usedBy: memberId, usedAt: now })
        .where(eq(invites.id, invite.id));
    }

    await confirmNonce(nonce, memberId, telegramId);

    await ctx.answerCallbackQuery({ text: "Готово" });
    await ctx.editMessageText("✅ Вход подтверждён. Вернитесь на сайт.");
  });
}
