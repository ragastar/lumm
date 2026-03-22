export default function ConstitutionPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Конституция</h1>
        <p className="text-lumm-text-secondary mt-1">
          Правила и принципы Level Up Mastermind
        </p>
      </div>

      {/* Intro */}
      <div className="bg-gradient-to-r from-lumm-gold/10 to-lumm-gold/5 border border-lumm-gold/20 rounded-xl p-6">
        <p className="text-lumm-text-primary leading-relaxed">
          <strong className="text-lumm-gold">Мастермайнд</strong> — это личный
          совет директоров. Максимальная польза, которую получает каждый участник
          группы, ощущается где-то на 4-5 встрече (встречи ежемесячные). Отсюда
          вывод — нет смысла идти в группу на 1-2 месяца, чтобы «посмотреть что
          да как».
        </p>
      </div>

      {/* Правила и ценности */}
      <Section title="Правила и ценности">
        <ul className="space-y-3">
          <ValueItem
            title="Проактивность"
            text="обязательное присутствие, вовлеченность, готовность делиться опытом, поддержка."
          />
          <ValueItem
            title="Конфиденциальность"
            text="всё обсуждаемое остаётся исключительно внутри группы."
          />
          <ValueItem
            title="Предпринимательский опыт"
            text="свой бизнес, партнёрство или высокая управленческая роль."
          />
          <ValueItem
            title="Развитие"
            text="ориентация на рост, постановка и проработка целей."
          />
        </ul>
      </Section>

      {/* Основа формата */}
      <Section title="Основа формата">
        <div className="space-y-6">
          <FormatBlock number={1} title="Встречи раз в месяц">
            <p>
              Встречи каждый третий четверг месяца в 13:00, продолжительность 5-6
              часов, далее активности по желанию (спорт, бар, CS или др.)
            </p>
            <p className="mt-2">
              Место для встречи выбирает каждый раз новый участник. Есть список
              проверенных площадок, либо что-то новое.
            </p>
          </FormatBlock>

          <FormatBlock number={2} title="Полугодовой выезд">
            <p>Только для участников.</p>
            <p className="mt-2">
              Цель — прожить вместе новый опыт (3-4 дня / 2-3 ночи).
            </p>
            <p className="mt-2">
              Как пример: поход, лес палатки, выживание, сплав, каталка на борде
              и тд.
            </p>
            <p className="mt-2">
              Раз в год выбирается один организатор из участников, он решает чего
              делаем.
            </p>
          </FormatBlock>

          <FormatBlock number={3} title="Годовой выезд">
            <p>
              Семьей, чтобы дружить семьями. По продолжительности 5-7 дней.
            </p>
            <p className="mt-2">
              Тут мы готовим планы на год, декомпозируем их, задаем друг другу
              вопросы и утверждаем. А в течение года — движимся по планам,
              ежемесячно отчитываемся о том, как приближаемся к его выполнению.
            </p>
            <p className="mt-2">
              Так же, выбирается организатор раз в год.
            </p>
          </FormatBlock>

          <FormatBlock number={4} title="Недельные отчёты">
            <p>
              Свободный формат: что сделано, какой план на следующую неделю,
              инсайты.
            </p>
            <p className="mt-2 text-lumm-gold font-medium">
              Крайний срок публикации в чате — воскресенье 23:59:59.
            </p>
          </FormatBlock>
        </div>
      </Section>

      {/* Орг. моменты */}
      <Section title="Орг. моменты">
        <div className="space-y-6">
          <FormatBlock number={1} title="Роли">
            <p>
              Раз в год на выезде распределяем роли участников на ближайший год.
              Кто модератор, казначей, таймкиппер и тд. Раз в год меняемся.
            </p>
          </FormatBlock>

          <FormatBlock number={2} title="Бади">
            <p>
              У каждого участника есть бади на месяц, каждый месяц новый бади.
            </p>
            <p className="mt-2">
              С Бади раз в месяц минимум созваниваемся, обменяться мыслями по
              плану, помогаем друг другу и тд.
            </p>
          </FormatBlock>

          <FormatBlock number={3} title="Банк и штрафы">
            <div className="space-y-2">
              <FineItem text="Отсутствие подготовленного недельного/месячного отчета" amount="2 500 ₽" note="+ учет капитала раз в 3 мес — 2 500 ₽" />
              <FineItem text="Прогулы" amount="25 000 ₽" note="1 официальный, 1 платный" />
              <FineItem text="Опоздание на сбор до 10 мин" amount="5 000 ₽" />
              <FineItem text="Опоздание на сбор до 20 мин" amount="10 000 ₽" />
              <FineItem text="Опоздание 30 мин+" amount="10 000 ₽" note="засчитывается как пропуск, даже если добрался" />
              <FineItem text="Пропуск, объявленный позже чем за неделю" amount="10 000 ₽" note="25к если второй" />
              <FineItem text="Пропуск встречи с новыми кандидатами" amount="2 000 ₽" />
              <FineItem text="Звук/вибро телефона во время встречи" amount="1 000 ₽/шт" />
              <FineItem text="Использование гаджетов во время встречи" amount="1 000 ₽/шт" note="в т.ч. для записей" />
            </div>
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm font-medium">
                Больше двух прогулов за год — вылет из группы.
              </p>
            </div>
            <p className="mt-3 text-sm text-lumm-text-secondary">
              Обозначение места встречи Организатором должно быть минимум за 7
              суток, если позже — организатор оплачивает 33% общего стола/аренды.
            </p>
          </FormatBlock>

          <FormatBlock number={4} title="Мы про деньги">
            <p>
              Ежемесячно чекаем чистую прибыль и вал всех участников, в течение
              года фиксируем групповую динамику в таблице.
            </p>
          </FormatBlock>

          <FormatBlock number={5} title="Место встречи">
            <p>
              Место выбирает участник, выбранный в качестве организатора на
              предыдущей встрече. Какие места выбираем: переговорка, лофт,
              творческое пространство, номер с гостиной и другие места, где не
              будет активного взаимодействия с окружающим миром (не слышали, не
              видели, не отвлекали).
            </p>
            <p className="mt-2">
              В идеале — не далеко от центра или третьего транспортного кольца
              (транспортная доступность, наличие паркинга, рядом есть ресторан или
              кафе, чтобы пообедать в перерыв). МО и выезды — согласуем по тому
              же принципу + индивидуально.
            </p>
            <p className="mt-2 text-lumm-gold">
              Бюджет на аренду площадки — до 5к/чел за встречу (6 часов), больший
              бюджет — по согласованию в чате.
            </p>
          </FormatBlock>

          <FormatBlock number={6} title="Договорённости">
            <p>
              Новые договоренности утверждаются кворумом (большинством на
              голосовании).
            </p>
          </FormatBlock>

          <FormatBlock number={7} title="Перенос даты">
            <p>
              Перенос даты будущей встречи возможен, но только при исключительном
              согласии каждого участника.
            </p>
          </FormatBlock>

          <FormatBlock number={8} title="Вход новых участников">
            <p>
              Решение о возможности входа нового участника принимается путём
              голосования после встречи-знакомства (если все за, либо если есть 1
              чел в сомнениях. Если 2 и более в сомнениях — не принимаем).
            </p>
          </FormatBlock>

          <FormatBlock number={9} title="Тестовая встреча">
            <p>
              После принятия нового человека в группу — есть 1 «тестовая»
              встреча, по итогам, которой группой финально утверждается участие
              нового человека в ММ.
            </p>
          </FormatBlock>

          <FormatBlock number={10} title="Исключение участника">
            <p>
              Вопрос об исключении Участника может быть поднят по инициативе
              любого из участников, обсуждается на очередной встрече
              мастермайнда. Если вопрос не терпит отлагательств — можем собраться
              в Зум до встречи.
            </p>
          </FormatBlock>

          <FormatBlock number={11} title="Встреча-знакомство">
            <p>
              Встреча-знакомство проводится в день сбора группы (третий четверг
              месяца), минимум за 1 час до начала основной части.
            </p>
          </FormatBlock>
        </div>
      </Section>

      {/* Формат встреч */}
      <Section title="Формат встреч">
        <div className="space-y-4">
          <MeetingStep
            icon="💬"
            title="Синхронизация"
            description="Пройтись по чувствам, синхронизироваться — вопрос из карточек с вопросами"
            time="по 1 мин"
          />
          <MeetingStep
            icon="📊"
            title="Отчёт за месяц"
            description="Вал и прибыль за месяц + подготавливаем заранее по сферам и целям из годового плана + запрос вытекающий из отчёта"
            time="7-10 мин/чел"
          />
          <MeetingStep
            icon="🔍"
            title="Дополнительно"
            description="По желанию можно добавить 3-5 мин о результатах в компании, если это необходимо для разбора текущего запроса"
            time="3-5 мин"
          />
          <MeetingStep
            icon="☕"
            title="Перерыв"
            description=""
            time=""
          />
          <MeetingStep
            icon="🧠"
            title="Разборы"
            description="В зависимости от желаний группы: 1-2-3 глубоких разбора темы/запроса, либо разборы тем каждого участника менее глубокие"
            time=""
          />
          <MeetingStep
            icon="🍽"
            title="Обед"
            description=""
            time="60 мин"
          />
          <MeetingStep
            icon="🏢"
            title="Экскурсия в компанию"
            description=""
            time="70 мин"
          />
          <MeetingStep
            icon="✅"
            title="Закрытие встречи"
            description="Основные инсайты по 2-3 мин. Что берём с собой. Постановка целей на месяц."
            time="2-3 мин/чел"
          />
          <div className="mt-4 p-4 bg-lumm-gray/30 rounded-lg text-sm text-lumm-text-secondary">
            Далее можно продолжить встречу по желанию: спорт, CS, бар, кальян или
            тд.
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-lumm-gold mb-4 uppercase tracking-wide">
        {title}
      </h2>
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-5 sm:p-6">
        {children}
      </div>
    </div>
  );
}

