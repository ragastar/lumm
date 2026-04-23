"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Target, Heart, Compass, Calendar, ShieldCheck,
  ClipboardCheck, CheckCircle2, ArrowRight, ArrowLeft,
  Info, AlertCircle, Copy, Check, Circle, Mountain,
} from "lucide-react";

type WizardInitial = {
  wish: string;
  sphere: string;
  sciScore: number;
  kleinAvg: number;
  difficulty: number;
  metricName: string | null;
  metricStart: string | null;
  metricTarget: string | null;
  data: Record<string, unknown>;
} | null;

type Props = {
  memberId: string;
  memberName: string;
  initial: WizardInitial;
};

type IfThen = { when: string; then: string };
type LeadAction = { name: string; freq: string };

type WizardData = {
  annualGoal: string; cyclePosition: number; annualServing: string;
  plannedArc: string[];
  name: string; cycleStart: string; partner: string;
  sphere: string; sphereReason: string; baseline: string;
  internalReason: string; hiddenTest: string; successScene: string;
  costOfInaction: string; newSkills: string; difficulty: number;
  wish: string;
  outcomeExternal: string; outcomeInternal: string;
  primaryObstacle: string; obstacleType: string; secondaryObstacle: string;
  ifThen: IfThen[];
  metricName: string; metricStart: string; metricTarget: string;
  leadActions: LeadAction[];
  milestone14: string; milestone58: string; milestone912: string;
  sciShame: number; sciExternal: number; sciIdentified: number; sciIntrinsic: number;
  klein1: number; klein2: number; klein3: number; klein4: number;
  coherenceLong: string; coherenceWide: string;
  nonGoals: string[];
  confirm: boolean[];
};

const wizardStyles = `
.font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
.font-body { font-family: 'Manrope', system-ui, sans-serif; }

.step-enter { animation: stepEnter 400ms cubic-bezier(0.2, 0.7, 0.3, 1); }
@keyframes stepEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.slider-track { appearance: none; -webkit-appearance: none; }
.slider-track::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 22px; height: 22px; border-radius: 50%;
  background: #1F1A16; border: 3px solid #F5EFE6;
  cursor: pointer; box-shadow: 0 2px 8px rgba(31,26,22,0.25);
  transition: transform 120ms ease;
}
.slider-track::-webkit-slider-thumb:hover { transform: scale(1.1); }
.slider-track::-moz-range-thumb {
  width: 22px; height: 22px; border-radius: 50%;
  background: #1F1A16; border: 3px solid #F5EFE6;
  cursor: pointer; box-shadow: 0 2px 8px rgba(31,26,22,0.25);
}

.wizard-body ::selection { background: #B8472D; color: #F5EFE6; }

.checkbox-custom:checked + span { background: #1F1A16; border-color: #1F1A16; }
.checkbox-custom:checked + span svg { opacity: 1; }
`;

const COLORS = {
  bg: "#F5EFE6",
  card: "#FBF7F0",
  border: "#E5DED2",
  borderSoft: "#EDE5D7",
  text: "#1F1A16",
  muted: "#6B6158",
  accent: "#B8472D",
  accentHover: "#9E3A22",
  green: "#5A7A3D",
  amber: "#B8902D",
  red: "#A83A2D",
};

const SPHERES = [
  { id: "business", label: "Бизнес и деньги", emoji: "💼" },
  { id: "health", label: "Здоровье и спорт", emoji: "🫀" },
  { id: "skills", label: "Навыки и обучение", emoji: "📚" },
  { id: "family", label: "Семья и отношения", emoji: "🏠" },
  { id: "creative", label: "Творчество", emoji: "🎨" },
  { id: "finance", label: "Финансы", emoji: "💰" },
];

const emptyData: WizardData = {
  annualGoal: "", cyclePosition: 0, annualServing: "",
  plannedArc: ["", "", "", ""],
  name: "", cycleStart: "", partner: "",
  sphere: "", sphereReason: "", baseline: "",
  internalReason: "", hiddenTest: "", successScene: "",
  costOfInaction: "", newSkills: "", difficulty: 6,
  wish: "",
  outcomeExternal: "", outcomeInternal: "",
  primaryObstacle: "", obstacleType: "", secondaryObstacle: "",
  ifThen: [{ when: "", then: "" }, { when: "", then: "" }, { when: "", then: "" }],
  metricName: "", metricStart: "", metricTarget: "",
  leadActions: [{ name: "", freq: "" }, { name: "", freq: "" }, { name: "", freq: "" }],
  milestone14: "", milestone58: "", milestone912: "",
  sciShame: 5, sciExternal: 5, sciIdentified: 5, sciIntrinsic: 5,
  klein1: 3, klein2: 3, klein3: 3, klein4: 3,
  coherenceLong: "", coherenceWide: "",
  nonGoals: ["", "", "", "", ""],
  confirm: [false, false, false, false],
};

// ─────────────────────────── UI PRIMITIVES ───────────────────────────

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <div className="text-[15px] font-medium tracking-tight" style={{ color: COLORS.text }}>{children}</div>
      {hint && <div className="text-[13px] mt-1 leading-relaxed" style={{ color: COLORS.muted }}>{hint}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-lg outline-none transition-colors text-[15px]"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
      onFocus={(e) => (e.target.style.borderColor = COLORS.text)}
      onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 rounded-lg outline-none transition-colors text-[15px] resize-y leading-relaxed"
      style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
      onFocus={(e) => (e.target.style.borderColor = COLORS.text)}
      onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
    />
  );
}

function Slider({ value, onChange, min = 1, max = 10, labels }: { value: number; onChange: (v: number) => void; min?: number; max?: number; labels?: [string, string] }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="slider-track flex-1 h-1 rounded-full"
          style={{
            background: `linear-gradient(to right, ${COLORS.text} 0%, ${COLORS.text} ${((value - min) / (max - min)) * 100}%, ${COLORS.border} ${((value - min) / (max - min)) * 100}%, ${COLORS.border} 100%)`,
          }}
        />
        <div className="font-display text-2xl font-semibold w-12 text-right" style={{ color: COLORS.text }}>{value}</div>
      </div>
      {labels && (
        <div className="flex justify-between mt-2 text-[12px]" style={{ color: COLORS.muted }}>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  );
}

function Card({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "muted" }) {
  const tones = {
    default: { bg: COLORS.card, border: COLORS.border },
    accent: { bg: "#F9EDE4", border: "#E8C9B5" },
    muted: { bg: "#F0E9DC", border: COLORS.borderSoft },
  };
  const t = tones[tone];
  return (
    <div className="rounded-xl p-5" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      {children}
    </div>
  );
}

type BadgeColor = "green" | "amber" | "red" | "neutral";
function Badge({ children, color }: { children: React.ReactNode; color: BadgeColor }) {
  const palette: Record<BadgeColor, { bg: string; text: string }> = {
    green: { bg: "#E8EFDE", text: COLORS.green },
    amber: { bg: "#F5ECD5", text: COLORS.amber },
    red: { bg: "#F2DCD5", text: COLORS.red },
    neutral: { bg: COLORS.borderSoft, text: COLORS.muted },
  };
  const p = palette[color];
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium" style={{ background: p.bg, color: p.text }}>
      {children}
    </span>
  );
}

