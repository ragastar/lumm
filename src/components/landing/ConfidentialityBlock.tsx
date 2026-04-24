export function ConfidentialityBlock() {
  return (
    <section className="space-y-6 bg-gradient-to-br from-lumm-gold/5 to-transparent border border-lumm-gold/20 rounded-2xl p-6 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Можно снять маску</h2>
      <div className="space-y-3 text-lumm-text-secondary leading-relaxed max-w-2xl">
        <p>Всё, что сказано в комнате — остаётся в комнате. Ни партнёрам, ни жёнам, ни постам в телеге.</p>
        <p>Это единственное место, где «просело в два раза» не превращается в «у нас всё отлично» через неделю.</p>
      </div>
      <ul className="grid sm:grid-cols-3 gap-3 text-sm text-lumm-text-secondary">
        <li className="bg-lumm-black/40 border border-lumm-gray-light/50 rounded-lg p-4"><strong className="text-lumm-gold block mb-1">NDA де-факто</strong>Конфиденциальность — не пункт договора, а правило входа.</li>
        <li className="bg-lumm-black/40 border border-lumm-gray-light/50 rounded-lg p-4"><strong className="text-lumm-gold block mb-1">Голосование при исключении</strong>Если кто-то нарушает — обсуждаем и решаем группой.</li>
        <li className="bg-lumm-black/40 border border-lumm-gray-light/50 rounded-lg p-4"><strong className="text-lumm-gold block mb-1">Телефоны в стороне</strong>Гаджет на встрече — штраф. Запись голосом — штраф.</li>
      </ul>
    </section>
  );
}
