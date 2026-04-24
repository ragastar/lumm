# Публичный лендинг luum.space — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На `luum.space/` отдать публичный маркетинговый лендинг (закрытый мужской клуб + движок LUMM), текущий Dashboard переехал на `/dashboard`.

**Architecture:** Новая route-group `(marketing)` с минимальным layout (header + footer), корневой маршрут `/` становится публичным. `src/app/(main)/page.tsx` и `DashboardClient.tsx` переезжают в `(main)/dashboard/`. В `src/proxy.ts` добавляем `/` в публичный allowlist. Блоки лендинга — отдельные компоненты в `src/components/landing/`, собранные в `(marketing)/page.tsx`. Env-конфиг для контакта «Оставить заявку» и окна приёма.

**Tech Stack:** Next.js 16 (App Router, proxy.ts), TypeScript, TailwindCSS, vitest.

**Spec:** [docs/superpowers/specs/2026-04-24-luum-landing-design.md](../specs/2026-04-24-luum-landing-design.md)
**Issue:** https://github.com/ragastar/lumm/issues/27

---

## Пререквизит: прочитать про Next.js 16

В проекте стоит Next.js 16 со сломанными API (proxy вместо middleware и пр.). **До начала** имплементации прочитать `node_modules/next/dist/docs/upgrading/version-16.md` если файл существует, и `node_modules/next/dist/docs/app/building-your-application/routing/route-groups.md` если существует — особенно про layout nesting и `generateMetadata`. Это прямое правило из корневого `AGENTS.md`.

---

## Task 1: Helper-функции для окна приёма + тесты

**Files:**
- Create: `src/lib/landing.ts`
- Create: `src/lib/__tests__/landing.test.ts`

- [ ] **Step 1: Написать failing-тест для `formatOpenSlots`**

Создать `src/lib/__tests__/landing.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatOpenSlots, formatNextWindow } from "../landing";

describe("formatOpenSlots", () => {
  it("возвращает «Мы полны» при 0", () => {
    expect(formatOpenSlots(0)).toBe("Мы полны");
  });

  it("возвращает «Мы полны» при undefined/NaN/отрицательном", () => {
    expect(formatOpenSlots(undefined)).toBe("Мы полны");
    expect(formatOpenSlots(NaN)).toBe("Мы полны");
    expect(formatOpenSlots(-1)).toBe("Мы полны");
  });

  it("плюрализация «место/места/мест»", () => {
    expect(formatOpenSlots(1)).toBe("Свободно 1 место");
    expect(formatOpenSlots(2)).toBe("Свободно 2 места");
    expect(formatOpenSlots(3)).toBe("Свободно 3 места");
    expect(formatOpenSlots(4)).toBe("Свободно 4 места");
    expect(formatOpenSlots(5)).toBe("Свободно 5 мест");
    expect(formatOpenSlots(11)).toBe("Свободно 11 мест");
    expect(formatOpenSlots(21)).toBe("Свободно 21 место");
    expect(formatOpenSlots(22)).toBe("Свободно 22 места");
  });
});

describe("formatNextWindow", () => {
  it("возвращает null при пустой/невалидной дате", () => {
    expect(formatNextWindow(undefined)).toBeNull();
    expect(formatNextWindow("")).toBeNull();
    expect(formatNextWindow("не-дата")).toBeNull();
  });

  it("форматирует ISO-дату по-русски", () => {
    expect(formatNextWindow("2026-09-01")).toBe("1 сентября 2026");
    expect(formatNextWindow("2026-12-31")).toBe("31 декабря 2026");
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться что FAIL**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/landing.test.ts`
Expected: FAIL (модуль не существует).

- [ ] **Step 3: Реализовать `src/lib/landing.ts`**

```typescript
export function formatOpenSlots(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n) || n <= 0) return "Мы полны";
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word: string;
  if (mod10 === 1 && mod100 !== 11) word = "место";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "места";
  else word = "мест";
  return `Свободно ${n} ${word}`;
}

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export function formatNextWindow(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
```

- [ ] **Step 4: Запустить тест — PASS**

Run: `cd /root/lumm && npx vitest run src/lib/__tests__/landing.test.ts`
Expected: PASS (все 5 кейсов зелёные).

- [ ] **Step 5: Коммит**

```bash
cd /root/lumm && git add src/lib/landing.ts src/lib/__tests__/landing.test.ts && \
git commit -m "feat(landing): helpers для окна приёма + тесты (#27)"
```

---

## Task 2: Env-переменные для лендинга

**Files:**
- Modify: `/root/lumm/.env`
- Create: `/root/lumm/.env.example`

- [ ] **Step 1: Добавить env-переменные в `.env`**

Дописать в конец `/root/lumm/.env` (не затирать существующие):

```
# --- Landing ---
NEXT_PUBLIC_APPLICATION_CONTACT=
NEXT_PUBLIC_OPEN_SLOTS=0
NEXT_PUBLIC_NEXT_WINDOW_DATE=
```

(`NEXT_PUBLIC_APPLICATION_CONTACT` оставляем пустым — подставить `@username` админа перед продакшеном.)

- [ ] **Step 2: Создать `.env.example`**

Новый файл `/root/lumm/.env.example` (для документации, без секретов):