type TrafficStatus = "green" | "amber" | "red" | "gray";
function TrafficLight({ status, label }: { status: TrafficStatus; label: string }) {
  const palette: Record<TrafficStatus, { fill: string; bg: string }> = {
    green: { fill: COLORS.green, bg: "#E8EFDE" },
    amber: { fill: COLORS.amber, bg: "#F5ECD5" },
    red: { fill: COLORS.red, bg: "#F2DCD5" },
    gray: { fill: COLORS.muted, bg: COLORS.borderSoft },
  };
  const p = palette[status];
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: p.bg }}>
        <div className="w-3 h-3 rounded-full" style={{ background: p.fill }} />
      </div>
      <div className="text-[14px]" style={{ color: COLORS.text }}>{label}</div>
    </div>
  );
}

function CheckboxItem({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="checkbox-custom sr-only" />
      <span
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
        style={{ background: checked ? COLORS.text : COLORS.card, border: `1.5px solid ${checked ? COLORS.text : COLORS.border}` }}
      >
        <Check className="w-3.5 h-3.5 text-white transition-opacity" style={{ opacity: checked ? 1 : 0 }} />
      </span>
      <span className="text-[14px] leading-relaxed" style={{ color: COLORS.text }}>{children}</span>
    </label>
  );
}

function SectionTitle({ step, total, icon: Icon, title, subtitle }: { step: number; total: number; icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 text-[12px] uppercase tracking-widest font-medium" style={{ color: COLORS.muted }}>
        <Icon className="w-3.5 h-3.5" />
        <span>Шаг {step} из {total}</span>
      </div>
      <h2 className="font-display text-4xl md:text-5xl font-medium leading-[1.05] mb-3" style={{ color: COLORS.text }}>
        {title}
      </h2>
      {subtitle && <p className="text-[16px] leading-relaxed max-w-2xl" style={{ color: COLORS.muted }}>{subtitle}</p>}
    </div>
  );
}

type UpdateFn = <K extends keyof WizardData>(key: K, val: WizardData[K]) => void;

