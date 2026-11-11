export type Lang = "zh-TW" | "id-ID" | "ja-JP";
export type Role = "elder" | "caregiver" | "family" | "coach";
export type Translations = Record<Lang, string>;

export interface Message {
  id: string;
  senderRole: Role;
  originalText: string;
  originalLang: Lang;
  translations: Translations;
  isAlert: boolean;
  alertReason: string | null;
  mock?: boolean;
  question?: string;
  createdAt: Date | null;
}

export interface CareLog {
  date: string;
  lang: Lang;
  meals: string;
  medication: string;
  mood: string;
  alerts: string[];
  summary: string;
  messageCount: number;
  mock: boolean;
}