```
DATABASE_URL=file:./data/lumm.db
JWT_SECRET=change-me-in-production
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
OPENROUTER_API_KEY=
GROUP_CHAT_ID=

# Landing
NEXT_PUBLIC_APPLICATION_CONTACT=
NEXT_PUBLIC_OPEN_SLOTS=0
NEXT_PUBLIC_NEXT_WINDOW_DATE=
```

- [ ] **Step 3: Проверить что `.env.example` отслеживается git, а `.env` — нет**

Run: `cd /root/lumm && git check-ignore .env .env.example 2>&1`
Expected: первая строка `.env` (игнорируется), вторая — пусто (не игнорируется).

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm && git add .env.example && \
git commit -m "chore(env): .env.example + переменные лендинга (#27)"
```

---

## Task 3: Перенос Dashboard с `/` на `/dashboard`

**Files:**
- Move: `src/app/(main)/page.tsx` → `src/app/(main)/dashboard/page.tsx`
- Move: `src/app/(main)/DashboardClient.tsx` → `src/app/(main)/dashboard/DashboardClient.tsx`
- Modify (new path): `src/app/(main)/dashboard/page.tsx` — импорт DashboardClient

- [ ] **Step 1: Создать папку и переместить файлы**

```bash
cd /root/lumm && \
  mkdir -p src/app/\(main\)/dashboard && \
  git mv src/app/\(main\)/page.tsx src/app/\(main\)/dashboard/page.tsx && \
  git mv src/app/\(main\)/DashboardClient.tsx src/app/\(main\)/dashboard/DashboardClient.tsx
```

- [ ] **Step 2: Поправить импорт в `page.tsx`**

В `src/app/(main)/dashboard/page.tsx` текущий импорт:

```typescript
import { DashboardClient } from "./DashboardClient";
```

Остаётся таким же (относительный путь, файл в той же папке). Проверить что строка уже такая, ничего менять не нужно.

- [ ] **Step 3: Запустить билд для проверки**

Run: `cd /root/lumm && npm run build 2>&1 | tail -20`
Expected: билд проходит без ошибок (нет больше `(main)/page.tsx` → корневой `/` временно 404, это ожидаемо до Task 7).

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm && git add -A src/app/\(main\)/ && \
git commit -m "refactor(dashboard): перенос / на /dashboard (#27)"
```

---

## Task 4: Обновить редиректы login-flow на `/dashboard`

**Files:**
- Modify: `src/app/(auth)/login/page.tsx:14`, `:37`
- Modify: `src/proxy.ts:47`

- [ ] **Step 1: В `src/app/(auth)/login/page.tsx` заменить два `"/"` на `"/dashboard"`**

Текущий код содержит:

```typescript
useEffect(() => {
  fetch("/api/auth/me").then((r) => {
    if (r.ok) router.replace("/");
  });
}, [router]);
```

и

```typescript
if (res.ok) {
  router.push("/");
}
```

Заменить оба `"/"` на `"/dashboard"`:

```typescript
if (r.ok) router.replace("/dashboard");
```

```typescript
if (res.ok) {
  router.push("/dashboard");
}
```

- [ ] **Step 2: В `src/proxy.ts` заменить редирект не-админа с `/api/invites`**

Текущая строка (около 47):

```typescript
return NextResponse.redirect(new URL("/", request.url));
```

Заменить на:

```typescript
return NextResponse.redirect(new URL("/dashboard", request.url));
```

- [ ] **Step 3: Билд**

Run: `cd /root/lumm && npm run build 2>&1 | tail -10`
Expected: успех.

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm && git add src/app/\(auth\)/login/page.tsx src/proxy.ts && \
git commit -m "fix(auth): редирект после логина на /dashboard (#27)"
```

---

## Task 5: Обновить ссылки на `/` в навигации

**Files:**
- Modify: `src/components/Sidebar.tsx:17`

- [ ] **Step 1: В `src/components/Sidebar.tsx` поменять `href: "/"` для Dashboard**

Текущая строка 17:

```typescript
  { href: "/", label: "Dashboard", icon: "◆" },
```

Заменить на:

```typescript
  { href: "/dashboard", label: "Dashboard", icon: "◆" },
