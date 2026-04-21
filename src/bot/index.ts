import { Bot } from "grammy";
import { registerLoginHandlers } from "./login-handlers";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

const bot = new Bot(token);

registerLoginHandlers(bot);

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: () => console.log("LUMM Bot started (long-polling)"),
});
