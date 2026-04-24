export function MirrorBlock() {
  const yes = [
    "свой бизнес или серьёзная управляющая роль",
    "устал от поверхностных разговоров «как дела — нормально»",
    "нужны люди, которым можно сказать «мне страшно» и не получить в ответ отмазки",
    "готов платить не за знания, а за зеркало",
  ];
  const no = [
    "ищешь лидогенерацию или клиентов",
    "хочешь курс «как масштабироваться за 3 месяца»",
    "не готов жить по расписанию группы",
    "не готов показать цифры своего бизнеса",
  ];
  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">В зеркале</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
          <h3 className="font-semibold text-lumm-gold mb-3">Ты здесь, если</h3>
          <ul className="space-y-2 text-sm text-lumm-text-secondary leading-relaxed">
            {yes.map((t) => <li key={t} className="flex gap-2"><span className="text-lumm-gold">◆</span>{t}</li>)}
          </ul>
        </div>
        <div className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
          <h3 className="font-semibold text-red-400 mb-3">Ты НЕ сюда, если</h3>
          <ul className="space-y-2 text-sm text-lumm-text-secondary leading-relaxed">
            {no.map((t) => <li key={t} className="flex gap-2"><span className="text-red-400">✕</span>{t}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
