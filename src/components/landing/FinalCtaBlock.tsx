export function FinalCtaBlock() {
  const contact = process.env.NEXT_PUBLIC_APPLICATION_CONTACT;
  const href = contact ? `https://t.me/${contact.replace(/^@/, "")}` : undefined;

  return (
    <section className="text-center space-y-6 py-12">
      <h2 className="text-3xl md:text-5xl font-bold text-lumm-text-primary leading-tight">
        Если это твоё — <span className="text-lumm-gold">ты знаешь, что написать</span>
      </h2>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-lumm-gold text-lumm-dark font-medium hover:bg-lumm-gold-light transition-colors"
        >
          Оставить заявку
        </a>
      ) : (
        <button
          disabled
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-lumm-gray text-lumm-text-secondary cursor-not-allowed"
        >
          Контакт скоро
        </button>
      )}
    </section>
  );
}
