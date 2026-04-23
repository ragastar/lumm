import { describe, it, expect } from "vitest";
import { composeAnnouncement } from "../meetingAnnouncements";

type TestMeeting = {
  id: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  kind: "standard" | "ad_hoc";
  location: string | null;
  price: number | null;
};

type TestOrganizer = { displayName: string; telegramUsername: string | null } | null;
type TestMember = { displayName: string; telegramUsername: string | null };

const meetingBase: TestMeeting = {
  id: "m-1",
  date: "2026-05-21",
  timeStart: "19:00",
  timeEnd: "21:00",
  kind: "standard",
  location: "кафе Место",
  price: null,
};

const orgWithHandle: TestOrganizer = { displayName: "Theragastar", telegramUsername: "Theragastar" };
const orgNoHandle: TestOrganizer = { displayName: "Vasya", telegramUsername: null };
const baseUrl = "https://lumm.space";

describe("composeAnnouncement — standard created", () => {
  it("без цены — строка про цену отсутствует", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard", price: null },
      organizer: orgWithHandle,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("Следующий мастермайнд");
    expect(msg).toContain("21.05.2026");
    expect(msg).toContain("19:00–21:00");
    expect(msg).toContain("@Theragastar");
    expect(msg).toContain("Адрес: кафе Место");
    expect(msg).not.toContain("Цена");
    expect(msg).toContain(`${baseUrl}/calendar/m-1`);
  });

  it("с ценой — показывает total и per-person", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard", price: 5000 },
      organizer: orgWithHandle,
      members: [
        { displayName: "a", telegramUsername: null },
        { displayName: "b", telegramUsername: null },
        { displayName: "c", telegramUsername: null },
        { displayName: "d", telegramUsername: null },
        { displayName: "e", telegramUsername: null },
      ],
      baseUrl,
    });
    expect(msg).toContain("5000 ₽");
    expect(msg).toContain("1000 ₽/чел");
  });

  it("адрес null — «не указан»", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard", location: null },
      organizer: orgWithHandle,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("Адрес: не указан");
  });

  it("organizer без @handle — просто имя", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard" },
      organizer: orgNoHandle,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("Ведёт: Vasya");
    expect(msg).not.toContain("@Vasya");
  });

  it("organizer null — «ещё не назначен»", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "standard" },
      organizer: null,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("Ведёт: ещё не назначен");
  });
});

describe("composeAnnouncement — ad_hoc created", () => {
  it("пингует всех с @ + имена без @, включает организатора и ссылку", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "ad_hoc", price: null },
      organizer: orgWithHandle,
      members: [
        { displayName: "Alice", telegramUsername: "alice_tg" },
        { displayName: "Bob", telegramUsername: null },
        { displayName: "Carol", telegramUsername: "carol_tg" },
      ],
      baseUrl,
    });
    expect(msg).toContain("@alice_tg");
    expect(msg).toContain("Bob");
    expect(msg).not.toMatch(/@Bob\b/);
    expect(msg).toContain("@carol_tg");
    expect(msg).toContain("@Theragastar");
    expect(msg).toContain("доп. встречу");
    expect(msg).toContain("21.05.2026");
    expect(msg).toContain("19:00–21:00");
    expect(msg).toContain(`${baseUrl}/calendar/m-1`);
  });

  it("с ценой — total и per-person делится на число members", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "ad_hoc", price: 3000 },
      organizer: orgWithHandle,
      members: [
        { displayName: "a", telegramUsername: "a" },
        { displayName: "b", telegramUsername: "b" },
      ],
      baseUrl,
    });
    expect(msg).toContain("3000 ₽");
    expect(msg).toContain("1500 ₽/чел");
  });

  it("без организатора — просто «зовёт на доп. встречу» без имени", () => {
    const msg = composeAnnouncement("created", {
      meeting: { ...meetingBase, kind: "ad_hoc" },
      organizer: null,
      members: [{ displayName: "a", telegramUsername: "a" }],
      baseUrl,
    });
    expect(msg).toContain("доп. встречу");
    expect(msg).not.toContain("зовёт на");
  });
});

describe("composeAnnouncement — cancelled", () => {
  it("формат единый для обоих kind, включает дату/время/organizer", () => {
    const msg = composeAnnouncement("cancelled", {
      meeting: { ...meetingBase, kind: "standard" },
      organizer: orgWithHandle,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("отменена");
    expect(msg).toContain("21.05.2026");
    expect(msg).toContain("19:00–21:00");
    expect(msg).toContain("@Theragastar");
  });

  it("cancelled без организатора — без упоминания организатора", () => {
    const msg = composeAnnouncement("cancelled", {
      meeting: { ...meetingBase, kind: "ad_hoc" },
      organizer: null,
      members: [],
      baseUrl,
    });
    expect(msg).toContain("отменена");
    expect(msg).not.toContain("Организатор");
  });
});
