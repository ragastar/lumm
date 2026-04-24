const STEPS = [
  "Заявка — через форму или знакомого участника.",
  "Встреча-знакомство — час до очередной встречи группы.",
  "Голосование группы. Если двое и больше в сомнениях — нет.",
  "Тестовая встреча — одна, как полноправный участник.",
  "Финальное утверждение и вход в клуб.",
];

export function HowToJoinBlock() {
  return (
    <section id="join" className="space-y-6 pt-8">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Как попасть</h2>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-4 items-start bg-lumm-black border border-lumm-gray-light rounded-xl p-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-lumm-gold/10 border border-lumm-gold/30 flex items-center justify-center text-sm font-bold text-lumm-gold tabular-nums">
              {i + 1}
            </span>
            <p className="text-lumm-text-primary leading-relaxed pt-1">{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