```

- [ ] **Step 2: Найти остальные `href="/"` в кодовой базе**

Run: `cd /root/lumm && grep -rn 'href="/"' src --include="*.tsx" --include="*.ts"`
Expected: пусто (других быть не должно). Если найдутся — заменить на `/dashboard` (или на конкретный URL, если логически это не дашборд).

- [ ] **Step 3: Коммит**

```bash
cd /root/lumm && git add src/components/Sidebar.tsx && \
git commit -m "fix(nav): сайдбар — Dashboard на /dashboard (#27)"
```

---

## Task 6: Открыть `/` в proxy как публичный путь

**Files:**
- Modify: `src/proxy.ts` — расширить список публичных путей

**Нюанс:** текущая проверка `publicPaths.some((p) => pathname.startsWith(p))`, где `p` — префикс. Если добавить просто `"/"`, `startsWith("/")` вернёт `true` для **любого** пути — весь auth-защитный код умрёт. Нужна точечная проверка.

- [ ] **Step 1: Обновить логику публичных путей в `src/proxy.ts`**

Текущий фрагмент:

```typescript
const publicPaths = ["/login", "/invite", "/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
```

Заменить на:

```typescript
const publicPrefixes = ["/login", "/invite", "/api/auth"];
const publicExact = ["/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicExact.includes(pathname)) {
    return NextResponse.next();
  }

  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
```

- [ ] **Step 2: Ручная проверка логики**

Убедиться что для `/`, `/login`, `/login/foo`, `/api/auth/me` возвращается `next`, а для `/admin`, `/dashboard`, `/api/members` — продолжается к проверке токена. Это можно сделать мысленно, просмотрев условия. Тестом не покрываем (инфраструктурный код на edge).

- [ ] **Step 3: Билд**

Run: `cd /root/lumm && npm run build 2>&1 | tail -10`
Expected: успех.

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm && git add src/proxy.ts && \
git commit -m "feat(proxy): / в публичные пути (#27)"
```

---

## Task 7: Route-group `(marketing)` — layout и пустой `page.tsx`

**Files:**
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Создать `src/app/(marketing)/layout.tsx`**

```tsx
import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lumm-dark text-lumm-text-primary">
      <header className="sticky top-0 z-10 bg-lumm-dark/80 backdrop-blur-sm border-b border-lumm-gray-light/30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-lumm-gold tracking-wider">
            LUMM
          </Link>
          <Link
            href="/login"
            className="text-sm text-lumm-text-secondary hover:text-lumm-gold transition-colors"
          >
            Войти
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-lumm-gray-light/30 mt-24">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-lumm-text-secondary">
          <span>LUMM · Level Up Mastermind · {new Date().getFullYear()}</span>
          <Link href="/login" className="hover:text-lumm-gold transition-colors">
            Войти
          </Link>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Создать заглушку `src/app/(marketing)/page.tsx`**

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LUMM — закрытый мастермайнд для предпринимателей",
  description:
    "Закрытый клуб 8–10 мужчин-предпринимателей. 12 встреч в год, личный софт для постановки целей, отчётов и финансов.",
};

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 space-y-24">
      <p className="text-lumm-text-secondary">Лендинг в разработке.</p>
    </div>
  );
}
```

- [ ] **Step 3: Билд + прогон**

Run: `cd /root/lumm && npm run build 2>&1 | tail -15`
Expected: успех, в выводе видно `/` как новый роут.

Run (фоном для ручной проверки): `cd /root/lumm && npm run start &` — открыть `http://localhost:3000/` в браузере, убедиться: header с LUMM + `Войти`, текст «Лендинг в разработке», footer. При клике на `Войти` — переход на `/login`. Без авторизации `/dashboard` редиректит на `/login`.

Остановить сервер после проверки: `pkill -f "next start"` или вручную.

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm && git add src/app/\(marketing\)/ && \
git commit -m "feat(landing): route-group (marketing) + layout + заглушка (#27)"
```

---

## Task 8: Блок Hero

**Files:**
- Create: `src/components/landing/HeroBlock.tsx`
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Создать `src/components/landing/HeroBlock.tsx`**

```tsx
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
```

- [ ] **Step 2: Вставить `<HeroBlock />` в `src/app/(marketing)/page.tsx`**

Заменить содержимое `<div>` в `LandingPage` — убрать «Лендинг в разработке», добавить `<HeroBlock />`:

```tsx
import type { Metadata } from "next";
import { HeroBlock } from "@/components/landing/HeroBlock";

export const metadata: Metadata = {
  title: "LUMM — закрытый мастермайнд для предпринимателей",
  description:
    "Закрытый клуб 8–10 мужчин-предпринимателей. 12 встреч в год, личный софт для постановки целей, отчётов и финансов.",
};

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pb-24 space-y-24">
      <HeroBlock />
    </div>
  );
}
```

- [ ] **Step 3: Билд + визуальная проверка**

Run: `cd /root/lumm && npm run build && npm run start &`
Открыть `http://localhost:3000/`. Убедиться: жирный заголовок, тёмный фон, золотая CTA «Условия входа ↓». Клик по CTA — якорь `#join` (пока ничего не скроллит, это ок, секция появится позже).

