import type { ReactNode } from "react";

export type GoalPlan = {
  id: string;
  memberId: string;
  wish: string;
  sphere: string;
  sciScore: number;
  kleinAvg: number;
  difficulty: number;
  metricName: string | null;
  metricStart: string | null;
  metricTarget: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const SPHERE_LABELS: Record<string, string> = {
  business: "Бизнес и деньги",
  health: "Здоровье и спорт",
  skills: "Навыки и обучение",
  family: "Семья и отношения",
  creative: "Творчество",
  finance: "Финансы",
};

const OBSTACLE_LABELS: Record<string, string> = {
  emotion: "Эмоция",
  habit: "Привычка",
  belief: "Убеждение",
  state: "Состояние",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-lumm-text-secondary">{label}</div>
      <div className="text-sm text-lumm-text-primary whitespace-pre-wrap">
        {children || <span className="text-lumm-text-secondary">—</span>}
      </div>
    </div>
  );
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asArr<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function GoalView({ plan, actions }: { plan: GoalPlan; actions?: ReactNode }) {
  const d = plan.data;

  const ifThen = asArr<{ when: string; then: string }>(d.ifThen).filter((p) => p.when || p.then);
  const leadActions = asArr<{ name: string; freq: string }>(d.leadActions).filter((a) => a.name);
  const nonGoals = asArr<string>(d.nonGoals).filter(Boolean);

  const sciClass =
    plan.sciScore >= 8 ? "bg-green-500/10 text-green-400 border-green-500/30" :
    plan.sciScore >= 3 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
    "bg-red-500/10 text-red-400 border-red-500/30";

  const kleinClass =
    plan.kleinAvg >= 4.5 ? "bg-green-500/10 text-green-400 border-green-500/30" :
    plan.kleinAvg >= 3.5 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" :
    "bg-red-500/10 text-red-400 border-red-500/30";

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <section className="space-y-4">
        <div className="text-xs uppercase tracking-widest text-lumm-gold font-semibold">
          LUMM × Wombo Combo
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-lumm-text-primary leading-tight">
          {plan.wish}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-xs bg-lumm-gold/10 text-lumm-gold border border-lumm-gold/30">
            {SPHERE_LABELS[plan.sphere] ?? plan.sphere}
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-lumm-gray border border-lumm-gray-light text-lumm-text-primary">
            Сложность {plan.difficulty}/10
          </span>
          <span className={`px-3 py-1 rounded-full text-xs border ${sciClass}`}>
            SCI: {plan.sciScore > 0 ? "+" : ""}{plan.sciScore}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs border ${kleinClass}`}>
            Klein: {plan.kleinAvg.toFixed(1)}/5
          </span>
        </div>
        {actions && <div className="pt-2">{actions}</div>}
      </section>

      {(asStr(d.annualGoal) || (typeof d.cyclePosition === "number" && d.cyclePosition > 0)) && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Годовой контекст</h2>
          {asStr(d.annualGoal) && <Field label="Годовой ориентир">{asStr(d.annualGoal)}</Field>}
          {typeof d.cyclePosition === "number" && d.cyclePosition > 0 && (
            <Field label="Позиция">Цикл {d.cyclePosition} из 4</Field>
          )}
          {asStr(d.annualServing) && <Field label="Чем этот цикл служит году">{asStr(d.annualServing)}</Field>}
        </section>
      )}

      {plan.metricName && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Метрика результата</h2>
          <Field label="Что измеряем">{plan.metricName}</Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Старт">{plan.metricStart}</Field>
            <Field label="Цель (12 неделя)">{plan.metricTarget}</Field>
          </div>
        </section>
      )}

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Эмоциональная тяга</h2>
        <Field label="Почему это важно">{asStr(d.internalReason)}</Field>
        <Field label="Если никто не узнает — хотел бы?">{asStr(d.hiddenTest)}</Field>
        <Field label="Картина успеха через 12 недель">{asStr(d.successScene)}</Field>
        <Field label="Цена бездействия">{asStr(d.costOfInaction)}</Field>
      </section>

      <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-lumm-text-primary">Препятствия и план</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Что увидят снаружи">{asStr(d.outcomeExternal)}</Field>
          <Field label="Что почувствую внутри">{asStr(d.outcomeInternal)}</Field>
        </div>
        <Field label="Тип препятствия">
          {OBSTACLE_LABELS[asStr(d.obstacleType)] ?? ""}
        </Field>
        <Field label="Главное препятствие">{asStr(d.primaryObstacle)}</Field>
        {asStr(d.secondaryObstacle) && <Field label="Второе по силе">{asStr(d.secondaryObstacle)}</Field>}

        {ifThen.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-lumm-text-secondary">План «когда — тогда»</div>
            {ifThen.map((p, i) => (
              <div key={i} className="text-sm text-lumm-text-primary">
                <span className="text-lumm-gold">Когда</span> {p.when} — <span className="text-lumm-gold">тогда</span> {p.then}
              </div>
            ))}
          </div>
        )}
      </section>

      {(leadActions.length > 0 || asStr(d.milestone14) || asStr(d.milestone58) || asStr(d.milestone912)) && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-lumm-text-primary">План на 12 недель</h2>
          {leadActions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-lumm-text-secondary">Ведущие действия</div>
              {leadActions.map((a, i) => (
                <div key={i} className="text-sm text-lumm-text-primary">
                  {a.name} — <span className="text-lumm-text-secondary">{a.freq}</span>
                </div>
              ))}
            </div>
          )}
          {asStr(d.milestone14) && <Field label="Недели 1–4">{asStr(d.milestone14)}</Field>}
          {asStr(d.milestone58) && <Field label="Недели 5–8">{asStr(d.milestone58)}</Field>}
          {asStr(d.milestone912) && <Field label="Недели 9–12">{asStr(d.milestone912)}</Field>}
        </section>
      )}

      {nonGoals.length > 0 && (
        <section className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-lumm-text-primary">Что я НЕ жертвую</h2>
          <ul className="list-decimal list-inside space-y-1 text-sm text-lumm-text-primary">
            {nonGoals.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
