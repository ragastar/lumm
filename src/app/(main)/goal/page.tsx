import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goalPlans } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ShimmerButton } from "./_components/ShimmerButton";

export const dynamic = "force-dynamic";

export default async function GoalLandingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const existing = await db
    .select({ id: goalPlans.id })
    .from(goalPlans)
    .where(eq(goalPlans.memberId, user.id))
    .limit(1);
  const hasGoal = existing.length > 0;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-16">
      <section className="space-y-6">
        <div className="text-xs uppercase tracking-widest text-lumm-gold font-semibold">
          LUMM × Wombo Combo
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight text-lumm-text-primary">
          Цель на 12 недель.<br/>По системе, которую не стыдно защищать
        </h1>
        <p className="text-xl text-lumm-text-secondary max-w-2xl leading-relaxed">
          4 научно подтверждённых метода в одном шаблоне: WOOP, HARD, 12 Week Year и две психометрические шкалы качества.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          {hasGoal ? (
            <>
              <ShimmerButton href="/goal/my">Открыть мою цель</ShimmerButton>
              <ShimmerButton href="/goal/new" variant="secondary">Заполнить заново</ShimmerButton>
            </>
          ) : (
            <ShimmerButton href="/goal/new">Начать заполнение</ShimmerButton>
          )}
        </div>
        <p className="text-xs text-lumm-text-secondary pt-1">
          Шаблон v1 · внутренний инструмент LUMM · 45–90 минут вдумчивой работы (можно прервать и вернуться)
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">
          Почему большинство целей не доживают до конца цикла
        </h2>
        <p className="text-lumm-text-secondary">
          Проблема не в дисциплине. В момент постановки цель уже содержит пару дефектов, которые на старте не видно, а через 4 недели они взрывают весь план.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ["Цель не своя", "Идёт из «надо», стыда, ожиданий других. Внешняя мотивация даёт импульс, но разваливается в первый же тяжёлый момент."],
            ["Не то препятствие", "«Нет времени», «клиенты не платят» — это следствия. Настоящее препятствие почти всегда внутри: эмоция, привычка, убеждение, состояние."],
            ["Нет эмоциональной тяги", "Сухие SMART-формулировки не активируют внутреннюю картину. Цель тянет тебя первую неделю, потом гаснет."],
            ["Годовое планирование поощряет откладывание", "Горизонт 365 дней включает режим «ещё есть время». 12 недель — нет, не есть."],
          ].map(([title, text]) => (
            <div key={title} className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
              <h3 className="font-semibold text-lumm-gold mb-2">{title}</h3>
              <p className="text-sm text-lumm-text-secondary leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">
          Почему готовые фреймворки не подходят мастермайнду
        </h2>
        <div className="space-y-3 text-sm leading-relaxed text-lumm-text-secondary">
          <p><strong className="text-lumm-text-primary">SMART (1981).</strong> Корпоративный инструмент. Буква «Achievable» прямо противоречит классической теории Локка/Латама — специфичные + трудные цели работают лучше достижимых. Ничего не говорит про мотивацию, препятствия и самосогласованность.</p>
          <p><strong className="text-lumm-text-primary">OKR.</strong> Блестяще работает в организациях с вертикальным alignment. В мастермайнде нет корпоративной стратегии, нечего каскадировать.</p>
          <p><strong className="text-lumm-text-primary">GROW.</strong> Отличная методика коучинга, но требует компетентного коуча в каждой сессии. В peer-группе такого ресурса нет.</p>
          <p><strong className="text-lumm-text-primary">Vision Boards.</strong> Чистая позитивная визуализация снижает мотивацию (Oettingen 2002, JPSP): мозг получает дофаминовое вознаграждение от воображения успеха.</p>
          <p><strong className="text-lumm-text-primary">HARD Goals в чистом виде.</strong> Сильная эмоциональная валидация, но без операционализации — улучшенный vision board.</p>
          <p><strong className="text-lumm-text-primary">12 Week Year в чистом виде.</strong> Отличный скелет каденции, но без психометрии на входе и эмоционального слоя.</p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">Архитектура: 4 слоя</h2>
        <div className="space-y-3">
          {[
            ["1. Годовой ориентир", "Одно предложение на 12 месяцев. Не метрика, направление. 4 цикла обслуживают его."],
            ["2. Эмоциональная тяга (HARD + SCI)", "Heartfelt · Animated · Required · Difficult. Плюс шкала самосогласованности Sheldon-Elliot — фильтр против «навязанных» целей."],
            ["3. Операционализация (WOOP)", "Wish → Outcome → Obstacle → Plan. Мета-анализ Gollwitzer & Sheeran (2006): 94 исследования, 8000+ участников, эффект d=0.65."],
            ["4. Дисциплина исполнения (12 Week Year)", "12-недельный цикл, еженедельный отчёт с процентом выполнения и уверенностью 1–10, 85% target, промежуточные встречи на 4-й и 8-й неделях."],
          ].map(([title, text]) => (
            <div key={title} className="bg-lumm-black border border-lumm-gold/20 rounded-xl p-6">
              <h3 className="font-semibold text-lumm-gold mb-1">{title}</h3>
              <p className="text-sm text-lumm-text-secondary leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">Проверка качества на входе: 5 + 5</h2>
        <p className="text-lumm-text-secondary">
          Перед тем как цель попадает в цикл, она проходит 10-пунктовую проверку. Для защиты в группе — 5 базовых зелёных обязательны + минимум 3 из 5 углублённых.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <h3 className="font-semibold text-lumm-text-primary mb-3">5 базовых</h3>
            <ul className="space-y-1.5 text-sm text-lumm-text-secondary">
              <li>Конкретность</li>
              <li>Измеримость</li>
              <li>Срок с контрольными точками</li>
              <li>Амбиция (сложность 5–8 из 10)</li>
              <li>Регулярный разбор встроен</li>
            </ul>
          </div>
          <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <h3 className="font-semibold text-lumm-text-primary mb-3">5 углублённых</h3>
            <ul className="space-y-1.5 text-sm text-lumm-text-secondary">
              <li>Самосогласованность (шкала Sheldon-Elliot, SCI)</li>
              <li>Приверженность (шкала Klein, K.U.T.)</li>
              <li>План «когда — тогда» заполнен (мин. 2)</li>
              <li>Препятствие сформулировано как внутреннее</li>
              <li>Согласованность с остальной жизнью</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">Научная база</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lumm-gray-light">
                <th className="text-left py-2 text-lumm-text-secondary font-medium">Элемент</th>
                <th className="text-left py-2 text-lumm-text-secondary font-medium">Источник</th>
                <th className="text-left py-2 text-lumm-text-secondary font-medium">Эффект</th>
              </tr>
            </thead>
            <tbody className="text-lumm-text-primary">
              {[
                ["Implementation intentions (WOOP-план)", "Gollwitzer & Sheeran, 2006", "d = 0.65"],
                ["Mental contrasting (сам метод WOOP)", "Wang, Wang & Gai, 2021", "g = 0.34"],
                ["Specific-difficult goals", "Locke & Latham, 2002", "d = 0.42–0.80"],
                ["Self-concordance → attainment", "Sheldon & Elliot, 1999", "β ≈ 0.25–0.30"],
                ["Goal commitment × performance", "Klein et al., 1999", "ρ = 0.23"],
                ["Group goal-setting", "Kleingeld et al., 2011", "d ≈ 0.80"],
                ["Feedback", "Hattie, Visible Learning, 2009", "d ≈ 0.70"],
              ].map(([e, s, r]) => (
                <tr key={e} className="border-b border-lumm-gray-light/40">
                  <td className="py-2 pr-4">{e}</td>
                  <td className="py-2 pr-4 text-lumm-text-secondary">{s}</td>
                  <td className="py-2 text-lumm-gold font-mono">{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold text-lumm-text-primary">Кому подойдёт / кому нет</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-lumm-black border border-green-500/30 rounded-xl p-6">
            <h3 className="font-semibold text-green-400 mb-3">Подойдёт</h3>
            <ul className="space-y-1.5 text-sm text-lumm-text-secondary">
              <li>Мастермайнд-группы 4–6 человек с peer-accountability</li>
              <li>Предприниматели, пробовавшие SMART/OKR и чувствующие недостаток</li>
              <li>Если цель соединяет бизнес, здоровье и личное развитие</li>
              <li>Кто ценит научную базу за практичностью</li>
            </ul>
          </div>
          <div className="bg-lumm-black border border-red-500/30 rounded-xl p-6">
            <h3 className="font-semibold text-red-400 mb-3">Не подойдёт</h3>
            <ul className="space-y-1.5 text-sm text-lumm-text-secondary">
              <li>Корпоративные команды с вертикальным alignment — нужен OKR</li>
              <li>Кто хочет «простое за 5 минут» — заполнение 45–90 минут</li>
              <li>Клиенты индивидуального коучинга — GROW с коучем</li>
              <li>Кто в принципе не хочет работать с препятствиями</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-bold text-lumm-text-primary">Частые возражения</h2>
        {[
          ["SMART же работает у меня много лет", "Если цели регулярно достигаются — не меняй ничего. По опросу Mooncamp 2024 только 8% доходят до целей, поставленных в начале года. Если иногда попадаешь в эти 92% — возможно, это дефект методологии, не дисциплины."],
          ["Слишком сложно", "Заполнение — один раз в 12 недель. Еженедельный отчёт — 3–5 минут. SCI и Klein считаются автоматически, ты двигаешь слайдеры."],
          ["Я уже использую OKR", "Отлично. OKR — корпоративная методика, эта — личная. Дополняют друг друга: OKR на работе, это — в мастермайнде и для личных целей."],
          ["А как же визуализация?", "В системе есть шаг «картина успеха» — ты описываешь конкретный момент через 12 недель с сенсорной детализацией. Это часть методологии MCII с доказанной эффективностью. Разница: мы не останавливаемся на картине, а сразу идём к препятствиям и плану."],
        ].map(([q, a]) => (
          <details key={q} className="bg-lumm-black border border-lumm-gray-light rounded-xl">
            <summary className="p-5 cursor-pointer font-medium text-lumm-text-primary hover:bg-lumm-gray-light/20 transition-colors">
              {q}
            </summary>
            <div className="px-5 pb-5 text-sm text-lumm-text-secondary leading-relaxed">
              {a}
            </div>
          </details>
        ))}
      </section>

      <section className="text-center space-y-4 pt-8 pb-4">
        {hasGoal ? (
          <>
            <ShimmerButton href="/goal/my">Открыть мою цель</ShimmerButton>
            <div>
              <ShimmerButton href="/goal/new" variant="secondary">Заполнить заново</ShimmerButton>
            </div>
          </>
        ) : (
          <ShimmerButton href="/goal/new">Начать заполнение</ShimmerButton>
        )}
        <p className="text-xs text-lumm-text-secondary">
          Данные хранятся в твоём профиле LUMM. Не передаются третьим сторонам.
        </p>
      </section>
    </div>
  );
}