Остановить сервер.

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm && git add src/components/landing/HeroBlock.tsx src/app/\(marketing\)/page.tsx && \
git commit -m "feat(landing): hero-блок (#27)"
```

---

## Task 9: Блоки Акта I — «Как мы живём»

**Files:**
- Create: `src/components/landing/MirrorBlock.tsx`
- Create: `src/components/landing/CouncilQuoteBlock.tsx`
- Create: `src/components/landing/YearRhythmBlock.tsx`
- Create: `src/components/landing/DayInClubBlock.tsx`
- Create: `src/components/landing/BuddyBlock.tsx`
- Create: `src/components/landing/ConfidentialityBlock.tsx`
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: `MirrorBlock` — два столбца «Ты здесь, если / не сюда, если»**

`src/components/landing/MirrorBlock.tsx`:

```tsx
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
```

- [ ] **Step 2: `CouncilQuoteBlock` — крупная цитата**

`src/components/landing/CouncilQuoteBlock.tsx`:

```tsx
export function CouncilQuoteBlock() {
  return (
    <section className="py-8 md:py-12">
      <blockquote className="text-3xl md:text-5xl font-bold text-lumm-text-primary leading-tight">
        Ты — CEO своей жизни.<br />
        У каждого CEO должен быть совет директоров.<br />
        <span className="text-lumm-gold">Мы и есть этот совет — друг для друга.</span>
      </blockquote>
    </section>
  );
}
```

- [ ] **Step 3: `YearRhythmBlock` — 4 карточки ритма**

`src/components/landing/YearRhythmBlock.tsx`:

```tsx
export function YearRhythmBlock() {
  const items = [
    { title: "12 встреч в год", text: "Каждый третий четверг месяца, 5–6 часов, оффлайн в Москве. Пропуск дороже прихода." },
    { title: "Полугодовой выезд", text: "Только для участников. 3–4 дня: лес, палатки, сплав, новый опыт." },
    { title: "Годовой выезд с семьями", text: "5–7 дней. Планы на год, декомпозиция, утверждение целей. Дружим семьями." },
    { title: "Неделя — единица отчёта", text: "Свободный формат, дедлайн — воскресенье 23:59:59. Что сделано, план, инсайты." },
  ];
  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Ритм года</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it.title} className="bg-lumm-black border border-lumm-gray-light rounded-xl p-6">
            <h3 className="font-semibold text-lumm-gold mb-2">{it.title}</h3>
            <p className="text-sm text-lumm-text-secondary leading-relaxed">{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: `DayInClubBlock` — таймлайн четверга**

`src/components/landing/DayInClubBlock.tsx`:

```tsx
export function DayInClubBlock() {
  const steps = [
    { time: "12:30", icon: "🚪", title: "Приехал", text: "Место выбирает организатор встречи, которого назначили на предыдущей." },
    { time: "13:00", icon: "💬", title: "Синхронизация", text: "По минуте от каждого. Где ты сейчас по чувствам. Карточки-вопросы." },
    { time: "13:10", icon: "📊", title: "Отчёт за месяц", text: "Вал и прибыль, сферы и цели из годового плана, главный запрос. 7–10 мин на участника." },
    { time: "14:30", icon: "☕", title: "Перерыв", text: "" },
    { time: "14:45", icon: "🧠", title: "Разборы", text: "1–3 глубоких разбора темы или запроса. Вопросы, а не советы." },
    { time: "17:00", icon: "🍽", title: "Обед", text: "60 минут." },
    { time: "18:00", icon: "🏢", title: "Экскурсия в бизнес", text: "На чью-то компанию. С пальцами в бухгалтерии." },
    { time: "19:10", icon: "✅", title: "Закрытие", text: "Инсайты по 2–3 мин. Что забираем. Цели на месяц." },
    { time: "20:00", icon: "🍺", title: "По желанию", text: "Спорт, CS, бар. Кто хочет — остаётся." },
  ];
  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Один день в клубе</h2>
      <p className="text-lumm-text-secondary">Так выглядит один четверг. Без воды, по хронометражу.</p>
      <ol className="relative border-l border-lumm-gold/30 pl-6 space-y-5">
        {steps.map((s) => (
          <li key={s.time} className="relative">
            <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-lumm-gold/20 border-2 border-lumm-gold" aria-hidden />
            <div className="flex items-baseline gap-3">
              <span className="text-lumm-gold font-semibold tabular-nums">{s.time}</span>
              <span aria-hidden>{s.icon}</span>
              <h3 className="font-semibold text-lumm-text-primary">{s.title}</h3>
            </div>
            {s.text && <p className="text-sm text-lumm-text-secondary mt-1 leading-relaxed">{s.text}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 5: `BuddyBlock` — короткий блок про бади**

`src/components/landing/BuddyBlock.tsx`:

```tsx
export function BuddyBlock() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Бади — один-на-один</h2>
      <p className="text-lumm-text-secondary leading-relaxed max-w-2xl">
        Каждый месяц у тебя новый бади. Один созвон минимум — обмен мыслями по плану, помощь в сложных местах, честный вопрос вместо советов. В клубе нельзя быть одному даже между встречами.
      </p>
    </section>
  );
}
```

- [ ] **Step 6: `ConfidentialityBlock` — ключевой блок про «снять маску»**

`src/components/landing/ConfidentialityBlock.tsx`:

```tsx
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
```

- [ ] **Step 7: Вставить все 6 блоков в `page.tsx`**

Обновить `src/app/(marketing)/page.tsx`:

```tsx
import type { Metadata } from "next";
import { HeroBlock } from "@/components/landing/HeroBlock";
import { MirrorBlock } from "@/components/landing/MirrorBlock";
import { CouncilQuoteBlock } from "@/components/landing/CouncilQuoteBlock";
import { YearRhythmBlock } from "@/components/landing/YearRhythmBlock";
import { DayInClubBlock } from "@/components/landing/DayInClubBlock";
import { BuddyBlock } from "@/components/landing/BuddyBlock";
import { ConfidentialityBlock } from "@/components/landing/ConfidentialityBlock";

export const metadata: Metadata = {
  title: "LUMM — закрытый мастермайнд для предпринимателей",
  description:
    "Закрытый клуб 8–10 мужчин-предпринимателей. 12 встреч в год, личный софт для постановки целей, отчётов и финансов.",
};

export default function LandingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pb-24 space-y-24">
      <HeroBlock />
      <MirrorBlock />
      <CouncilQuoteBlock />
      <YearRhythmBlock />
      <DayInClubBlock />
      <BuddyBlock />
      <ConfidentialityBlock />
    </div>
  );
}
```

- [ ] **Step 8: Билд + визуальная проверка на мобиле**

Run: `cd /root/lumm && npm run build && npm run start &`
Открыть `http://localhost:3000/` на десктопе и с узким окном (~375px). Проверить: таймлайн не разваливается, карточки ритма в один столбец на мобиле, конфиденциальность-блок читаемый.

