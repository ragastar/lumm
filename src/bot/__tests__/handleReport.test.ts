import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/analyzer", () => ({
  analyze: vi.fn(),
}));

import { handleReport } from "../handleReport";
import { db } from "@/db";
import { analyze } from "@/lib/analyzer";

const replyMock = vi.fn();

function baseInput(overrides: Partial<{ text: string; fromId: string }> = {}) {
  return {
    text: "@lummbrain_bot Еженедельный отчёт всё норм",
    fromId: "123456789",
    reply: replyMock,
    baseUrl: "https://lumm.space",
    ...overrides,
  };
}

function mockSelectReturning(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  (db.select as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ from });
}

function mockInsert() {
  const values = vi.fn().mockResolvedValue(undefined);
  (db.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ values });
  return values;
}

describe("handleReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing on non-trigger text", async () => {
    await handleReport(baseInput({ text: "@lummbrain_bot напомни завтра" }));
    expect(replyMock).not.toHaveBeenCalled();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("asks to link account when member not found", async () => {
    mockSelectReturning([]);
    await handleReport(baseInput());
    expect(replyMock).toHaveBeenCalledOnce();
    expect(replyMock.mock.calls[0][0]).toMatch(/не привязан/i);
  });

  it("asks to fill goals when businessGoal is missing", async () => {
    mockSelectReturning([{
      id: "m1", displayName: "Саша", businessGoal: null, sportGoal: "полумарафон",
    }]);
    await handleReport(baseInput());
    expect(replyMock).toHaveBeenCalledOnce();
    expect(replyMock.mock.calls[0][0]).toMatch(/цели/i);
    expect(replyMock.mock.calls[0][0]).toMatch(/Саша/);
  });

  it("happy path: saves report, analysis, replies with link", async () => {
    mockSelectReturning([{
      id: "m1", displayName: "Саша", businessGoal: "запустить продукт", sportGoal: "полумарафон",
    }]);
    const insertValues = mockInsert();
    (analyze as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      trafficLight: "green",
      did: "сделано",
      missed: "ничего",
      nextQuestion: "что дальше?",
      coach: "молодец",
      model: "anthropic/claude-sonnet-4-6",
    });

    await handleReport(baseInput());

    expect(analyze).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledTimes(2); // weekly_reports + report_analyses
    expect(replyMock).toHaveBeenCalledOnce();
    const reply = replyMock.mock.calls[0][0] as string;
    expect(reply).toMatch(/Саша/);
    expect(reply).toMatch(/lumm.space\/reports\//);
  });

  it("on analyzer failure: saves report, no analysis, apologizes in reply", async () => {
    mockSelectReturning([{
      id: "m1", displayName: "Саша", businessGoal: "X", sportGoal: "Y",
    }]);
    const insertValues = mockInsert();
    (analyze as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("LLM down"));

    await handleReport(baseInput());

    expect(insertValues).toHaveBeenCalledOnce(); // только weekly_reports
    expect(replyMock).toHaveBeenCalledOnce();
    expect(replyMock.mock.calls[0][0]).toMatch(/анализ не получился/i);
  });
});
