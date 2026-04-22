const MODEL = "anthropic/claude-sonnet-4-6";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `Ты коуч мастермайнд-группы. На входе — цели участника и его отчёт за неделю.
Верни JSON строго по схеме:
{
  "traffic_light": "green" | "yellow" | "red",
  "did": "1-3 предложения — что участник сделал к цели",
  "missed": "1-3 предложения — что упустил или где застрял",
  "next_question": "один острый вопрос участнику на следующую неделю",
  "coach": "5-10 предложений рефлексии в тоне поддержки+конфронтации"
}

Правила светофора:
- green — явное движение и к бизнес-, и к спорт-цели
- yellow — движение в одной из целей, или символическое в обеих
- red — нет движения или участник застрял

Говори на ты, по-русски, без воды, без канцелярита.
Не придумывай факты — работай только с тем, что написано в отчёте.`;

export type Analysis = {
  trafficLight: "green" | "yellow" | "red";
  did: string;
  missed: string;
  nextQuestion: string;
  coach: string;
  model: string;
};

export type AnalyzeArgs = {
  goals: { business: string; sport: string };
  reportText: string;
};

function buildUserContent(args: AnalyzeArgs): string {
  return `Бизнес-цель: ${args.goals.business}\nСпортивная цель: ${args.goals.sport}\n\nОтчёт:\n${args.reportText}`;
}

function isLight(v: unknown): v is Analysis["trafficLight"] {
  return v === "green" || v === "yellow" || v === "red";
}

function parseAnalysis(raw: unknown): Analysis {
  if (!raw || typeof raw !== "object") throw new Error("LLM ответ не объект");
  const o = raw as Record<string, unknown>;
  if (!isLight(o.traffic_light)) throw new Error("LLM: некорректный traffic_light");
  if (typeof o.did !== "string" || !o.did.trim()) throw new Error("LLM: пустой did");
  if (typeof o.missed !== "string" || !o.missed.trim()) throw new Error("LLM: пустой missed");
  if (typeof o.next_question !== "string" || !o.next_question.trim()) throw new Error("LLM: пустой next_question");
  if (typeof o.coach !== "string" || !o.coach.trim()) throw new Error("LLM: пустой coach");
  return {
    trafficLight: o.traffic_light,
    did: o.did,
    missed: o.missed,
    nextQuestion: o.next_question,
    coach: o.coach,
    model: MODEL,
  };
}

async function callOnce(args: AnalyzeArgs, apiKey: string): Promise<Analysis> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lumm.space",
      "X-Title": "LUMM",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserContent(args) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter HTTP ${res.status}`);
  }

  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM: пустой content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonFromContent(content));
  } catch {
    console.warn("[analyzer] не удалось распарсить:", content.slice(0, 300));
    throw new Error("LLM: не JSON");
  }
  return parseAnalysis(parsed);
}

function extractJsonFromContent(content: string): string {
  const trimmed = content.trim();
  const fence = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fence) return fence[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export async function analyze(args: AnalyzeArgs): Promise<Analysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  try {
    return await callOnce(args, apiKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[analyzer] первая попытка упала:", msg, "— ретрай");
    return await callOnce(args, apiKey);
  }
}
