export interface ParsedReport {
  businessText: string | null;
  familyText: string | null;
  personalText: string | null;
  scoreBusiness: number | null;
  scoreFamily: number | null;
  scorePersonal: number | null;
  planText: string | null;
}

const REPORT_TRIGGER = /^#(отчет|отчёт|report)\b/im;

const CATEGORY_LABELS: Record<string, keyof Pick<ParsedReport, "businessText" | "familyText" | "personalText" | "planText">> = {
  "бизнес": "businessText",
  "семья": "familyText",
  "личное": "personalText",
  "план": "planText",
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseScores(line: string): { b: number | null; s: number | null; l: number | null } {
  const bslMatch = line.match(/[бБ]:?\s*(\d+)/);
  const sMatch = line.match(/[сС]:?\s*(\d+)/);
  const lMatch = line.match(/[лЛ]:?\s*(\d+)/);

  if (bslMatch || sMatch || lMatch) {
    return {
      b: bslMatch ? clamp(parseInt(bslMatch[1]), 1, 10) : null,
      s: sMatch ? clamp(parseInt(sMatch[1]), 1, 10) : null,
      l: lMatch ? clamp(parseInt(lMatch[1]), 1, 10) : null,
    };
  }

  const slashMatch = line.match(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/);
  if (slashMatch) {
    return {
      b: clamp(parseInt(slashMatch[1]), 1, 10),
      s: clamp(parseInt(slashMatch[2]), 1, 10),
      l: clamp(parseInt(slashMatch[3]), 1, 10),
    };
  }

  return { b: null, s: null, l: null };
}

export function parseReport(text: string): ParsedReport | null {
  if (!text || !REPORT_TRIGGER.test(text)) return null;

  const result: ParsedReport = {
    businessText: null, familyText: null, personalText: null,
    scoreBusiness: null, scoreFamily: null, scorePersonal: null, planText: null,
  };

  const lines = text.split("\n");
  let currentField: keyof Pick<ParsedReport, "businessText" | "familyText" | "personalText" | "planText"> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || REPORT_TRIGGER.test(trimmed)) continue;

    if (/^оценк/i.test(trimmed)) {
      const scores = parseScores(trimmed);
      result.scoreBusiness = scores.b;
      result.scoreFamily = scores.s;
      result.scorePersonal = scores.l;
      currentField = null;
      continue;
    }

    let matched = false;
    for (const [label, field] of Object.entries(CATEGORY_LABELS)) {
      const regex = new RegExp(`^${label}\\s*:`, "i");
      if (regex.test(trimmed)) {
        const value = trimmed.replace(regex, "").trim();
        result[field] = value || null;
        currentField = field;
        matched = true;
        break;
      }
    }

    if (!matched && currentField) {
      const prev = result[currentField];
      result[currentField] = prev ? `${prev}\n${trimmed}` : trimmed;
    }
  }

  return result;
}
