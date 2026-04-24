export function YearRhythmBlock() {
  const items = [
    { title: "12 встреч в год", text: "Каждый третий четверг месяца, 5–6 часов, оффлайн в Москве. Пропуск дороже прихода." },
    { title: "Полугодовой выезд", text: "Только для участников. 3–4 дня: лес, палатки, сплав, новый опыт." },
    { title: "Годовой выезд с семьями", text: "5–7 дней. Планы на год, декомпозиция, утверждение целей. Дружим семьями." },
    { title: "Неделя — единица отчёта", text: "Свободный формат, дедлайн — воскресенье 23:59:59. Что сделано, план, инсайты." },
  ];
  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Ритм года</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it.title} className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <h3 className="font-semibold text-lumm-gold mb-2">{it.title}</h3>
            <p className="text-sm text-lumm-text-secondary leading-relaxed">{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
