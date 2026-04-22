import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyze } from "../analyzer";

const realFetch = global.fetch;
const realKey = process.env.OPENROUTER_API_KEY;

const GOALS = { business: "запустить продукт X", sport: "полумарафон 1:45" };
const REPORT = "Закрыл 2 сделки, пробежал 5 км";

function okResponse(json: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(json) } }],
    }),
  };
}

function validAnalysis() {
  return {
    traffic_light: "yellow" as const,
    did: "Две сделки и 5 км",
    missed: "Спорт в половину от цели",
    next_question: "Где найти темп для длинных пробежек?",
    coach: "Движение есть, но спорт просел. Не давай себе забить.",
  };
}

describe("analyze", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = realFetch;
    process.env.OPENROUTER_API_KEY = realKey;
  });

  it("posts to OpenRouter with correct body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(validAnalysis()));
    global.fetch = fetchMock as unknown as typeof fetch;

    await analyze({ goals: GOALS, reportText: REPORT });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("anthropic/claude-sonnet-4-6");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toContain("запустить продукт X");
    expect(body.messages[1].content).toContain("полумарафон 1:45");
    expect(body.messages[1].content).toContain(REPORT);
  });

  it("parses valid JSON response into Analysis", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(validAnalysis())) as unknown as typeof fetch;
    const a = await analyze({ goals: GOALS, reportText: REPORT });
    expect(a.trafficLight).toBe("yellow");
    expect(a.did).toBe("Две сделки и 5 км");
    expect(a.missed).toBe("Спорт в половину от цели");
    expect(a.nextQuestion).toBe("Где найти темп для длинных пробежек?");
    expect(a.coach).toContain("Движение есть");
    expect(a.model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("retries once on invalid JSON, then succeeds", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "not a json" } }] }) })
      .mockResolvedValueOnce(okResponse(validAnalysis()));
    global.fetch = fetchMock as unknown as typeof fetch;

    const a = await analyze({ goals: GOALS, reportText: REPORT });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(a.trafficLight).toBe("yellow");
  });

  it("throws after two invalid JSON responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "still not json" } }] }),
    }) as unknown as typeof fetch;

    await expect(analyze({ goals: GOALS, reportText: REPORT })).rejects.toThrow(/LLM/);
  });

  it("throws on missing required fields in response", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ traffic_light: "green" })) as unknown as typeof fetch;
    await expect(analyze({ goals: GOALS, reportText: REPORT })).rejects.toThrow();
  });

  it("throws on invalid traffic_light value", async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ ...validAnalysis(), traffic_light: "purple" })) as unknown as typeof fetch;
    await expect(analyze({ goals: GOALS, reportText: REPORT })).rejects.toThrow();
  });

  it("retries on HTTP 5xx", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
      .mockResolvedValueOnce(okResponse(validAnalysis()));
    global.fetch = fetchMock as unknown as typeof fetch;

    const a = await analyze({ goals: GOALS, reportText: REPORT });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(a.trafficLight).toBe("yellow");
  });

  it("throws when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(analyze({ goals: GOALS, reportText: REPORT })).rejects.toThrow(/OPENROUTER_API_KEY/);
  });
});