- [ ] **Step 9: Коммит**

```bash
cd /root/lumm && git add src/components/landing/ src/app/\(marketing\)/page.tsx && \
git commit -m "feat(landing): акт I — как мы живём (#27)"
```

---

## Task 10: Переход + блоки Акта II (верхние): движок, Wombo Combo, отчёты

**Files:**
- Create: `src/components/landing/EngineBridgeBlock.tsx`
- Create: `src/components/landing/GoalSystemBlock.tsx`
- Create: `src/components/landing/WeeklyReportBlock.tsx`
- Modify: `src/app/(marketing)/page.tsx`

Скриншоты в этих блоках пока добавим плейсхолдером `<div className="aspect-video bg-lumm-gray rounded-lg">`. Реальные файлы — в Task 14.

- [ ] **Step 1: `EngineBridgeBlock` — переход-контраст**

`src/components/landing/EngineBridgeBlock.tsx`:

```tsx
export function EngineBridgeBlock() {
  return (
    <section className="py-8 text-center space-y-4">
      <h2 className="text-3xl md:text-5xl font-bold text-lumm-text-primary leading-tight">
        И чтобы это не осталось разговорами — <span className="text-lumm-gold">мы построили LUMM</span>
      </h2>
      <p className="text-lumm-text-secondary max-w-2xl mx-auto">
        Встроенная система. Мы сделали её для себя, не на продажу.
      </p>
    </section>
  );
}
```

- [ ] **Step 2: `GoalSystemBlock` — 12-недельная цель**

`src/components/landing/GoalSystemBlock.tsx`:

```tsx
export function GoalSystemBlock() {
  return (
    <section className="space-y-6">
      <div className="text-xs uppercase tracking-widest text-lumm-gold font-semibold">Wombo Combo</div>
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Одна цель на 12 недель</h2>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-3 text-lumm-text-secondary leading-relaxed">
          <p>Раз в квартал — одна большая цель. Проработанная в мастере по четырём методикам: WOOP + HARD + 12 Week Year + психометрические шкалы SCI и Klein.</p>
          <p>Видна всей группе. Нельзя забыть и тихо отменить.</p>
        </div>
        <div className="aspect-video bg-lumm-gray border border-lumm-gray-light rounded-lg flex items-center justify-center text-xs text-lumm-text-secondary" aria-label="Скриншот мастера цели">
          [скриншот мастера цели]
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: `WeeklyReportBlock` — отчёт + AI**

`src/components/landing/WeeklyReportBlock.tsx`:

```tsx
export function WeeklyReportBlock() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Еженедельный отчёт + AI-разбор</h2>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="aspect-video bg-lumm-gray border border-lumm-gray-light rounded-lg flex items-center justify-center text-xs text-lumm-text-secondary" aria-label="Скриншот телеграм-бота с разбором отчёта">
          [скриншот бота + светофор]
        </div>
        <div className="space-y-3 text-lumm-text-secondary leading-relaxed">
          <p>Воскресенье, 23:59 — отчёт в чат. Бот подхватывает, Claude разбирает по сферам Бизнес/Семья/Личное, выдаёт светофор.</p>
          <p>Группа видит светофор — и ты видишь себя чужими глазами. Врать самому себе становится неудобно.</p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Добавить импорты и вставить блоки в `page.tsx`**

В `src/app/(marketing)/page.tsx` импортировать три новых компонента и вставить после `ConfidentialityBlock`:

```tsx
<ConfidentialityBlock />
<EngineBridgeBlock />
<GoalSystemBlock />
<WeeklyReportBlock />
```

- [ ] **Step 5: Билд + визуальная проверка**

Run: `cd /root/lumm && npm run build && npm run start &`
Проверить плейсхолдеры отображаются, контраст секций виден.

- [ ] **Step 6: Коммит**

```bash
cd /root/lumm && git add src/components/landing/ src/app/\(marketing\)/page.tsx && \
git commit -m "feat(landing): акт II — движок, Wombo Combo, отчёты (#27)"
```

---

## Task 11: Блоки Акта II (нижние): финансы, штурвал, календарь

**Files:**
- Create: `src/components/landing/FinancialsBlock.tsx`
- Create: `src/components/landing/SteeringBlock.tsx`
- Create: `src/components/landing/SmartCalendarBlock.tsx`
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: `FinancialsBlock`**

`src/components/landing/FinancialsBlock.tsx`:

```tsx
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
```

- [ ] **Step 2: `SteeringBlock`**

`src/components/landing/SteeringBlock.tsx`:

```tsx
export function SteeringBlock() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Штурвал</h2>
      <p className="text-lumm-text-secondary leading-relaxed max-w-2xl">
        Что-то не так с клубом или с участником? Пишешь боту — попадает в приватную ленту админам. Штурвал — чтобы клуб плыл, куда надо, а не куда привык.
      </p>
    </section>
  );
}
```

- [ ] **Step 3: `SmartCalendarBlock`**

`src/components/landing/SmartCalendarBlock.tsx`:

