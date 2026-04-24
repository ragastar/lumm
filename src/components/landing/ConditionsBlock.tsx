const CONDITIONS = [
  "8–10 мест в группе, только мужчины-предприниматели.",
  "Москва, оффлайн. Удалённо — нет.",
  "Взнос в месяц + банк на штрафы и общие расходы.",
  "Обязательства: еженедельный отчёт, присутствие на встрече, подготовка.",
];

export function ConditionsBlock() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Условия</h2>
      <ul className="space-y-2">
        {CONDITIONS.map((c) => (
          <li key={c} className="flex gap-3 text-lumm-text-secondary leading-relaxed">
            <span className="text-lumm-gold mt-1">◆</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
