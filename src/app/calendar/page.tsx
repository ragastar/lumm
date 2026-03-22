import { db } from "@/db";
import { meetings, members } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function CalendarPage() {
  const allMeetings = await db
    .select({
      meeting: meetings,
      organizerName: members.displayName,
      organizerColor: members.avatarColor,
    })
    .from(meetings)
    .leftJoin(members, eq(meetings.organizerId, members.id))
    .orderBy(desc(meetings.date));

  const upcoming = allMeetings.filter((m) => m.meeting.status === "scheduled");
  const past = allMeetings.filter((m) => m.meeting.status === "completed");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Календарь встреч</h1>
        <p className="text-lumm-text-secondary mt-1">
          Третий четверг каждого месяца
        </p>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-medium text-lumm-gold mb-4">Предстоящие</h2>
        <div className="space-y-4">
          {upcoming.length === 0 && (
            <p className="text-lumm-text-secondary text-sm">
              Нет запланированных встреч
            </p>
          )}
          {upcoming.map((m) => {
            const days = daysUntil(m.meeting.date);
            return (
              <div
                key={m.meeting.id}
                className="bg-gradient-to-r from-lumm-gold/10 to-lumm-gold/5 border border-lumm-gold/20 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
              >
                <div className="text-center min-w-[80px]">
                  <p className="text-3xl font-bold text-lumm-gold">{days}</p>
                  <p className="text-xs text-lumm-text-secondary">
                    {days === 1 ? "день" : "дней"}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium capitalize">
                    {new Date(m.meeting.date + "T00:00:00").toLocaleDateString(
                      "ru-RU",
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                  <p className="text-sm text-lumm-text-secondary mt-1">
                    {m.meeting.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-lumm-dark"
                    style={{
                      backgroundColor: m.organizerColor ?? "#c9a84c",
                    }}
                  >
                    {m.organizerName?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.organizerName}</p>
                    <p className="text-xs text-lumm-text-secondary">
                      организатор
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past */}
      <div>
        <h2 className="text-sm font-medium text-lumm-text-secondary mb-4">
          Прошедшие
        </h2>
        <div className="space-y-2">
          {past.map((m) => (
            <div
              key={m.meeting.id}
              className="bg-lumm-black border border-lumm-gray-light rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
            >
              <p className="text-sm text-lumm-text-secondary w-40">
                {new Date(m.meeting.date + "T00:00:00").toLocaleDateString(
                  "ru-RU",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
              <p className="text-sm flex-1">{m.meeting.location}</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-lumm-dark"
                  style={{
                    backgroundColor: m.organizerColor ?? "#c9a84c",
                  }}
                >
                  {m.organizerName?.[0] ?? "?"}
                </div>
                <span className="text-sm text-lumm-text-secondary">
                  {m.organizerName}
                </span>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400">
                проведена
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
