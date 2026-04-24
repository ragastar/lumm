import { formatOpenSlots, formatNextWindow } from "@/lib/landing";

export function IntakeWindowBlock() {
  const slots = Number(process.env.NEXT_PUBLIC_OPEN_SLOTS);
  const window = process.env.NEXT_PUBLIC_NEXT_WINDOW_DATE;

  const slotsText = formatOpenSlots(slots);
  const windowText = formatNextWindow(window);

  return (
    <section className="bg-gradient-to-br from-lumm-gold/10 to-transparent border border-lumm-gold/30 rounded-2xl p-6 md:p-10 text-center space-y-3">
      <div className="text-xs uppercase tracking-widest text-lumm-gold font-semibold">Окно приёма</div>
      <div className="text-3xl md:text-4xl font-bold text-lumm-text-primary">{slotsText}</div>
      {windowText && (
        <p className="text-lumm-text-secondary">Следующее окно приёма: <span className="text-lumm-gold">{windowText}</span></p>
      )}
    </section>
  );
}