```tsx
export function SmartCalendarBlock() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Умный календарь</h2>
      <p className="text-lumm-text-secondary leading-relaxed max-w-2xl">
        Бот пишет только тому, кто не сдал отчёт или давно не приходил. Не спам всем — точечный укол тебе, если отстаёшь.
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Импорт и вставка в `page.tsx`**

В `src/app/(marketing)/page.tsx` добавить импорты и после `WeeklyReportBlock`:

```tsx
<FinancialsBlock />
<SteeringBlock />
<SmartCalendarBlock />
```

- [ ] **Step 5: Билд + коммит**

```bash
cd /root/lumm && npm run build 2>&1 | tail -5 && \
git add src/components/landing/ src/app/\(marketing\)/page.tsx && \
git commit -m "feat(landing): акт II — финансы, штурвал, календарь (#27)"
```

---

## Task 12: Блок штрафов (таблица)

**Files:**
- Create: `src/components/landing/FinesBlock.tsx`
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: `FinesBlock` — таблица штрафов**

`src/components/landing/FinesBlock.tsx`:

```tsx
const FINES = [
  { text: "Прогул встречи", amount: "25 000 ₽" },
  { text: "Опоздание 10 минут", amount: "5 000 ₽" },
  { text: "Опоздание 20 минут", amount: "10 000 ₽" },
  { text: "Опоздание 30+ минут", amount: "10 000 ₽ · = прогул" },
  { text: "Пропуск позже чем за неделю", amount: "10 000 ₽" },
  { text: "Пропуск встречи с новыми кандидатами", amount: "2 000 ₽" },
  { text: "Отсутствие подготовленного отчёта", amount: "2 500 ₽" },
  { text: "Звук телефона во время встречи", amount: "1 000 ₽" },
  { text: "Использование гаджетов во время встречи", amount: "1 000 ₽" },
];

