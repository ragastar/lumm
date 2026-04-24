export function FinancialsBlock() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Финансы вслух</h2>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-3 text-lumm-text-secondary leading-relaxed">
          <p>Ежемесячно — вал и чистая прибыль. Квартально — капитал. Всё в ленте группы, под никами.</p>
          <p>Цифры настоящие, не «примерно». Так разговоры про деньги перестают быть позой.</p>
        </div>
        <div className="aspect-video bg-lumm-gray border border-lumm-gray-light rounded-lg flex items-center justify-center text-xs text-lumm-text-secondary" aria-label="Скриншот ленты финансов">
          [скриншот /financials]
        </div>
      </div>
    </section>
  );
}
