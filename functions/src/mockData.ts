/**
 * Mock mode data and rules. Used when GMI_API_KEY is missing, and as a
 * fallback if the real LLM call fails, so the demo always works.
 */
import {Lang, LANGS, Translations} from "./shared";

export interface DemoLine {
  translations: Translations;
  isAlert: boolean;
  alertReason: string | null;
}

export const DEMO_LINES: DemoLine[] = [
  {
    translations: {
      "id-ID": "Ama, sudah waktunya makan siang. Mau makan bubur?",
      "zh-TW": "阿嬤，該吃午餐了。要不要吃粥？",
      "ja-JP": "おばあちゃん、お昼ごはんの時間ですよ。おかゆを食べますか？",
    },
    isAlert: false,
    alertReason: null,
  },
  {
    translations: {
      "zh-TW": "好，謝謝你。可是我今天有點頭暈。",
      "id-ID": "Baik, terima kasih. Tapi hari ini saya agak pusing.",
      "ja-JP": "ええ、ありがとう。でも今日は少しめまいがするの。",
    },
    isAlert: true,
    alertReason: "Elder reports dizziness",
  },
  {
    translations: {
      "id-ID": "Ama sudah minum obat tekanan darah tadi pagi.",
      "zh-TW": "阿嬤今天早上已經吃過血壓藥了。",
      "ja-JP": "おばあちゃんは今朝、血圧の薬を飲みました。",
    },
    isAlert: false,
    alertReason: null,
  },
  {
    translations: {
      "id-ID": "Ama pusing dan tidak mau makan. Apa yang harus saya lakukan?",
      "zh-TW": "阿嬤頭暈，而且不想吃東西。我該怎麼辦？",
      "ja-JP": "おばあちゃんがめまいがして、食事を食べたがりません。どうすればいいですか？",
    },
    isAlert: true,
    alertReason: "Dizziness and not eating",
  },
];

/** Lowercase and drop punctuation/whitespace so speech output still matches. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    m.set(g, (m.get(g) || 0) + 1);
  }
  return m;
}

/** Dice coefficient on character bigrams (0..1). */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  A.forEach((n, g) => {
    overlap += Math.min(n, B.get(g) || 0);
  });
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

/** Find a demo line that matches the text (in any language). */
export function findDemoLine(text: string): DemoLine | null {
  const n = normalize(text);
  let best: DemoLine | null = null;
  let bestScore = 0;
  for (const line of DEMO_LINES) {
    for (const lang of LANGS) {
      const score = similarity(n, normalize(line.translations[lang]));
      if (score > bestScore) {
        bestScore = score;
        best = line;
      }
    }
  }
  return bestScore >= 0.75 ? best : null;
}

const ALERT_WORDS: {re: RegExp; reason: string}[] = [
  {re: /頭暈|暈|pusing|dizzy|めまい/i, reason: "Dizziness"},
  {re: /跌倒|jatuh|転倒|\bfell\b|\bfall\b/i, reason: "Fall"},
  {re: /胸痛|sakit dada|胸の痛み|chest pain/i, reason: "Chest pain"},
];

export function mockAlert(text: string): {
  isAlert: boolean;
  alertReason: string | null;
} {
  const hit = ALERT_WORDS.find((w) => w.re.test(text));
  return hit ?
    {isAlert: true, alertReason: hit.reason} :
    {isAlert: false, alertReason: null};
}

export function mockTranslate(
  text: string,
  lang: Lang
): {translations: Translations; isAlert: boolean; alertReason: string | null} {
  const line = findDemoLine(text);
  if (line) {
    // Keep the speaker's exact words in their own language field.
    return {
      translations: {...line.translations, [lang]: text},
      isAlert: line.isAlert,
      alertReason: line.alertReason,
    };
  }
  const translations = {} as Translations;
  for (const l of LANGS) translations[l] = l === lang ? text : `[mock] ${text}`;
  return {translations, ...mockAlert(text)};
}

// ---------- Coach ----------

const COACH_DIZZY: Translations = {
  "id-ID":
    "1. Bantu Ama duduk atau berbaring dengan tenang. Jangan biarkan Ama " +
    "berjalan sendiri.\n" +
    "2. Berikan sedikit air hangat, lalu tawarkan makanan lunak seperti " +
    "bubur sedikit demi sedikit.\n" +
    "3. Segera hubungi keluarga. Jika pusing tidak membaik, atau ada nyeri " +
    "dada, sulit bicara, atau lemas, hubungi dokter atau 119.",
  "zh-TW":
    "1. 先扶阿嬤坐下或躺下休息，不要讓她自己走動。\n" +
    "2. 給她喝一點溫水，再少量提供粥之類的軟質食物。\n" +
    "3. 請馬上聯絡家人。如果頭暈沒有改善，或出現胸痛、說話困難、全身無力，" +
    "請立刻聯絡醫生或撥打 119。",
  "ja-JP":
    "1. おばあちゃんを座らせるか横にして休ませ、一人で歩かせないでください。\n" +
    "2. 白湯を少し飲ませ、おかゆなど柔らかい食べ物を少しずつ勧めてください。\n" +
    "3. すぐに家族に連絡してください。めまいが治まらない、胸の痛み、" +
    "話しにくさ、強いだるさがある場合は、すぐに医師に連絡するか119番に電話してください。",
};

