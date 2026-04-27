import { Bot } from "grammy";
import { handleReport } from "./handleReport";
import { handleSteering } from "./handleSteering";
import { startScheduler } from "./scheduler";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://lumm.space";

const bot = new Bot(token);

bot.command("start", (ctx) => ctx.reply("LUMM Bot запущен. Пиши еженедельные отчёты в группе."));

bot.on("message:text", async (ctx) => {
  console.log(
    "[bot] incoming text from",
    ctx.from?.id,
    "(@" + (ctx.from?.username ?? "no-username") + ")",
    "chat",
    ctx.chat?.id,
    "(" + ctx.chat?.type + ")",
    "text:",
    JSON.stringify(ctx.message.text.slice(0, 200)),
  );
  if (!ctx.from?.id) return;

  const reply = async (msg: string) => {
    await ctx.reply(msg, { reply_parameters: { message_id: ctx.message.message_id } });
  };

  try {
    const handled = await handleSteering({
      text: ctx.message.text,
      fromId: String(ctx.from.id),
      reply,
      baseUrl,
      botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "lummbrain_bot",
    });
    if (handled) return;

    await handleReport({
      text: ctx.message.text,
      fromId: String(ctx.from.id),
      reply,
      baseUrl,
    });
  } catch (err) {
    console.error("[bot] handler crashed:", err);
    try {
      await ctx.reply("Что-то пошло не так. Попробуй через минуту.");
    } catch {
      /* swallow */
    }
  }
});

bot.catch((err) => {
  console.error("[bot] grammy error:", err);
});

bot.start({
  onStart: () => {
    console.log("LUMM Bot started (long-polling)");
    startScheduler();
  },
});
