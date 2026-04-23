// src/lib/meetingAnnouncements.ts

export type AnnounceEvent = "created" | "cancelled";

export type AnnMeeting = {
  id: string;
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  kind: "standard" | "ad_hoc";
  location: string | null;
  price: number | null;
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

  if (event === "cancelled") {
    const lines = [`Встреча ${date} ${time} отменена.`];
    if (organizer) {
      lines[0] += ` Организатор: ${mention(organizer)}.`;
    }
    return lines.join("\n");
  }

  // event === "created"
  if (meeting.kind === "standard") {
    const lines = [
      `Следующий мастермайнд: ${date} ${time}`,
      `Ведёт: ${organizerLabel(organizer)}`,
      `Адрес: ${meeting.location ?? "не указан"}`,
    ];
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
  const lines = [
    intro,
    `Адрес: ${meeting.location ?? "не указан"}`,
  ];
  if (meeting.price !== null && meeting.price > 0 && members.length > 0) {
    const perPerson = Math.round(meeting.price / members.length);
    lines.push(`Цена: ${meeting.price} ₽ (${perPerson} ₽/чел)`);
  }
  lines.push(`Записаться: ${url}`);
  return lines.join("\n");
}
