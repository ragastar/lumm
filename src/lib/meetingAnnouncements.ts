// src/lib/meetingAnnouncements.ts

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, members as membersTable } from "@/db/schema";
import { sendGroupMessage } from "./telegram";

export type AnnounceEvent = "created" | "cancelled";

export type AnnMeeting = {
  id: string;
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  kind: "standard" | "ad_hoc";
  location: string | null;
  price: number | null;
  title: string | null;
};

export type AnnOrganizer = { displayName: string; telegramUsername: string | null } | null;

export type AnnMember = { displayName: string; telegramUsername: string | null };

export type AnnouncementInput = {
  meeting: AnnMeeting;
  organizer: AnnOrganizer;
  members: AnnMember[]; // active group members (включая организатора)
  baseUrl: string; // "https://lumm.space"
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function mention(person: { displayName: string; telegramUsername: string | null }): string {
  return person.telegramUsername ? `@${person.telegramUsername}` : person.displayName;
}

function organizerLabel(org: AnnOrganizer): string {
  if (!org) return "ещё не назначен";
  return mention(org);
}

export function composeAnnouncement(event: AnnounceEvent, input: AnnouncementInput): string {
  const { meeting, organizer, members, baseUrl } = input;
  const date = formatDate(meeting.date);
  const time = `${meeting.timeStart}–${meeting.timeEnd}`;
  const url = `${baseUrl}/calendar/${meeting.id}`;

  const titleLine = meeting.title ? `📌 ${meeting.title}` : null;

  if (event === "cancelled") {
    const lines: string[] = [];
    if (titleLine) lines.push(titleLine);
    let cancelLine = `Встреча ${date} ${time} отменена.`;
    if (organizer) cancelLine += ` Организатор: ${mention(organizer)}.`;
    lines.push(cancelLine);
    return lines.join("\n");
  }

  // event === "created"
  if (meeting.kind === "standard") {
    const lines: string[] = [];
    if (titleLine) lines.push(titleLine);
    lines.push(
      `Следующий мастермайнд: ${date} ${time}`,
      `Ведёт: ${organizerLabel(organizer)}`,
      `Адрес: ${meeting.location ?? "не указан"}`,
    );
    if (meeting.price !== null && meeting.price > 0 && members.length > 0) {
      const perPerson = Math.round(meeting.price / members.length);
      lines.push(`Цена: ${meeting.price} ₽ (${perPerson} ₽/чел)`);
    }
    lines.push(`Детали и правки: ${url}`);
    return lines.join("\n");
  }

  // ad_hoc created
  const allMentions = members.map(mention).join(" ");
  const intro = organizer
    ? `${allMentions} — ${mention(organizer)} зовёт на доп. встречу ${date} ${time}.`
    : `${allMentions} — доп. встречу ${date} ${time}.`;
  const lines: string[] = [];
  if (titleLine) lines.push(titleLine);
  lines.push(intro, `Адрес: ${meeting.location ?? "не указан"}`);
  if (meeting.price !== null && meeting.price > 0 && members.length > 0) {
    const perPerson = Math.round(meeting.price / members.length);
    lines.push(`Цена: ${meeting.price} ₽ (${perPerson} ₽/чел)`);
  }
  lines.push(`Записаться: ${url}`);
  return lines.join("\n");
}

// --- IO-адаптер ---

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://lumm.space";

export async function announceMeeting(meetingId: string, event: AnnounceEvent): Promise<void> {
  const chatId = process.env.GROUP_CHAT_ID;
  if (!chatId) {
    console.error("[announceMeeting] GROUP_CHAT_ID не задан — пропускаю отправку");
    return;
  }

  const rows = await db
    .select({
      id: meetings.id,
      groupId: meetings.groupId,
      date: meetings.date,
      timeStart: meetings.timeStart,
      timeEnd: meetings.timeEnd,
      kind: meetings.kind,
      location: meetings.location,
      price: meetings.price,
      title: meetings.title,
      organizerDisplayName: membersTable.displayName,
      organizerUsername: membersTable.telegramUsername,
    })
    .from(meetings)
    .leftJoin(membersTable, eq(meetings.organizerId, membersTable.id))
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (rows.length === 0) {
    console.error(`[announceMeeting] meeting ${meetingId} not found`);
    return;
  }
  const r = rows[0];

  const organizer: AnnOrganizer = r.organizerDisplayName
    ? { displayName: r.organizerDisplayName, telegramUsername: r.organizerUsername }
    : null;

  // members нужны только для ad_hoc created и для расчёта per-person.
  let activeMembers: AnnMember[] = [];
  if (event === "created") {
    const poolRows = await db
      .select({ displayName: membersTable.displayName, telegramUsername: membersTable.telegramUsername })
      .from(membersTable)
      .where(and(eq(membersTable.groupId, r.groupId), eq(membersTable.status, "active")));
    activeMembers = poolRows;
  }

  const text = composeAnnouncement(event, {
    meeting: {
      id: r.id,
      date: r.date,
      timeStart: r.timeStart,
      timeEnd: r.timeEnd,
      kind: r.kind,
      location: r.location,
      price: r.price,
      title: r.title,
    },
    organizer,
    members: activeMembers,
    baseUrl: BASE_URL,
  });

  try {
    await sendGroupMessage({ chatId, text });
  } catch (err) {
    console.error("[announceMeeting] sendGroupMessage failed:", err);
  }
}
