import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendGroupMessage } from "../telegram";

const realFetch = global.fetch;
const realToken = process.env.TELEGRAM_BOT_TOKEN;

describe("sendGroupMessage", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
  });

  afterEach(() => {
    global.fetch = realFetch;
    process.env.TELEGRAM_BOT_TOKEN = realToken;
  });

  it("posts to Telegram sendMessage with chat_id and text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendGroupMessage({ chatId: "-100123", text: "hello" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bottest-token/sendMessage");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.chat_id).toBe("-100123");
    expect(body.text).toBe("hello");
  });

  it("passes parse_mode when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendGroupMessage({ chatId: "-1", text: "t", parseMode: "HTML" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.parse_mode).toBe("HTML");
  });

  it("throws when Telegram returns ok:false", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, description: "chat not found" }),
    }) as unknown as typeof fetch;

    await expect(sendGroupMessage({ chatId: "-1", text: "t" })).rejects.toThrow("chat not found");
  });

  it("throws when TELEGRAM_BOT_TOKEN is missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await expect(sendGroupMessage({ chatId: "-1", text: "t" })).rejects.toThrow(/TELEGRAM_BOT_TOKEN/);
  });
});