const COACH_GENERAL: Translations = {
  "id-ID":
    "1. Tetap tenang dan perhatikan kondisi Ama dengan baik.\n" +
    "2. Tawarkan air minum dan pastikan Ama merasa nyaman.\n" +
    "3. Jika ada yang mengkhawatirkan, segera hubungi keluarga.",
  "zh-TW":
    "1. 保持冷靜，仔細觀察阿嬤的狀況。\n" +
    "2. 給她喝點水，確認她覺得舒服。\n" +
    "3. 如果有任何擔心的地方，請馬上聯絡家人。",
  "ja-JP":
    "1. 落ち着いて、おばあちゃんの様子をよく見てください。\n" +
    "2. 水分をとってもらい、楽な姿勢か確認してください。\n" +
    "3. 気になることがあれば、すぐに家族に連絡してください。",
};

export function mockCoach(question: string): {
  translations: Translations;
  shouldEscalate: boolean;
} {
  const dizzy = /頭暈|暈|pusing|dizzy|めまい|跌倒|jatuh|胸痛|sakit dada/i.test(
    question
  );
  return {
    translations: dizzy ? COACH_DIZZY : COACH_GENERAL,
    shouldEscalate: dizzy,
  };
}

// ---------- Care log ----------

export interface CareLog {
  meals: string;
  medication: string;
  mood: string;
  alerts: string[];
  summary: string;
}

export interface LogMessage {
  senderRole: string;
  originalText: string;
  translations: Translations;
  isAlert: boolean;
  time: string;
}

const LOG_TEXT: Record<Lang, Record<string, string>> = {
  "zh-TW": {
    none: "今天的對話中沒有提到。",
    porridge: "午餐時照護員準備了粥，阿嬤答應要吃。",
    meal: "今天有提到用餐。",
    lowAppetite: "照護員回報阿嬤食慾不好，不太想吃東西。",
    bpMed: "阿嬤今天早上已經吃過血壓藥。",
    med: "今天有提到吃藥。",
    moodDizzy: "阿嬤態度溫和、有禮貌，但表示今天有點頭暈。",
    moodGood: "阿嬤心情平穩，態度溫和。",
    summaryOk: "今天的照護一切順利，沒有異常狀況。",
    summaryAlert: "今天阿嬤有頭暈等需要留意的狀況，建議家人今天打電話關心，" +
      "若症狀持續請聯絡醫生。",
  },
  "ja-JP": {
    none: "今日の会話では触れられていません。",
    porridge: "昼食に介護士がおかゆを用意し、おばあちゃんは食べると答えました。",
    meal: "今日は食事について話がありました。",
    lowAppetite: "介護士によると、おばあちゃんは食欲がなく、あまり食べたがりません。",
    bpMed: "おばあちゃんは今朝、血圧の薬を飲みました。",
    med: "今日は服薬について話がありました。",
    moodDizzy: "おばあちゃんは穏やかで礼儀正しいですが、今日は少しめまいがすると話しています。",
    moodGood: "おばあちゃんは落ち着いていて、穏やかです。",
    summaryOk: "今日のケアは順調で、特に問題はありませんでした。",
    summaryAlert: "今日はおばあちゃんにめまいなど注意が必要な様子がありました。" +
      "今日中にご家族から連絡し、症状が続く場合は医師に相談してください。",
  },
  "id-ID": {
    none: "Tidak disebutkan dalam percakapan hari ini.",
    porridge: "Saat makan siang, caregiver menyiapkan bubur dan Ama mau makan.",
    meal: "Hari ini ada pembicaraan tentang makan.",
    lowAppetite: "Caregiver melaporkan Ama tidak nafsu makan.",
    bpMed: "Ama sudah minum obat tekanan darah tadi pagi.",
    med: "Hari ini ada pembicaraan tentang obat.",
    moodDizzy: "Ama tenang dan sopan, tetapi mengatakan agak pusing hari ini.",
    moodGood: "Ama tenang dan dalam suasana hati yang baik.",
    summaryOk: "Perawatan hari ini berjalan lancar tanpa masalah.",
    summaryAlert: "Hari ini Ama mengalami pusing dan perlu diperhatikan. " +
      "Keluarga sebaiknya menelepon hari ini dan menghubungi dokter jika " +
      "gejala berlanjut.",
  },
};

/** Build a care log from today's messages with simple keyword rules. */
export function mockCareLog(messages: LogMessage[], lang: Lang): CareLog {
  const T = LOG_TEXT[lang];
  const all = messages
    .map((m) => `${m.originalText} ${Object.values(m.translations).join(" ")}`)
    .join("\n");
  const has = (re: RegExp) => re.test(all);

  const meals: string[] = [];
  if (has(/bubur|粥|おかゆ/i)) meals.push(T.porridge);
  else if (has(/makan|吃|午餐|早餐|晚餐|ごはん|食事/i)) meals.push(T.meal);
  if (has(/tidak mau makan|不想吃|食べたがりません|食欲/i)) {
    meals.push(T.lowAppetite);
  }

  let medication = T.none;
  if (has(/tekanan darah|血壓|血圧/i)) medication = T.bpMed;
  else if (has(/obat|藥|薬/i)) medication = T.med;

  const dizzy = has(/頭暈|pusing|めまい|dizzy/i);
  let mood = T.none;
  if (dizzy) mood = T.moodDizzy;
  else if (messages.some((m) => m.senderRole === "elder")) mood = T.moodGood;

  const alerts = messages
    .filter((m) => m.isAlert)
    .map((m) => `${m.time} ${m.translations[lang] || m.originalText}`);

  return {
    meals: meals.length ? meals.join(" ") : T.none,
    medication,
    mood,
    alerts,
    summary: alerts.length ? T.summaryAlert : T.summaryOk,
  };
}
