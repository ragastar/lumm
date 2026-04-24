export function DayInClubBlock() {
  const steps = [
    { time: "12:30", icon: "🚪", title: "Приехал", text: "Место выбирает организатор встречи, которого назначили на предыдущей." },
    { time: "13:00", icon: "💬", title: "Синхронизация", text: "По минуте от каждого. Где ты сейчас по чувствам. Карточки-вопросы." },
    { time: "13:10", icon: "📊", title: "Отчёт за месяц", text: "Вал и прибыль, сферы и цели из годового плана, главный запрос. 7–10 мин на участника." },
    { time: "14:30", icon: "☕", title: "Перерыв", text: "" },
    { time: "14:45", icon: "🧠", title: "Разборы", text: "1–3 глубоких разбора темы или запроса. Вопросы, а не советы." },
    { time: "17:00", icon: "🍽", title: "Обед", text: "60 минут." },
    { time: "18:00", icon: "🏢", title: "Экскурсия в бизнес", text: "На чью-то компанию. С пальцами в бухгалтерии." },
    { time: "19:10", icon: "✅", title: "Закрытие", text: "Инсайты по 2–3 мин. Что забираем. Цели на месяц." },
    { time: "20:00", icon: "🍺", title: "По желанию", text: "Спорт, CS, бар. Кто хочет — остаётся." },
  ];
  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Один день в клубе</h2>
      <p className="text-lumm-text-secondary">Так выглядит один четверг. Без воды, по хронометражу.</p>
      <ol className="relative border-l border-lumm-gold/30 pl-6 space-y-5">
        {steps.map((s) => (
          <li key={s.time} className="relative">
            <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-lumm-gold/20 border-2 border-lumm-gold" aria-hidden />
            <div className="flex items-baseline gap-3">
              <span className="text-lumm-gold font-semibold tabular-nums">{s.time}</span>
              <span aria-hidden>{s.icon}</span>
              <h3 className="font-semibold text-lumm-text-primary">{s.title}</h3>
            </div>
            {s.text && <p className="text-sm text-lumm-text-secondary mt-1 leading-relaxed">{s.text}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
