import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-lumm-text-primary">Как это работает</h1>
        <p className="text-sm text-lumm-text-secondary mt-1">
          Коротко про отчёты, светофор, цели, встречи, бот-напоминания и штурвал.
        </p>
      </div>

      {/* Как писать отчёт */}
      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-lumm-text-primary">1. Как писать отчёт</h2>
        <p className="text-sm text-lumm-text-secondary">
          В групповом чате LUMM напиши сообщение, которое содержит упоминание бота{" "}
          <code className="text-lumm-gold">@lummbrain_bot</code> и слово «отчёт» (или «еженедельный отчёт»).
          Бот возьмёт весь остальной текст как содержимое отчёта.
        </p>
        <div className="bg-lumm-gray-dark border border-lumm-gray-light rounded-lg p-4">
          <p className="text-xs text-lumm-text-secondary uppercase tracking-wide mb-2">Пример</p>
          <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans">
{`@lummbrain_bot Еженедельный отчёт
Бизнес: закрыл 2 сделки, запустил посадочную. План не дожал.
Спорт: пробежал 3 раза по 5 км, в тренажёрку не попал.
Личное: с детьми был в парке в субботу.`}
          </pre>
        </div>
        <p className="text-xs text-lumm-text-secondary">
          Регистр не важен. Порядок (упоминание в начале или в конце) — тоже. Главное: и упоминание, и слово
          «отчёт» в одном сообщении.
        </p>
      </section>

      {/* Что делает бот */}
      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-lumm-text-primary">2. Что делает бот</h2>
        <ol className="text-sm text-lumm-text-primary space-y-2 list-decimal list-inside">
          <li>Берёт твои <strong className="text-lumm-gold">цели</strong> (бизнес + спорт) из профиля.</li>
          <li>Прогоняет текст отчёта через Claude Sonnet 4.6 вместе с целями.</li>
          <li>Получает: цвет светофора, «что сделал», «что упустил», вопрос на следующую неделю, коуч-рефлексию.</li>
          <li>Сохраняет в системе и отвечает в чат ссылкой на детальную страницу.</li>
        </ol>
        <p className="text-xs text-lumm-text-secondary">
          Если у тебя в профиле не заполнены обе цели — бот попросит их заполнить, отчёт не сохранится. Без целей
          анализ делать не с чем.
        </p>
      </section>

      {/* Светофор */}
      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-lumm-text-primary">3. Светофор — что значит цвет</h2>
        <p className="text-sm text-lumm-text-secondary">
          Каждому отчёту LLM ставит один из трёх статусов. Он оценивает движение к зафиксированным целям
          (бизнес + спорт) в рамках одной недели.
        </p>

        <div className="space-y-3">
          <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs border bg-green-500/10 text-green-400 border-green-500/30">
                🟢 Движется
              </span>
            </div>
            <p className="text-sm text-lumm-text-primary">
              Явное движение и к бизнес-, и к спорт-цели. Конкретные действия и результаты в обеих осях.
            </p>
          </div>

          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs border bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                🟡 Частично движется
              </span>
            </div>
            <p className="text-sm text-lumm-text-primary">
              Сдвинулся в одной из двух целей, а во второй — застой. Либо символическое движение в обеих (мало, не
              системно).
            </p>
          </div>

          <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs border bg-red-500/10 text-red-400 border-red-500/30">
                🔴 Застрял
              </span>
            </div>
            <p className="text-sm text-lumm-text-primary">
              Нет движения к целям за неделю или участник буксует. Отчёт может быть длинным, но не про цель.
            </p>
          </div>
        </div>

        <p className="text-xs text-lumm-text-secondary">
          Цвет — инструмент для быстрого сканирования ленты. Серьёзный разговор начинается в блоках «Что упустил»
          и «Вопрос на следующую неделю».
        </p>
      </section>

      {/* Цели */}
      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-lumm-text-primary">4. Цели в профиле</h2>
        <p className="text-sm text-lumm-text-secondary">
          У каждого участника две публичные цели: <strong className="text-lumm-gold">бизнес</strong> и{" "}
          <strong className="text-lumm-gold">спортивная</strong>. Заполняются в{" "}
          <a href="/profile" className="text-lumm-gold hover:underline">
            /profile
          </a>
          , видны другим участникам на <a href="/members" className="text-lumm-gold hover:underline">/members</a>.
        </p>
        <p className="text-sm text-lumm-text-secondary">
          Цели — якорь для анализа. LLM не угадывает «а к чему вообще участник идёт» — он читает то, что ты зафиксировал,
          и сверяет отчёт с этим.
        </p>
      </section>

      {/* Ежемесячный отчёт */}
      <section className="bg-lumm-black border border-lumm-gray-light/50 rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-lumm-text-primary">5. Ежемесячный отчёт</h2>
        <p className="text-sm text-lumm-text-secondary">
          Каждый участник сдаёт отчёт раз в месяц через вкладку <strong>Ежемесячные</strong>.
        </p>
        <div className="text-sm text-lumm-text-secondary space-y-1">
          <p><strong>Что указываем:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Выручка (валовая) и чистая прибыль за месяц, ₽</li>
            <li>Оценки по сферам: Бизнес / Семья / Личное (1-10)</li>
            <li>Текст отчёта по сферам</li>
            <li>Запрос на разбор (если есть)</li>
          </ul>
        </div>
        <p className="text-sm text-lumm-text-secondary">
          <strong>Капитал</strong> сдаём только в конце квартала — в марте, июне, сентябре и декабре. В эти
          месяцы поле обязательное. В остальные — оно скрыто.
        </p>
        <p className="text-sm text-lumm-text-secondary">
          <strong>Редактировать</strong> можно в любой момент: сохраняешь заново, запись обновляется.
          Финалом считается последняя сохранённая версия.
        </p>
      </section>

      {/* Календарь встреч + бот-напоминания */}
      <section className="bg-lumm-black border border-lumm-gray-light/50 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold text-lumm-text-primary">6. Календарь встреч</h2>
        <p className="text-sm text-lumm-text-secondary">
          Все встречи группы живут на <a href="/calendar" className="text-lumm-gold hover:underline">/calendar</a>.
          Любой участник может создать встречу, перенести, отменить или сменить организатора.
        </p>

        <div className="text-sm text-lumm-text-secondary space-y-1">
          <p><strong>Два типа встреч:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Мастермайнд</strong> — регулярный мастермайнд. По умолчанию — 3-й четверг месяца.
              Организатор назначается <strong>по очереди</strong> (ротация по порядку регистрации участников).
            </li>
            <li>
              <strong>Доп. встреча</strong> — внеплановая встреча (обсудить чью-то проблему, фокус-сессия и т.п.). В ротации
              организаторов не участвует.
            </li>
          </ul>
        </div>

        <div className="text-sm text-lumm-text-secondary space-y-1">
          <p><strong>Поля встречи:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Дата и время (начало/окончание)</li>
            <li>Адрес — обязательно</li>
            <li>Цена — опционально; если указана, автоматически делится на число активных участников и показывается «X ₽ / чел»</li>
            <li>Организатор — из активных участников группы</li>
          </ul>
        </div>

        <p className="text-sm text-lumm-text-secondary">
          <strong>Автосоздание:</strong> каждый день в 09:00 MSK бот проверяет, есть ли в календаре будущая
          стандартная встреча. Если нет — создаёт на следующий 3-й четверг, назначает организатора по ротации и
          пишет в групповой чат: «Следующий мастермайнд: ДД.ММ.ГГГГ, ведёт @username». Адрес/цену организатор дозаполняет в <a href="/calendar" className="text-lumm-gold hover:underline">/calendar</a>.
        </p>

        <p className="text-sm text-lumm-text-secondary">
          <strong>Смена организатора:</strong> если кто-то не может вести свою встречу — в /calendar нажимаешь «Редактировать»
          и выбираешь другого из списка. Следующая стандартная встреча уходит дальше по кругу от нового организатора.
        </p>

        <p className="text-sm text-lumm-text-secondary">
          <strong>Запись на доп. встречу:</strong> на странице встречи (карточка в{" "}
          <a href="/calendar" className="text-lumm-gold hover:underline">/calendar</a> — кликабельная) есть кнопка
          «Записаться». Нажал — попал в список идущих. Организатор записан автоматически. На мастермайнде записи
          нет: все активные участники по умолчанию приглашены.
        </p>

        <div className="text-sm text-lumm-text-secondary space-y-1">
          <p><strong>Бот напоминает (молчит, если все сдали):</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Воскресенье 19:00 MSK</strong> — пинг тем, кто не сдал еженедельный отчёт за эту неделю.</li>
            <li><strong>За 3 дня до ближайшей стандартной встречи</strong> — пинг тем, кто не сдал ежемесячный.</li>
          </ul>
        </div>
      </section>

      {/* Штурвал */}
      <section className="bg-lumm-black border border-lumm-gray-light/50 rounded-xl p-6 space-y-3">
        <h2 className="text-xl font-semibold text-lumm-text-primary">7. Штурвал — обратная связь</h2>
        <p className="text-sm text-lumm-text-secondary">
          Идею / баг / правку пиши боту в группе:
        </p>
        <div className="bg-lumm-gray-dark border border-lumm-gray-light rounded-lg p-4">
          <pre className="text-sm text-lumm-text-primary whitespace-pre-wrap font-sans">
{`@lummbrain_bot штурвал хорошо бы добавить график капитала на дашборд`}
          </pre>
        </div>
        <p className="text-sm text-lumm-text-secondary">
          Бот сохранит и ответит. Дальше статус «Новый → В работе → Готово / Отклонено» видно на вкладке{" "}
          <a href="/feedback" className="text-lumm-gold hover:underline">Штурвал</a>. Свои — в{" "}
          <a href="/profile" className="text-lumm-gold hover:underline">/profile</a> под целями.
        </p>
      </section>
    </div>
  );
}
