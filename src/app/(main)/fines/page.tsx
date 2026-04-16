export default function FinesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Штрафы</h1>
        <p className="text-lumm-text-secondary mt-1">
          Система начисления и отслеживания штрафов
        </p>
      </div>

      <div className="bg-lumm-black border border-lumm-gold/20 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-lumm-gold mb-2">
          Система в разработке
        </h2>
        <p className="text-lumm-text-secondary max-w-md mx-auto">
          Функционал штрафов сейчас прорабатывается. Здесь будет учёт штрафов
          за пропуски встреч, несданные отчёты и нарушения правил группы.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          <div className="bg-lumm-gray/30 rounded-lg p-4">
            <p className="text-2xl font-bold text-lumm-gold">5 000 ₽</p>
            <p className="text-xs text-lumm-text-secondary mt-1">
              пропуск встречи
            </p>
          </div>
          <div className="bg-lumm-gray/30 rounded-lg p-4">
            <p className="text-2xl font-bold text-lumm-gold">2 000 ₽</p>
            <p className="text-xs text-lumm-text-secondary mt-1">
              несданный отчёт
            </p>
          </div>
          <div className="bg-lumm-gray/30 rounded-lg p-4">
            <p className="text-2xl font-bold text-lumm-gold">1 000 ₽</p>
            <p className="text-xs text-lumm-text-secondary mt-1">
              опоздание на встречу
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