export function FinesBlock() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Банк и штрафы</h2>
        <p className="text-lumm-text-secondary mt-2 leading-relaxed max-w-2xl">
          Штрафы — не репрессии. Это цена, которая делает выбор дорогим. Банк идёт в общак: выезды, рестораны, подарки.
        </p>
      </div>
      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        {FINES.map((f, i) => (
          <div
            key={f.text}
            className={`flex items-center justify-between gap-3 px-5 py-3 ${i !== FINES.length - 1 ? "border-b border-lumm-gray-light/50" : ""}`}
          >
            <span className="text-sm text-lumm-text-primary">{f.text}</span>
            <span className="text-sm font-semibold text-lumm-gold whitespace-nowrap">{f.amount}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-red-400">Больше двух прогулов за год — вылет из группы.</p>
    </section>
  );
}
```

- [ ] **Step 2: Импорт и вставка**

В `page.tsx` после `SmartCalendarBlock`:

```tsx
<FinesBlock />
```

- [ ] **Step 3: Билд + коммит**

```bash
cd /root/lumm && npm run build 2>&1 | tail -5 && \
git add src/components/landing/FinesBlock.tsx src/app/\(marketing\)/page.tsx && \
git commit -m "feat(landing): банк и штрафы (#27)"
```

---

## Task 13: Блоки Акта III — вход, условия, окно, FAQ, финал

**Files:**
- Create: `src/components/landing/HowToJoinBlock.tsx`
- Create: `src/components/landing/ConditionsBlock.tsx`
- Create: `src/components/landing/IntakeWindowBlock.tsx`
- Create: `src/components/landing/FaqBlock.tsx`
- Create: `src/components/landing/FinalCtaBlock.tsx`
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: `HowToJoinBlock` — 5 шагов, якорь `id="join"`**

`src/components/landing/HowToJoinBlock.tsx`:

```tsx
const STEPS = [
  "Заявка — через форму или знакомого участника.",
  "Встреча-знакомство — час до очередной встречи группы.",
  "Голосование группы. Если двое и больше в сомнениях — нет.",
  "Тестовая встреча — одна, как полноправный участник.",
  "Финальное утверждение и вход в клуб.",
];

export function HowToJoinBlock() {
  return (
    <section id="join" className="space-y-6 pt-8">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Как попасть</h2>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-4 items-start bg-lumm-black border border-lumm-gray-light rounded-xl p-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-lumm-gold/10 border border-lumm-gold/30 flex items-center justify-center text-sm font-bold text-lumm-gold tabular-nums">
              {i + 1}
            </span>
            <p className="text-lumm-text-primary leading-relaxed pt-1">{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 2: `ConditionsBlock`**

`src/components/landing/ConditionsBlock.tsx`:

```tsx
const CONDITIONS = [
  "8–10 мест в группе, только мужчины-предприниматели.",
  "Москва, оффлайн. Удалённо — нет.",
  "Взнос в месяц + банк на штрафы и общие расходы.",
  "Обязательства: еженедельный отчёт, присутствие на встрече, подготовка.",
];

export function ConditionsBlock() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Условия</h2>
      <ul className="space-y-2">
        {CONDITIONS.map((c) => (
          <li key={c} className="flex gap-3 text-lumm-text-secondary leading-relaxed">
            <span className="text-lumm-gold mt-1">◆</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: `IntakeWindowBlock` — использует helpers из Task 1**

`src/components/landing/IntakeWindowBlock.tsx`:

```tsx
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
```

- [ ] **Step 4: `FaqBlock` — аккордеон на `<details>`**

`src/components/landing/FaqBlock.tsx`:

```tsx
const FAQ = [
  {
    q: "Почему только мужчины?",
    a: "Исторически так сложилась группа. На текущем этапе мы решили держать формат, чтобы в комнате было максимум открытости без фильтра «а как это прозвучит».",
  },
  {
    q: "Что если я пропущу встречу?",
    a: "Официально разрешён один пропуск в год с уведомлением минимум за неделю. Второй и последующие — платные. Больше двух прогулов за год — вылет из группы.",
  },
  {
    q: "Что с конфиденциальностью?",
    a: "Всё сказанное в комнате остаётся в комнате. Это правило входа, не декларация. Нарушение — основание для исключения.",
  },
  {
    q: "Сколько стоит и куда идут деньги?",
    a: "Ежемесячный взнос — сумма обсуждается на встрече-знакомстве. Плюс банк на штрафы. Все деньги идут на аренду мест, выезды, рестораны и общие расходы группы. Никто не забирает себе.",
  },
  {
    q: "Что делает софт?",
    a: "Ведём 12-недельные цели, отчёты с AI-анализом, финансы группы, календарь встреч, фидбек-канал «штурвал». Телеграм-бот напоминает и принимает отчёты.",
  },
  {
    q: "Можно участвовать удалённо?",
    a: "Нет. Встречи оффлайн в Москве, это принципиально для формата.",
  },
];

export function FaqBlock() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold text-lumm-text-primary">Частые вопросы</h2>
      <div className="space-y-2">
        {FAQ.map((item) => (
          <details key={item.q} className="bg-lumm-black border border-lumm-gray-light rounded-xl group">
            <summary className="cursor-pointer px-5 py-4 font-medium text-lumm-text-primary list-none flex items-center justify-between">
              <span>{item.q}</span>
              <span className="text-lumm-gold transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <div className="px-5 pb-4 text-sm text-lumm-text-secondary leading-relaxed">{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: `FinalCtaBlock`**

`src/components/landing/FinalCtaBlock.tsx`:

```tsx
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
```

- [ ] **Step 6: Импорт и вставка в `page.tsx`**

После `FinesBlock`:

```tsx
<HowToJoinBlock />
<ConditionsBlock />
<IntakeWindowBlock />
<FaqBlock />
<FinalCtaBlock />
```

- [ ] **Step 7: Билд + визуальная проверка**

Run: `cd /root/lumm && npm run build && npm run start &`
Проверить: клик на hero-CTA «Условия входа ↓» скроллит к `#join`. FAQ раскрывается-закрывается. Окно приёма с `NEXT_PUBLIC_OPEN_SLOTS=0` показывает «Мы полны». Установить в `.env` временно `NEXT_PUBLIC_OPEN_SLOTS=3 NEXT_PUBLIC_NEXT_WINDOW_DATE=2026-09-01`, пересобрать, убедиться что «Свободно 3 места · Следующее окно: 1 сентября 2026». Вернуть значения обратно.

- [ ] **Step 8: Коммит**

```bash
cd /root/lumm && git add src/components/landing/ src/app/\(marketing\)/page.tsx && \
git commit -m "feat(landing): акт III — вход, условия, окно, FAQ, финальная CTA (#27)"
```

---

## Task 14: Реальные скриншоты интерфейса

**Files:**
- Create: `public/landing/goal-wizard.png`
- Create: `public/landing/weekly-report.png`
- Create: `public/landing/financials-feed.png`
- Modify: `src/components/landing/GoalSystemBlock.tsx`
- Modify: `src/components/landing/WeeklyReportBlock.tsx`
- Modify: `src/components/landing/FinancialsBlock.tsx`

Эта задача — ручной снимок экрана, не автоматизируется. Подробные инструкции:

- [ ] **Step 1: Создать тестовую учётку с безобидными данными**

Войти как `admin`/`lumm2026`. Создать invite-ссылку через `/admin/invites`. Зарегистрироваться по ней с ником «Демо», залогиниться. Заполнить: одну цель через мастер (бизнес-сфера, «Вырасти в чистой прибыли до X»), один еженедельный отчёт (3–4 абзаца), 2–3 ежемесячных финансовых отчёта с придуманными числами.

- [ ] **Step 2: Сделать скриншоты**

1. `/goal/new` — мастер в середине заполнения (экран с wish/SCI). Сохранить как `public/landing/goal-wizard.png` (~1400×900, высокое качество).
2. Telegram-чат с ботом: триггер + ответ-анализ. Скриншот → `public/landing/weekly-report.png`.
3. `/financials` — лента с 2–3 строками. Скриншот → `public/landing/financials-feed.png`.

Следить: не должно быть реальных имён/сумм из живой группы. Если случайно попало — удалить строки из демо-учётки.

- [ ] **Step 3: Заменить плейсхолдеры в компонентах на `<Image>`**

В `GoalSystemBlock.tsx` заменить `aspect-video`-плейсхолдер на:

```tsx
import Image from "next/image";

// ...в JSX:
<Image
  src="/landing/goal-wizard.png"
  alt="Мастер постановки 12-недельной цели"
  width={1400}
  height={900}
  className="rounded-lg border border-lumm-gray-light w-full h-auto"
/>
```

То же самое для `WeeklyReportBlock` (`/landing/weekly-report.png`) и `FinancialsBlock` (`/landing/financials-feed.png`), c осмысленными `alt`.

- [ ] **Step 4: Билд + визуальная проверка**

Run: `cd /root/lumm && npm run build && npm run start &`
Проверить: все три скриншота показываются, не расползаются, на мобиле скейлятся корректно.

- [ ] **Step 5: Коммит**

```bash
cd /root/lumm && git add public/landing/ src/components/landing/ && \
git commit -m "feat(landing): реальные скриншоты интерфейса (#27)"
```

---

## Task 15: OG-картинка и финальные метатеги

**Files:**
- Create: `public/landing/og-image.png` (1200×630, баннер с крупным «LUMM» + коротким тезисом)
- Modify: `src/app/(marketing)/page.tsx` — расширить `metadata`

- [ ] **Step 1: Сделать OG-картинку**

Создать `public/landing/og-image.png` 1200×630. Тёмный фон `#1a1a1a` (LUMM dark), золотой `LUMM` крупно по центру, ниже — «Мастермайнд, в который не попадают за деньги». Для быстрого результата можно использовать Figma-шаблон или любой генератор OG-баннеров. Если нет сразу — можно отложить, лендинг жить может и без OG.

- [ ] **Step 2: Расширить метадату**

В `src/app/(marketing)/page.tsx` заменить `export const metadata` на:

```tsx
export const metadata: Metadata = {
  title: "LUMM — закрытый мастермайнд для предпринимателей",
  description:
    "Закрытый клуб 8–10 мужчин-предпринимателей. 12 встреч в год, личный софт для постановки целей, отчётов и финансов.",
  openGraph: {
    title: "LUMM — закрытый мастермайнд",
    description: "Мастермайнд, в который не попадают за деньги.",
    url: "https://lumm.space/",
    siteName: "LUMM",
    images: [{ url: "/landing/og-image.png", width: 1200, height: 630 }],
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LUMM — закрытый мастермайнд",
    description: "Мастермайнд, в который не попадают за деньги.",
    images: ["/landing/og-image.png"],
  },
};
```

- [ ] **Step 3: Проверка**

Run: `cd /root/lumm && npm run build && npm run start &`
Открыть в браузере view-source `http://localhost:3000/`, убедиться что `<meta property="og:image">` присутствует и ведёт на `/landing/og-image.png`.

- [ ] **Step 4: Коммит**

```bash
cd /root/lumm && git add public/landing/og-image.png src/app/\(marketing\)/page.tsx && \
git commit -m "feat(landing): OG-метатеги и баннер (#27)"
```

---

## Task 16: Финальная проверка и деплой

- [ ] **Step 1: Прогон всех тестов**

Run: `cd /root/lumm && npm test 2>&1 | tail -20`
Expected: все тесты зелёные (новые `landing.test.ts` + все существующие).

- [ ] **Step 2: Полный билд**

Run: `cd /root/lumm && npm run build 2>&1 | tail -30`
Expected: билд без ошибок, в маршрутах видно `/` как статический/динамический лендинг и `/dashboard` как защищённый.

- [ ] **Step 3: Ручной smoke-тест в `npm run start`**

Run: `cd /root/lumm && npm run start &`

Чеклист:
- `/` без авторизации — показывается лендинг, все 18 блоков на месте, скриншоты загружаются.
- Клик «Условия входа» в hero — скроллит к «Как попасть».
- Клик «Войти» в хедере — ведёт на `/login`.
- Логин `admin`/`lumm2026` — редиректит на `/dashboard`, Dashboard рендерится.
- Залогинен → `/` — показывает лендинг (лендинг публичен для всех), чтобы вернуться в приложение — сайдбар с `/dashboard`. (Это ожидаемо.)
- Залогаут → возвращаешься на `/login`.
- `/admin/invites` для не-админа (если зарегаешь второго юзера через invite) — редиректит на `/dashboard`.
- Ширина 375px: все блоки читаемы, таблица штрафов не расползается, таймлайн не ломается.

Если что-то сломано — фиксить в отдельных маленьких коммитах перед деплоем.

- [ ] **Step 4: Мерж в master (если работали в ветке)**

Если план исполнялся в отдельной ветке — PR → review → merge → update master.

- [ ] **Step 5: Деплой на прод**

Run на сервере (уже в рабочей директории):

```bash
cd /root/lumm && git pull origin master && npm run build && systemctl restart lumm
sleep 3
journalctl -u lumm --no-pager -n 30
```

Expected: сервис поднялся, ошибок нет.

- [ ] **Step 6: Smoke-тест на проде**

Открыть `https://lumm.space/` в браузере. Проверить базовый чеклист (лендинг виден, логин работает, dashboard доступен).

- [ ] **Step 7: Закрыть issue**

```bash
cd /root/lumm && gh issue close 27 --comment "Лендинг задеплоен на https://lumm.space/"
```

Обновить доску: карточку #27 в Done.

---

## Рабочие замечания

- **Контакт «Оставить заявку»** — установить `NEXT_PUBLIC_APPLICATION_CONTACT` в `.env` на проде перед деплоем (Task 15 или Task 16).
- **Окно приёма** — `NEXT_PUBLIC_OPEN_SLOTS` и `NEXT_PUBLIC_NEXT_WINDOW_DATE` обновлять руками в `.env` + пересбилдивать, когда меняется ситуация с местами. Автоматизация — отдельная задача в будущем.
- **Скриншоты** — хранить тестовую учётку («Демо»), чтобы можно было пересобрать скриншоты когда UI меняется. Не светить реальные имена.