function ValueItem({ title, text }: { title: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-lumm-gold mt-1 shrink-0">◆</span>
      <p className="text-lumm-text-primary">
        <strong>{title}:</strong>{" "}
        <span className="text-lumm-text-secondary">{text}</span>
      </p>
    </li>
  );
}

function FormatBlock({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-lumm-gold/10 border border-lumm-gold/20 flex items-center justify-center text-sm font-bold text-lumm-gold shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lumm-text-primary mb-2">{title}</h3>
        <div className="text-sm text-lumm-text-secondary leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

function FineItem({
  text,
  amount,
  note,
}: {
  text: string;
  amount: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-lumm-gray-light/50 last:border-0">
      <div className="text-sm text-lumm-text-primary">
        {text}
        {note && (
          <span className="text-lumm-text-secondary text-xs ml-1">
            ({note})
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-lumm-gold whitespace-nowrap">
        {amount}
      </span>
    </div>
  );
}

function MeetingStep({
  icon,
  title,
  description,
  time,
}: {
  icon: string;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg bg-lumm-gray/20">
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <h4 className="font-medium text-lumm-text-primary">{title}</h4>
          {time && (
            <span className="text-xs text-lumm-gold bg-lumm-gold/10 px-2 py-0.5 rounded whitespace-nowrap w-fit">
              {time}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-lumm-text-secondary mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
