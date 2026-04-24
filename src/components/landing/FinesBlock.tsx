const FINES = [
  { text: "Прогул встречи", amount: "25 000 ₽" },
  { text: "Опоздание 10 минут", amount: "5 000 ₽" },
  { text: "Опоздание 20 минут", amount: "10 000 ₽" },
  { text: "Опоздание 30+ минут", amount: "10 000 ₽ · = прогул" },
  { text: "Пропуск позже чем за неделю", amount: "10 000 ₽" },
  { text: "Пропуск встречи с новыми кандидатами", amount: "2 000 ₽" },
  { text: "Отсутствие подготовленного отчёта", amount: "2 500 ₽" },
  { text: "Звук телефона во время встречи", amount: "1 000 ₽" },
  { text: "Использование гаджетов во время встречи", amount: "1 000 ₽" },
];

export function FinesBlock() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Банк и штрафы</h2>
        <p className="text-lumm-text-secondary mt-2 leading-relaxed max-w-2xl">
          Штрафы — не репрессии. Это цена, которая делает выбор дорогим. Банк идёт в общак: выезды, рестораны, подарки.
        </p>
      </div>
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        {FINES.map((f, i) => (
          <div
            key={f.text}
            className={`flex items-center justify-between gap-3 px-5 py-3 ${i !== FINES.length - 1 ? "border-b border-lumm-gray-light/50" : ""}`}
          >
            <span className="text-sm text-lumm-text-primary">{f.text}</span>
            <span className="text-sm font-semibold text-lumm-gold whitespace-nowrap">{f.amount}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-red-400">Больше двух прогулов за год — вылет из группы.</p>
    </section>
  );
}