// ─────────────────────────── STEP 0 — WELCOME ───────────────────────────
function Step0({ onStart }: { onStart: () => void }) {
  return (
    <div className="step-enter">
      <div className="text-[12px] uppercase tracking-widest mb-6 font-medium" style={{ color: COLORS.accent }}>LUMM × Wombo Combo</div>
      <h1 className="font-display text-5xl md:text-7xl font-medium leading-[0.95] mb-6 tracking-tight" style={{ color: COLORS.text }}>
        Цель <span className="italic font-normal">на 12 недель</span>
      </h1>
      <p className="text-[17px] leading-relaxed mb-10 max-w-xl" style={{ color: COLORS.muted }}>
        Пошаговый разбор цели перед стартом цикла мастермайнда.
        Система собрана из четырёх научно подтверждённых методов — WOOP, HARD, 12&nbsp;Week Year и двух психометрических шкал.
      </p>

      <Card>
        <div className="text-[13px] uppercase tracking-widest mb-4 font-medium" style={{ color: COLORS.muted }}>Как устроен цикл</div>
        <div className="space-y-3">
          {[
            ["0", "Стартовая встреча", "Защита цели перед группой"],
            ["1–4", "Еженедельные отчёты", "Процент выполнения + уверенность"],
            ["~4", "Промежуточная встреча", "Статус, корректировки, вопросы"],
            ["5–8", "Еженедельные отчёты", ""],
            ["~8", "Промежуточная встреча", ""],
            ["9–12", "Еженедельные отчёты", ""],
            ["12", "Итоговая встреча", "Ретро и старт следующего цикла"],
          ].map(([week, title, desc], i) => (
            <div key={i} className="flex items-start gap-4 py-1">
              <div className="font-display text-[15px] w-14 flex-shrink-0 pt-0.5" style={{ color: COLORS.accent }}>{week}</div>
              <div className="flex-1">
                <div className="text-[15px] font-medium" style={{ color: COLORS.text }}>{title}</div>
                {desc && <div className="text-[13px] mt-0.5" style={{ color: COLORS.muted }}>{desc}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-8 p-4 rounded-lg flex items-start gap-3" style={{ background: "#F9EDE4", border: `1px solid #E8C9B5` }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.accent }} />
        <div className="text-[13px] leading-relaxed" style={{ color: COLORS.text }}>
          Заполнение займёт 45–90 минут вдумчивой работы. Черновик сохраняется автоматически — можно прервать и вернуться.
        </div>
      </div>

      <button
        onClick={onStart}
        className="mt-8 inline-flex items-center gap-2 px-7 py-4 rounded-lg text-[15px] font-medium transition-all"
        style={{ background: COLORS.text, color: COLORS.bg }}
        onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.accent)}
        onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.text)}
      >
        Начать заполнение
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─────────────────────────── STEP ANNUAL ───────────────────────────
function StepAnnual({ data, update }: { data: WizardData; update: UpdateFn }) {
  const updateArc = (idx: number, val: string) => {
    const copy = [...data.plannedArc];
    copy[idx] = val;
    update("plannedArc", copy);
  };

  return (
    <div className="step-enter">
      <SectionTitle step={1} total={8} icon={Mountain}
        title="Годовой ориентир"
        subtitle="12 недель — один из четырёх циклов в году. Зафиксируй годовую траекторию, чтобы цикл не жил отдельно от большой картины." />

      <Card tone="accent">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.accent }} />
          <div className="text-[13px] leading-relaxed" style={{ color: COLORS.text }}>
            Годовой слой — это <strong>направление</strong>, не контракт со SMART-метриками.
            В течение цикла он лежит в фоне: один раз зафиксировал, проверил «обслуживает ли текущая цель годовую?» — и дальше живёшь только 12 неделями.
          </div>
        </div>
      </Card>

      <div className="space-y-6 mt-6">
        <div>
          <Label hint="Одно предложение. Куда хочу сместиться за 12 месяцев — область, направление, роль">Годовой ориентир</Label>
          <TextArea value={data.annualGoal} onChange={(v) => update("annualGoal", v)} rows={2}
            placeholder="Например: «Превратить Neon Boutique в автономный бизнес с одним менеджером и выручкой 5М ₽/мес»" />
        </div>

        <div>
          <Label hint="Годовой ориентир разбивается на 4 цикла по 12 недель">Какой это цикл</Label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => {
              const active = data.cyclePosition === n;
              return (
                <button key={n} onClick={() => update("cyclePosition", n)}
                  className="p-4 rounded-lg text-center transition-all"
                  style={{
                    background: active ? COLORS.text : COLORS.card,
                    color: active ? COLORS.bg : COLORS.text,
                    border: `1px solid ${active ? COLORS.text : COLORS.border}`,
                  }}>
                  <div className="font-display text-3xl font-semibold mb-0.5">{n}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-70">из 4</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label hint="Как именно эти 12 недель двигают годовой ориентир. Какой этап в траектории ты закрываешь">Чем этот цикл служит годовой цели</Label>
          <TextArea value={data.annualServing} onChange={(v) => update("annualServing", v)} rows={3}
            placeholder="Например: «В этом цикле запускаю NeonMailer-агента для B2C-потока и первой Masterclass-воронки. Это фундамент, без которого следующие три цикла невозможны»" />
        </div>

        <Card tone="muted">
          <Label hint="Опционально. Помогает увидеть год целиком — одна короткая фраза на цикл">Траектория года (по желанию)</Label>
          <div className="space-y-2 mt-3">
            {data.plannedArc.map((v, i) => {
              const isCurrent = data.cyclePosition === i + 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="font-display text-[14px] font-semibold w-20 flex-shrink-0 flex items-center gap-1.5"
                    style={{ color: isCurrent ? COLORS.accent : COLORS.muted }}>
                    <span>Цикл {i + 1}</span>
                    {isCurrent && <span className="text-[16px]">←</span>}
                  </div>
                  <div className="flex-1">
                    <TextInput value={v} onChange={(val) => updateArc(i, val)}
                      placeholder={isCurrent ? "Заполнить детально на следующих шагах" : `О чём примерно цикл ${i + 1}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────── STEP 1 — CONTEXT ───────────────────────────
function Step1({ data, update }: { data: WizardData; update: UpdateFn }) {
  return (
    <div className="step-enter">
      <SectionTitle step={2} total={8} icon={Target}
        title="Контекст"
        subtitle="Кто ты в этом цикле, к какой сфере привязана цель и откуда ты стартуешь." />

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Имя</Label>
            <TextInput value={data.name} onChange={(v) => update("name", v)} placeholder="Как к тебе обращаться" />
          </div>
          <div>
            <Label>Дата старта цикла</Label>
            <TextInput value={data.cycleStart} onChange={(v) => update("cycleStart", v)} placeholder="Например, 28 апреля 2026" />
          </div>
        </div>

        <div>
          <Label hint="Один человек из группы, которому пишешь лично, если забуксовал">Напарник по цели</Label>
          <TextInput value={data.partner} onChange={(v) => update("partner", v)} placeholder="Имя" />
        </div>

        <div>
          <Label hint="Выбери одну — не больше. Фокус важнее охвата">Сфера цели</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SPHERES.map((s) => {
              const active = data.sphere === s.id;
              return (
                <button key={s.id} onClick={() => update("sphere", s.id)}
                  className="p-4 rounded-lg text-left transition-all"
                  style={{
                    background: active ? COLORS.text : COLORS.card,
                    color: active ? COLORS.bg : COLORS.text,
                    border: `1px solid ${active ? COLORS.text : COLORS.border}`,
                  }}>
                  <div className="text-2xl mb-1">{s.emoji}</div>
                  <div className="text-[14px] font-medium">{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label hint="2–3 предложения">Почему именно эта сфера сейчас, а не другая?</Label>
          <TextArea value={data.sphereReason} onChange={(v) => update("sphereReason", v)}
            placeholder="Что прямо сейчас делает эту сферу приоритетной..." />
        </div>

        <div>
          <Label hint="В цифрах или конкретных фактах, без размытостей">Где ты находишься сейчас по этой сфере</Label>
          <TextArea value={data.baseline} onChange={(v) => update("baseline", v)}
            placeholder="Например: выручка 2.3 млн ₽/мес в среднем за Q1, маржа 28%, один менеджер..." />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── STEP 2 — HARD ───────────────────────────
function Step2({ data, update }: { data: WizardData; update: UpdateFn }) {
  const difficultyZone = useMemo<{ color: BadgeColor; label: string }>(() => {
    if (data.difficulty <= 4) return { color: "red", label: "Слишком легко — не бери в цикл" };
    if (data.difficulty <= 7) return { color: "green", label: "Продуктивный стресс — попадание" };
    if (data.difficulty <= 9) return { color: "amber", label: "Агрессивно — высокий риск выгорания" };
    return { color: "red", label: "Переформулируй — не для 12 недель" };
  }, [data.difficulty]);

  return (
    <div className="step-enter">
      <SectionTitle step={3} total={8} icon={Heart}
        title="Эмоциональная тяга"
        subtitle="Прежде чем расписывать план — проверь, тянет ли тебя к цели изнутри. Если здесь буксует, план не спасёт." />

      <div className="space-y-6">
        <div>
          <Label hint="Не «чтобы было лучше», а конкретная ценность, смысл или часть тебя, которая этого хочет">Почему это важно именно тебе?</Label>
          <TextArea value={data.internalReason} onChange={(v) => update("internalReason", v)} />
        </div>

        <Card tone="accent">
          <Label hint="Проверка на скрытое «надо»">Если никто никогда не узнает, что ты достиг цели — ты бы всё равно её хотел?</Label>
          <TextArea value={data.hiddenTest} onChange={(v) => update("hiddenTest", v)} rows={3} />
        </Card>

        <div>
          <Label hint="Живая сцена: что видишь, слышишь, чувствуешь физически, что делаешь, что говоришь себе">Картина успеха — конкретный момент через 12 недель</Label>
          <TextArea value={data.successScene} onChange={(v) => update("successScene", v)} rows={5} />
        </div>

        <div>
          <Label hint="Через полгода, через 2 года">Какова цена бездействия?</Label>
          <TextArea value={data.costOfInaction} onChange={(v) => update("costOfInaction", v)} rows={3} />
        </div>

        <div>
          <Label>Какие новые навыки или ресурсы тебе нужны, которых сейчас нет?</Label>
          <TextArea value={data.newSkills} onChange={(v) => update("newSkills", v)} rows={3} />
        </div>

        <Card>
          <Label hint="Честно: 5–7 — это точка, где цель реально двигает">Уровень сложности цели для тебя</Label>
          <Slider value={data.difficulty} onChange={(v) => update("difficulty", v)} min={1} max={10} labels={["Легко", "Запредельно"]} />
          <div className="mt-4 flex items-center gap-2">
            <Badge color={difficultyZone.color}>
              <Circle className="w-2 h-2 fill-current" />
              {difficultyZone.label}
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────── STEP 3 — WOOP ───────────────────────────
function Step3({ data, update }: { data: WizardData; update: UpdateFn }) {
  const updateIfThen = (idx: number, field: keyof IfThen, val: string) => {
    const copy = [...data.ifThen];
    copy[idx] = { ...copy[idx], [field]: val };
    update("ifThen", copy);
  };

  const wishLen = data.wish.trim().split(/\s+/).filter(Boolean).length;
  const wishOk = wishLen >= 8 && wishLen <= 18;

  return (
    <div className="step-enter">
      <SectionTitle step={4} total={8} icon={Compass}
        title="Желание и препятствие"
        subtitle="Метод WOOP. Единственная часть шаблона с серьёзной научной базой — работает только в этом порядке: желание → результат → препятствие → план." />

      <div className="space-y-6">
        <div>
          <Label hint="10–15 слов, начинается с глагола, без «я хочу»">Желание — одной фразой</Label>
          <TextInput value={data.wish} onChange={(v) => update("wish", v)}
            placeholder="Например: «Вывести бизнес на выручку 5 млн ₽/мес к 12-й неделе»" />
          <div className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: COLORS.muted }}>
            {data.wish && <Badge color={wishOk ? "green" : "amber"}>{wishLen} слов</Badge>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label hint="В цифрах, в фактах, что заметят другие">Что увидят снаружи</Label>
            <TextArea value={data.outcomeExternal} onChange={(v) => update("outcomeExternal", v)} rows={3} />
          </div>
          <div>
            <Label>Что почувствуешь ты внутри</Label>
            <TextArea value={data.outcomeInternal} onChange={(v) => update("outcomeInternal", v)} rows={3} />
          </div>
        </div>

        <Card tone="accent">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.accent }} />
            <div className="text-[13px] leading-relaxed" style={{ color: COLORS.text }}>
              <strong>Настоящее препятствие — всегда внутри.</strong> «Нет времени», «нет денег», «клиенты не платят» — это следствия. Копай глубже: эмоция, привычка, убеждение или состояние.
            </div>
          </div>

          <Label>Тип главного препятствия</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { id: "emotion", label: "Эмоция", desc: "страх, стыд, тревога" },
              { id: "habit", label: "Привычка", desc: "прокрастинация, залипание" },
              { id: "belief", label: "Убеждение", desc: "«у меня не получится»" },
              { id: "state", label: "Состояние", desc: "усталость, пустота" },
            ].map((t) => {
              const active = data.obstacleType === t.id;
              return (
                <button key={t.id} onClick={() => update("obstacleType", t.id)}
                  className="p-3 rounded-lg text-left transition-all"
                  style={{
                    background: active ? COLORS.text : COLORS.card,
                    color: active ? COLORS.bg : COLORS.text,
                    border: `1px solid ${active ? COLORS.text : COLORS.border}`,
                  }}>
                  <div className="text-[13px] font-semibold mb-0.5">{t.label}</div>
                  <div className="text-[11px] opacity-70">{t.desc}</div>
                </button>
              );
            })}
          </div>

          <Label>Главное внутреннее препятствие</Label>
          <TextArea value={data.primaryObstacle} onChange={(v) => update("primaryObstacle", v)} rows={3} />

          <div className="mt-4">
            <Label>Второе по силе (на случай, если первое обойдёшь)</Label>
            <TextArea value={data.secondaryObstacle} onChange={(v) => update("secondaryObstacle", v)} rows={2} />
          </div>
        </Card>

        <div>
          <Label hint="Формат «когда — тогда». Действие конкретное, срабатывает сразу после триггера">План на препятствия</Label>
          <div className="space-y-3">
            {data.ifThen.map((pair, i) => (
              <div key={i} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.border}` }}>
                <div className="grid md:grid-cols-2">
                  <div className="p-3" style={{ background: COLORS.card, borderRight: `1px solid ${COLORS.border}` }}>
                    <div className="text-[11px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: COLORS.accent }}>Когда</div>
                    <input type="text" value={pair.when} onChange={(e) => updateIfThen(i, "when", e.target.value)}
                      placeholder="почувствую X, замечу Y..."
                      className="w-full bg-transparent outline-none text-[14px]" style={{ color: COLORS.text }} />
                  </div>
                  <div className="p-3" style={{ background: COLORS.bg }}>
                    <div className="text-[11px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: COLORS.accent }}>Тогда</div>
                    <input type="text" value={pair.then} onChange={(e) => updateIfThen(i, "then", e.target.value)}
                      placeholder="делаю Z..."
                      className="w-full bg-transparent outline-none text-[14px]" style={{ color: COLORS.text }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── STEP 4 — PLAN ───────────────────────────
function Step4({ data, update }: { data: WizardData; update: UpdateFn }) {
  const updateAction = (idx: number, field: keyof LeadAction, val: string) => {
    const copy = [...data.leadActions];
    copy[idx] = { ...copy[idx], [field]: val };
    update("leadActions", copy);
  };

  return (
    <div className="step-enter">
      <SectionTitle step={5} total={8} icon={Calendar}
        title="План на 12 недель"
        subtitle="Разбор цели на метрику результата и еженедельные действия, которые её двигают." />

      <div className="space-y-6">
        <Card>
          <Label hint="Одна цифра или факт, по которому через 12 недель будет ясно — достиг или нет">Итоговая метрика результата</Label>
          <div className="space-y-3">
            <div>
              <div className="text-[12px] mb-1.5" style={{ color: COLORS.muted }}>Что измеряем</div>
              <TextInput value={data.metricName} onChange={(v) => update("metricName", v)} placeholder="Выручка в месяц, кол-во клиентов, вес тела..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[12px] mb-1.5" style={{ color: COLORS.muted }}>Старт (неделя 0)</div>
                <TextInput value={data.metricStart} onChange={(v) => update("metricStart", v)} placeholder="2.3 млн ₽" />
              </div>
              <div>
                <div className="text-[12px] mb-1.5" style={{ color: COLORS.muted }}>Цель (неделя 12)</div>
                <TextInput value={data.metricTarget} onChange={(v) => update("metricTarget", v)} placeholder="5 млн ₽" />
              </div>
            </div>
          </div>
        </Card>

        <div>
          <Label hint="Действия, которые на 100% под твоим контролем. Каждое должно: двигать результат / быть повторяемым / зависеть только от тебя / быть бинарно измеримым">Ведущие действия недели (1–3)</Label>
          <div className="space-y-2">
            {data.leadActions.map((a, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-1">
                  <TextInput value={a.name} onChange={(v) => updateAction(i, "name", v)} placeholder={`Действие ${i + 1}`} />
                </div>
                <div className="w-40">
                  <TextInput value={a.freq} onChange={(v) => updateAction(i, "freq", v)} placeholder="раз в неделю" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Контрольные точки по блокам</Label>
          <div className="space-y-3">
            {([
              ["Недели 1–4", "milestone14"],
              ["Недели 5–8", "milestone58"],
              ["Недели 9–12", "milestone912"],
            ] as const).map(([label, key]) => (
              <div key={key} className="flex gap-4 items-start">
                <div className="font-display text-[14px] font-medium pt-3 w-28 flex-shrink-0" style={{ color: COLORS.accent }}>{label}</div>
                <div className="flex-1">
                  <TextInput value={data[key]} onChange={(v) => update(key, v)} placeholder="К концу блока достигаю..." />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card tone="muted">
          <div className="text-[12px] uppercase tracking-widest mb-3 font-medium" style={{ color: COLORS.muted }}>Еженедельный отчёт в Telegram</div>
          <div className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.text }}>
{`#отчет неделя N из 12
Выполнение: X% (N из M ведущих действий)
Метрика: [значение] (сдвиг от старта)
Уверенность 1–10: X
Главное за неделю: ...
План следующей недели: ...`}
          </div>
          <div className="mt-3 text-[13px] leading-relaxed" style={{ color: COLORS.muted }}>
            Целевой процент выполнения — не ниже 85%. Если уверенность падает ниже 5 две недели подряд — внеплановый звонок с напарником.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────── STEP 5 — QUALITY CHECK ───────────────────────────
function Step5({ data, update }: { data: WizardData; update: UpdateFn }) {
  const sci = data.sciIntrinsic + data.sciIdentified - (data.sciShame + data.sciExternal);
  const sciStatus: TrafficStatus = sci >= 8 ? "green" : sci >= 3 ? "amber" : "red";
  const sciLabel = sci >= 8 ? "Цель по-настоящему твоя" : sci >= 3 ? "Согласованность средняя" : sci >= 0 ? "Риск — переформулируй" : "НЕ бери в цикл";

  const kleinAvg = (data.klein1 + data.klein2 + data.klein3 + data.klein4) / 4;
  const kleinStatus: TrafficStatus = kleinAvg >= 4.5 ? "green" : kleinAvg >= 3.5 ? "amber" : "red";
  const kleinLabel = kleinAvg >= 4.5 ? "Высокая приверженность" : kleinAvg >= 3.5 ? "Приемлемо" : "Цель не взлетит, пересмотри";

  return (
    <div className="step-enter">
      <SectionTitle step={6} total={8} icon={ClipboardCheck}
        title="Проверка качества"
        subtitle="Две психометрические шкалы — единственный способ заранее понять, выдержит ли цель 12 недель." />

      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <Label>Согласованность цели с собой</Label>
            <Badge color={sciStatus === "green" ? "green" : sciStatus === "amber" ? "amber" : "red"}>Балл: {sci > 0 ? "+" : ""}{sci}</Badge>
          </div>
          <p className="text-[13px] mb-5 leading-relaxed" style={{ color: COLORS.muted }}>
            Если цель идёт из страха или давления — она разваливается в первый же тяжёлый момент. Оцени каждое утверждение от 1 (нет) до 9 (абсолютно да).
          </p>

          <div className="space-y-5">
            {([
              ["sciShame", "Преследую её, потому что БУДУ СТЫДНО или тревожно, если не достигну", "−"],
              ["sciExternal", "Преследую её, потому что КТО-ТО ДРУГОЙ этого хочет или обстоятельства требуют", "−"],
              ["sciIdentified", "Преследую её, потому что ОСИЛИВАНИЕ ЦЕЛЬЮ — это важно", "+"],
              ["sciIntrinsic", "Преследую её, потому что это НАСТОЯЩЕЕ УДОВОЛЬСТВИЕ или интересно само по себе", "+"],
            ] as const).map(([key, label, sign]) => (
              <div key={key}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="font-display text-[15px] font-semibold flex-shrink-0" style={{ color: sign === "+" ? COLORS.green : COLORS.red }}>{sign}</div>
                  <div className="text-[14px] leading-relaxed flex-1" style={{ color: COLORS.text }}>{label}</div>
                </div>
                <div className="pl-6">
                  <Slider value={data[key]} onChange={(v) => update(key, v)} min={1} max={9} labels={["абсолютно нет", "абсолютно да"]} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t" style={{ borderColor: COLORS.borderSoft }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-widest font-medium mb-1" style={{ color: COLORS.muted }}>Результат</div>
                <div className="text-[15px] font-medium" style={{ color: COLORS.text }}>{sciLabel}</div>
              </div>
              <div className="font-display text-5xl font-semibold" style={{ color: sciStatus === "green" ? COLORS.green : sciStatus === "amber" ? COLORS.amber : COLORS.red }}>
                {sci > 0 ? "+" : ""}{sci}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <Label>Приверженность цели</Label>
            <Badge color={kleinStatus === "green" ? "green" : kleinStatus === "amber" ? "amber" : "red"}>{kleinAvg.toFixed(1)} / 5</Badge>
          </div>
          <p className="text-[13px] mb-5 leading-relaxed" style={{ color: COLORS.muted }}>Оцени каждый вопрос от 1 (совсем нет) до 5 (максимально).</p>

          <div className="space-y-4">
            {([
              ["klein1", "Насколько сильно я привержен этой цели?"],
              ["klein2", "Насколько эта цель для меня важна?"],
              ["klein3", "Насколько я посвящаю себя этой цели?"],
              ["klein4", "Насколько это мой собственный выбор — быть приверженным ей?"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <div className="text-[14px] mb-2 leading-relaxed" style={{ color: COLORS.text }}>{label}</div>
                <Slider value={data[key]} onChange={(v) => update(key, v)} min={1} max={5} />
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t" style={{ borderColor: COLORS.borderSoft }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] uppercase tracking-widest font-medium mb-1" style={{ color: COLORS.muted }}>Среднее</div>
                <div className="text-[15px] font-medium" style={{ color: COLORS.text }}>{kleinLabel}</div>
              </div>
              <div className="font-display text-5xl font-semibold" style={{ color: kleinStatus === "green" ? COLORS.green : kleinStatus === "amber" ? COLORS.amber : COLORS.red }}>
                {kleinAvg.toFixed(1)}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <Label>Согласованность с остальной жизнью</Label>
          <div className="space-y-4 mt-3">
            <div>
              <div className="text-[12px] mb-1.5" style={{ color: COLORS.muted }}>Как эта цель работает на твои приоритеты на 5 лет вперёд?</div>
              <TextArea value={data.coherenceLong} onChange={(v) => update("coherenceLong", v)} rows={2} />
            </div>
            <div>
              <div className="text-[12px] mb-1.5" style={{ color: COLORS.muted }}>Не конфликтует ли с другими целями и ролями (семья, здоровье, другие бизнесы)? Если да — как балансируешь?</div>
              <TextArea value={data.coherenceWide} onChange={(v) => update("coherenceWide", v)} rows={3} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────── STEP 6 — NON-GOALS ───────────────────────────
function Step6({ data, update }: { data: WizardData; update: UpdateFn }) {
  const updateNonGoal = (idx: number, val: string) => {
    const copy = [...data.nonGoals];
    copy[idx] = val;
    update("nonGoals", copy);
  };

  return (
    <div className="step-enter">
      <SectionTitle step={7} total={8} icon={ShieldCheck}
        title="Что ты НЕ жертвуешь"
        subtitle="Страховка от «цель любой ценой». Без этого списка амбициозная цель съедает здоровье, отношения или этику." />

      <Card tone="accent">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.accent }} />
          <div className="text-[13px] leading-relaxed" style={{ color: COLORS.text }}>
            Перечисли 3–5 вещей, которые ты НЕ будешь приносить в жертву, даже если кажется, что жертва ускорит результат.
            Примеры: сон не меньше 7 часов, утро с ребёнком до 9:00, один полный выходной с семьёй.
          </div>
        </div>
      </Card>

      <div className="space-y-2 mt-6">
        {data.nonGoals.map((v, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="font-display text-[18px] w-6 text-right" style={{ color: COLORS.accent }}>{i + 1}</div>
            <div className="flex-1">
              <TextInput value={v} onChange={(val) => updateNonGoal(i, val)} placeholder="Что не жертвую..." />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────── STEP 7 — SUMMARY ───────────────────────────
function Step7({ data, update, memberId }: { data: WizardData; update: UpdateFn; memberId: string }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const checks = useMemo(() => {
    const wish = data.wish.trim();
    const specificity: TrafficStatus = wish.length > 20 ? "green" : wish.length > 0 ? "amber" : "red";
    const measurability: TrafficStatus = data.metricName && data.metricTarget ? "green" : "red";
    const timeBound: TrafficStatus =
      data.milestone14 && data.milestone58 && data.milestone912 ? "green" :
      data.milestone14 || data.milestone58 || data.milestone912 ? "amber" : "red";
    const ambition: TrafficStatus = data.difficulty >= 5 && data.difficulty <= 8 ? "green" : data.difficulty === 4 || data.difficulty === 9 ? "amber" : "red";
    const review: TrafficStatus = "green";

    const sci = data.sciIntrinsic + data.sciIdentified - (data.sciShame + data.sciExternal);
    const sciStatus: TrafficStatus = sci >= 8 ? "green" : sci >= 3 ? "amber" : "red";

    const kleinAvg = (data.klein1 + data.klein2 + data.klein3 + data.klein4) / 4;
    const kleinStatus: TrafficStatus = kleinAvg >= 4.5 ? "green" : kleinAvg >= 3.5 ? "amber" : "red";

    const ifThenOk = data.ifThen.filter((p) => p.when.trim() && p.then.trim()).length >= 2;
    const ifThenStatus: TrafficStatus = ifThenOk ? "green" : "red";

    const internalObstacleStatus: TrafficStatus = data.primaryObstacle && data.obstacleType ? "green" : "red";

    const coherenceStatus: TrafficStatus =
      data.coherenceLong.length > 20 && data.coherenceWide.length > 20 ? "green" :
      data.coherenceLong || data.coherenceWide ? "amber" : "red";

    return {
      basic: [
        { label: "Конкретность — можно ли понять цель без пояснений", status: specificity },
        { label: "Измеримость — есть ли однозначная метрика", status: measurability },
        { label: "Срок — есть ли контрольные точки по блокам", status: timeBound },
        { label: "Амбиция — сложность в зоне 5–8", status: ambition },
        { label: "Регулярный разбор — встречи и отчёты зафиксированы", status: review },
      ],
      advanced: [
        { label: "Согласованность с собой (SCI)", status: sciStatus, value: sci > 0 ? `+${sci}` : `${sci}` },
        { label: "Приверженность цели (Klein)", status: kleinStatus, value: `${kleinAvg.toFixed(1)}/5` },
        { label: "План «когда — тогда» заполнен (мин. 2)", status: ifThenStatus, value: undefined },
        { label: "Препятствие — внутреннее, не внешняя отговорка", status: internalObstacleStatus, value: undefined },
        { label: "Согласованность с остальной жизнью", status: coherenceStatus, value: undefined },
      ],
    };
  }, [data]);

  const basicGreen = checks.basic.filter((c) => c.status === "green").length;
  const advancedGreen = checks.advanced.filter((c) => c.status === "green").length;
  const readyToPresent = basicGreen === 5 && advancedGreen >= 3;

  const toMarkdown = () => {
    const sphere = SPHERES.find((s) => s.id === data.sphere)?.label ?? "—";
    const obstType = ({ emotion: "Эмоция", habit: "Привычка", belief: "Убеждение", state: "Состояние", "": "—" } as Record<string, string>)[data.obstacleType];
    const sci = data.sciIntrinsic + data.sciIdentified - (data.sciShame + data.sciExternal);
    const kleinAvg = ((data.klein1 + data.klein2 + data.klein3 + data.klein4) / 4).toFixed(1);

    return `# Цель на 12 недель — ${data.name || "—"}

**Дата старта:** ${data.cycleStart || "—"}
**Напарник по цели:** ${data.partner || "—"}
**Сфера:** ${sphere}

## Годовой ориентир
**Ориентир:** ${data.annualGoal || "—"}
**Позиция в году:** цикл ${data.cyclePosition || "—"} из 4
**Чем этот цикл служит годовой цели:** ${data.annualServing || "—"}

## Контекст
**Почему именно эта сфера:** ${data.sphereReason || "—"}
**Стартовая точка:** ${data.baseline || "—"}

## Эмоциональная тяга
**Почему это важно:** ${data.internalReason || "—"}
**Проверка на скрытое надо:** ${data.hiddenTest || "—"}
**Картина успеха:** ${data.successScene || "—"}
**Цена бездействия:** ${data.costOfInaction || "—"}
**Новые навыки/ресурсы:** ${data.newSkills || "—"}
**Уровень сложности:** ${data.difficulty}/10

## Желание и препятствие (WOOP)
**Желание:** ${data.wish || "—"}
**Что увидят снаружи:** ${data.outcomeExternal || "—"}
**Что почувствую внутри:** ${data.outcomeInternal || "—"}
**Тип препятствия:** ${obstType}
**Главное препятствие:** ${data.primaryObstacle || "—"}
**Второе препятствие:** ${data.secondaryObstacle || "—"}

**Планы «когда — тогда»:**
${data.ifThen.filter((p) => p.when || p.then).map((p, i) => `${i + 1}. Когда ${p.when} — тогда ${p.then}`).join("\n") || "—"}

## План на 12 недель
**Метрика:** ${data.metricName || "—"}
**Старт:** ${data.metricStart || "—"} → **Цель:** ${data.metricTarget || "—"}

**Ведущие действия недели:**
${data.leadActions.filter((a) => a.name).map((a, i) => `${i + 1}. ${a.name} — ${a.freq}`).join("\n") || "—"}

**Контрольные точки:**
- Недели 1–4: ${data.milestone14 || "—"}
- Недели 5–8: ${data.milestone58 || "—"}
- Недели 9–12: ${data.milestone912 || "—"}

## Проверка качества
**Согласованность с собой (SCI):** ${sci > 0 ? "+" : ""}${sci}
**Приверженность (Klein):** ${kleinAvg}/5
**Согласованность долгосрочная:** ${data.coherenceLong || "—"}
**Согласованность с другими ролями:** ${data.coherenceWide || "—"}

## Запреты — что НЕ жертвую
${data.nonGoals.filter((g) => g).map((g, i) => `${i + 1}. ${g}`).join("\n") || "—"}

---
*LUMM • Wombo Combo • Шаблон v1*
`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleSave = async () => {
    if (!readyToPresent) {
      if (!window.confirm("Цель пока не прошла проверку качества. Сохранить всё равно?")) return;
    }

    setSaving(true);
    setSaveErr(null);

    const payload = {
      wish: data.wish,
      sphere: data.sphere,
      difficulty: data.difficulty,
      metricName: data.metricName || null,
      metricStart: data.metricStart || null,
      metricTarget: data.metricTarget || null,
      sciShame: data.sciShame,
      sciExternal: data.sciExternal,
      sciIdentified: data.sciIdentified,
      sciIntrinsic: data.sciIntrinsic,
      klein1: data.klein1,
      klein2: data.klein2,
      klein3: data.klein3,
      klein4: data.klein4,
      data: {
        name: data.name,
        cycleStart: data.cycleStart,
        partner: data.partner,
        annualGoal: data.annualGoal,
        cyclePosition: data.cyclePosition,
        annualServing: data.annualServing,
        plannedArc: data.plannedArc,
        sphereReason: data.sphereReason,
        baseline: data.baseline,
        internalReason: data.internalReason,
        hiddenTest: data.hiddenTest,
        successScene: data.successScene,
        costOfInaction: data.costOfInaction,
        newSkills: data.newSkills,
        outcomeExternal: data.outcomeExternal,
        outcomeInternal: data.outcomeInternal,
        primaryObstacle: data.primaryObstacle,
        secondaryObstacle: data.secondaryObstacle,
        obstacleType: data.obstacleType,
        ifThen: data.ifThen,
        leadActions: data.leadActions,
        milestone14: data.milestone14,
        milestone58: data.milestone58,
        milestone912: data.milestone912,
        coherenceLong: data.coherenceLong,
        coherenceWide: data.coherenceWide,
        nonGoals: data.nonGoals,
        confirm: data.confirm,
      },
    };

    const res = await fetch("/api/goal-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      try { localStorage.removeItem(`lumm.goal-draft.${memberId}`); } catch { /* ok */ }
      window.location.href = "/goal/my";
    } else {
      const err: { error?: string } = await res.json().catch(() => ({}));
      setSaveErr(err.error ?? "Ошибка сохранения");
      setSaving(false);
    }
  };

  return (
    <div className="step-enter">
      <SectionTitle step={8} total={8} icon={CheckCircle2}
        title="Итог и готовность"
        subtitle="Дашборд качества цели. Для входа в цикл нужно: все 5 базовых зелёные + минимум 3 из 5 углублённых." />

      <div className="space-y-6">
        {(data.annualGoal || data.cyclePosition > 0) && (
          <Card tone="muted">
            <div className="flex items-start gap-3 mb-3">
              <Mountain className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.accent }} />
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-widest font-medium mb-1" style={{ color: COLORS.muted }}>Годовой контекст</div>
                {data.annualGoal && (
                  <div className="font-display text-[18px] leading-snug mb-2" style={{ color: COLORS.text }}>{data.annualGoal}</div>
                )}
                <div className="flex flex-wrap gap-2 items-center">
                  {data.cyclePosition > 0 && <Badge color="neutral">Цикл {data.cyclePosition} из 4</Badge>}
                  {data.annualServing && (
                    <div className="text-[13px] leading-relaxed mt-2 w-full" style={{ color: COLORS.muted }}>{data.annualServing}</div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="text-[12px] uppercase tracking-widest mb-3 font-medium" style={{ color: COLORS.muted }}>Базовые</div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-5xl font-semibold" style={{ color: basicGreen === 5 ? COLORS.green : COLORS.red }}>{basicGreen}</div>
              <div className="text-[15px]" style={{ color: COLORS.muted }}>/ 5 зелёных</div>
            </div>
          </Card>
          <Card>
            <div className="text-[12px] uppercase tracking-widest mb-3 font-medium" style={{ color: COLORS.muted }}>Углублённые</div>
            <div className="flex items-baseline gap-2">
              <div className="font-display text-5xl font-semibold" style={{ color: advancedGreen >= 3 ? COLORS.green : COLORS.amber }}>{advancedGreen}</div>
              <div className="text-[15px]" style={{ color: COLORS.muted }}>/ 5 зелёных</div>
            </div>
          </Card>
        </div>

        <Card tone={readyToPresent ? "default" : "accent"}>
          <div className="flex items-center gap-3 mb-1">
            {readyToPresent ? <CheckCircle2 className="w-5 h-5" style={{ color: COLORS.green }} /> : <AlertCircle className="w-5 h-5" style={{ color: COLORS.accent }} />}
            <div className="font-display text-[22px] font-medium" style={{ color: COLORS.text }}>
              {readyToPresent ? "Готов к стартовой встрече" : "Ещё не готов — переформулируй"}
            </div>
          </div>
          <div className="text-[13px] leading-relaxed" style={{ color: COLORS.muted }}>
            {readyToPresent
              ? "Цель прошла минимальный порог качества. Можно защищать перед группой."
              : "Для входа в цикл нужны все 5 базовых зелёных + минимум 3 из 5 углублённых."}
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-widest mb-4 font-medium" style={{ color: COLORS.muted }}>Базовый блок</div>
          <div className="space-y-3">
            {checks.basic.map((c, i) => <TrafficLight key={i} status={c.status} label={c.label} />)}
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-widest mb-4 font-medium" style={{ color: COLORS.muted }}>Углублённый блок</div>
          <div className="space-y-3">
            {checks.advanced.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <TrafficLight status={c.status} label={c.label} />
                {c.value && (
                  <div className="font-display text-[16px] font-semibold flex-shrink-0"
                    style={{ color: c.status === "green" ? COLORS.green : c.status === "amber" ? COLORS.amber : COLORS.red }}>
                    {c.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-widest mb-4 font-medium" style={{ color: COLORS.muted }}>Перед защитой цели</div>
          <div className="space-y-3">
            {[
              "Я честно прошёл все проверки и готов защищать оценки перед группой",
              "Я зафиксировал запреты и беру ответственность их соблюдать",
              "Я понимаю: цикл длится 12 недель. Отказаться можно в любой момент, перенести — нельзя",
              "Я понимаю: цель моя личная. Группа — зеркало, а не инкубатор",
            ].map((text, i) => (
              <CheckboxItem key={i} checked={data.confirm[i]} onChange={(v) => {
                const copy = [...data.confirm];
                copy[i] = v;
                update("confirm", copy);
              }}>
                {text}
              </CheckboxItem>
            ))}
          </div>
        </Card>

        <div className="flex flex-col md:flex-row gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-[15px] font-medium transition-all disabled:opacity-50"
            style={{ background: COLORS.text, color: COLORS.bg }}>
            {saving ? "Сохранение..." : "Сохранить и посмотреть"}
          </button>
          <button onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-[15px] font-medium transition-all"
            style={{ background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}` }}>
            {copied ? <><Check className="w-4 h-4" /> Скопировано</> : <><Copy className="w-4 h-4" /> Скопировать markdown</>}
          </button>
          <button onClick={() => window.print()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-[15px] font-medium transition-all"
            style={{ background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}` }}>
            Распечатать / PDF
          </button>
        </div>
        {saveErr && <p className="mt-3 text-sm" style={{ color: COLORS.red }}>{saveErr}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────── MAIN ───────────────────────────

export function GoalWizard({ memberId, memberName, initial }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(() => {
    if (!initial) return emptyData;
    return {
      ...emptyData,
      ...(initial.data as Partial<WizardData>),
      name: memberName,
      wish: initial.wish,
      sphere: initial.sphere,
      difficulty: initial.difficulty,
      metricName: initial.metricName ?? "",
      metricStart: initial.metricStart ?? "",
      metricTarget: initial.metricTarget ?? "",
    };
  });

  const update: UpdateFn = (key, val) => setData((prev) => ({ ...prev, [key]: val }));

  const draftKey = `lumm.goal-draft.${memberId}`;

  useEffect(() => {
    if (initial) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.step === "number") setStep(parsed.step);
        if (parsed.data && typeof parsed.data === "object") {
          setData({ ...emptyData, ...parsed.data });
        }
      }
    } catch {
      /* битый draft — игнор */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ step, data }));
      } catch {
        /* QuotaExceeded — игнор */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [step, data, draftKey]);

  const steps = [
    { title: "Начало", icon: Sparkles },
    { title: "Год", icon: Mountain },
    { title: "Контекст", icon: Target },
    { title: "Тяга", icon: Heart },
    { title: "Желание", icon: Compass },
    { title: "План", icon: Calendar },
    { title: "Качество", icon: ClipboardCheck },
    { title: "Запреты", icon: ShieldCheck },
    { title: "Итог", icon: CheckCircle2 },
  ];

  return (
    <div className="wizard-body min-h-screen" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{wizardStyles}</style>

      {step > 0 && (
        <header className="sticky top-0 z-10 backdrop-blur" style={{ background: `${COLORS.bg}dd`, borderBottom: `1px solid ${COLORS.borderSoft}` }}>
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: COLORS.accent }}>LUMM</div>
                <div className="w-1 h-1 rounded-full" style={{ background: COLORS.muted }} />
                <div className="text-[11px] uppercase tracking-widest font-medium" style={{ color: COLORS.muted }}>Цель на 12 недель</div>
              </div>
              <div className="text-[12px]" style={{ color: COLORS.muted }}>{step}/{steps.length - 1}</div>
            </div>

            <div className="flex items-center gap-1.5">
              {steps.slice(1).map((s, i) => {
                const idx = i + 1;
                const active = idx === step;
                const done = idx < step;
                return (
                  <button key={idx} onClick={() => setStep(idx)}
                    className="flex-1 h-1 rounded-full transition-all"
                    style={{ background: done ? COLORS.text : active ? COLORS.accent : COLORS.border }}
                    title={s.title} />
                );
              })}
            </div>
          </div>
        </header>
      )}

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-14 pb-32">
        {step === 0 && <Step0 onStart={() => setStep(1)} />}
        {step === 1 && <StepAnnual data={data} update={update} />}
        {step === 2 && <Step1 data={data} update={update} />}
        {step === 3 && <Step2 data={data} update={update} />}
        {step === 4 && <Step3 data={data} update={update} />}
        {step === 5 && <Step4 data={data} update={update} />}
        {step === 6 && <Step5 data={data} update={update} />}
        {step === 7 && <Step6 data={data} update={update} />}
        {step === 8 && <Step7 data={data} update={update} memberId={memberId} />}
      </main>

      {step > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 backdrop-blur" style={{ background: `${COLORS.bg}ee`, borderTop: `1px solid ${COLORS.borderSoft}` }}>
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14px] font-medium transition-all"
              style={{ background: "transparent", color: COLORS.text }}
              onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.card)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>
            <div className="text-[13px] font-medium hidden md:block" style={{ color: COLORS.muted }}>{steps[step]?.title}</div>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-[14px] font-medium transition-all"
                style={{ background: COLORS.text, color: COLORS.bg }}
                onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.background = COLORS.text)}>
                Дальше
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div style={{ width: 100 }} />
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
