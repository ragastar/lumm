import { describe, it, expect } from "vitest";
import {
  findLaggardsWeekly,
  findLaggardsMonthly,
  formatMentions,
  composeWeeklyReminder,
  composeMonthlyReminder,
  currentWeekStart,
  monthIso,
} from "../reminders";

type TestMember = {
  id: string;
  displayName: string;
  telegramId: string | null;
  telegramUsername: string | null;
};

const alice: TestMember = { id: "a", displayName: "Alice", telegramId: "111", telegramUsername: "alice_tg" };
const bob: TestMember = { id: "b", displayName: "Bob", telegramId: null, telegramUsername: null };
const carol: TestMember = { id: "c", displayName: "Carol", telegramId: "333", telegramUsername: "carol_tg" };

describe("findLaggardsWeekly", () => {
  it("все сдали → пусто", () => {
    const reports = [
      { memberId: "a", weekStart: "2026-04-20" },
      { memberId: "b", weekStart: "2026-04-20" },
      { memberId: "c", weekStart: "2026-04-20" },
    ];
    expect(findLaggardsWeekly([alice, bob, carol], reports, "2026-04-20")).toEqual([]);
  });

  it("один не сдал → он в списке", () => {
    const reports = [
      { memberId: "a", weekStart: "2026-04-20" },
      { memberId: "c", weekStart: "2026-04-20" },
    ];
    expect(findLaggardsWeekly([alice, bob, carol], reports, "2026-04-20")).toEqual([bob]);
  });

  it("отчёты за другую неделю не считаются", () => {
    const reports = [{ memberId: "a", weekStart: "2026-04-13" }];
    const result = findLaggardsWeekly([alice], reports, "2026-04-20");
    expect(result).toEqual([alice]);
  });
});

describe("findLaggardsMonthly", () => {
  it("все сдали → пусто", () => {
    const financials = [
      { memberId: "a", month: "2026-04-01" },
      { memberId: "b", month: "2026-04-01" },
    ];
    expect(findLaggardsMonthly([alice, bob], financials, "2026-04-01")).toEqual([]);
  });

  it("один не сдал → он в списке", () => {
    const financials = [{ memberId: "a", month: "2026-04-01" }];
    expect(findLaggardsMonthly([alice, bob], financials, "2026-04-01")).toEqual([bob]);
  });

  it("финансы за другой месяц не считаются", () => {
    const financials = [{ memberId: "a", month: "2026-03-01" }];
    expect(findLaggardsMonthly([alice], financials, "2026-04-01")).toEqual([alice]);
  });
});

describe("formatMentions", () => {
  it("с telegramUsername → @telegramUsername", () => {
    expect(formatMentions([alice])).toBe("@alice_tg");
  });

  it("без telegramUsername → displayName без @", () => {
    expect(formatMentions([bob])).toBe("Bob");
  });

  it("смесь: запятая через пробел, @handle или имя", () => {
    expect(formatMentions([alice, bob, carol])).toBe("@alice_tg, Bob, @carol_tg");
  });

  it("пустой массив → пустая строка", () => {
    expect(formatMentions([])).toBe("");
  });
});

describe("composeWeeklyReminder", () => {
  it("пусто → null", () => {
    expect(composeWeeklyReminder([])).toBe(null);
  });

  it("один laggard", () => {
    const msg = composeWeeklyReminder([bob]);
    expect(msg).toContain("Bob");
    expect(msg).toContain("еженедельн");
  });
});

describe("composeMonthlyReminder", () => {
  it("пусто → null", () => {
    expect(composeMonthlyReminder([], "2026-04-16")).toBe(null);
  });

  it("включает дату встречи и список", () => {
    const msg = composeMonthlyReminder([alice, bob], "2026-04-16");
    expect(msg).toContain("16.04");
    expect(msg).toContain("@alice_tg");
    expect(msg).toContain("Bob");
    expect(msg).toContain("ежемесячн");
  });
});

describe("currentWeekStart", () => {
  it("понедельник → та же дата", () => {
    // 2026-04-20 — понедельник
    expect(currentWeekStart(new Date(2026, 3, 20))).toBe("2026-04-20");
  });

  it("воскресенье → предыдущий понедельник", () => {
    // 2026-04-26 — воскресенье. Понедельник той же ISO-недели — 20 апреля.
    expect(currentWeekStart(new Date(2026, 3, 26))).toBe("2026-04-20");
  });

  it("четверг → понедельник той же недели", () => {
    expect(currentWeekStart(new Date(2026, 3, 23))).toBe("2026-04-20");
  });
});

describe("monthIso", () => {
  it("возвращает первый день месяца", () => {
    expect(monthIso(new Date(2026, 3, 15))).toBe("2026-04-01");
    expect(monthIso(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(monthIso(new Date(2026, 11, 31))).toBe("2026-12-01");
  });
});
