export function HeroBlock() {
  return (
    <section className="pt-12 md:pt-20 pb-4 space-y-6">
      <div className="text-xs uppercase tracking-widest text-lumm-gold font-semibold">
        Level Up Mastermind
      </div>
      <h1 className="text-4xl md:text-6xl font-bold leading-tight text-lumm-text-primary">
        Мастермайнд, в который<br className="hidden sm:inline" /> не попадают за деньги
      </h1>
      <p className="text-lg md:text-xl text-lumm-text-secondary max-w-2xl leading-relaxed">
        Закрытый клуб 8–10 мужчин-предпринимателей. 12 встреч в год и движок, который не даёт замылиться.
      </p>
      <div className="pt-2">
        <a
          href="#join"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-lumm-gold text-lumm-dark font-medium hover:bg-lumm-gold-light transition-colors"
        >
          Условия входа
          <span aria-hidden>↓</span>
        </a>
      </div>
    </section>
  );
}
