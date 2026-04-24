const FAQ = [
  {
    q: "Почему только мужчины?",
    a: "Исторически так сложилась группа. На текущем этапе мы решили держать формат, чтобы в комнате было максимум открытости без фильтра «а как это прозвучит».",
  },
  {
    q: "Что если я пропущу встречу?",
    a: "Официально разрешён один пропуск в год с уведомлением минимум за неделю. Второй и последующие — платные. Больше двух прогулов за год — вылет из группы.",
  },
  {
    q: "Что с конфиденциальностью?",
    a: "Всё сказанное в комнате остаётся в комнате. Это правило входа, не декларация. Нарушение — основание для исключения.",
  },
  {
    q: "Сколько стоит и куда идут деньги?",
    a: "Ежемесячный взнос — сумма обсуждается на встрече-знакомстве. Плюс банк на штрафы. Все деньги идут на аренду мест, выезды, рестораны и общие расходы группы. Никто не забирает себе.",
  },
  {
    q: "Что делает софт?",
    a: "Ведём 12-недельные цели, отчёты с AI-анализом, финансы группы, календарь встреч, фидбек-канал «штурвал». Телеграм-бот напоминает и принимает отчёты.",
  },
  {
    q: "Можно участвовать удалённо?",
    a: "Нет. Встречи оффлайн в Москве, это принципиально для формата.",
  },
];

export function FaqBlock() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Частые вопросы</h2>
      <div className="space-y-2">
        {FAQ.map((item) => (
          <details key={item.q} className="bg-lumm-black border border-lumm-gray-light rounded-xl group">
            <summary className="cursor-pointer px-5 py-4 font-medium text-lumm-text-primary list-none flex items-center justify-between">
              <span>{item.q}</span>
              <span className="text-lumm-gold transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <div className="px-5 pb-4 text-sm text-lumm-text-secondary leading-relaxed">{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
