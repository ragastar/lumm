export const dynamic = "force-dynamic";

export default function ConstitutionPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Конституция</h1>
        <p className="text-lumm-text-secondary mt-1">
          Правила и принципы группы Level Up Mastermind
        </p>
      </div>

      <div className="bg-lumm-black border border-lumm-gold/20 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">📜</div>
        <h2 className="text-xl font-semibold text-lumm-gold mb-2">
          Загрузка конституции...
        </h2>
        <p className="text-lumm-text-secondary">
          Документ готовится к публикации.
        </p>
      </div>
    </div>
  );
}
