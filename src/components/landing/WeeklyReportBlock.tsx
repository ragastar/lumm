export function WeeklyReportBlock() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Еженедельный отчёт + AI-разбор</h2>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="aspect-video bg-lumm-gray border border-lumm-gray-light rounded-lg flex items-center justify-center text-xs text-lumm-text-secondary" aria-label="Скриншот телеграм-бота с разбором отчёта">
          [скриншот бота + светофор]
        </div>
        <div className="space-y-3 text-lumm-text-secondary leading-relaxed">
          <p>Воскресенье, 23:59 — отчёт в чат. Бот подхватывает, Claude разбирает по сферам Бизнес/Семья/Личное, выдаёт светофор.</p>
          <p>Группа видит светофор — и ты видишь себя чужими глазами. Врать самому себе становится неудобно.</p>
        </div>
      </div>
    </section>
  );
}
