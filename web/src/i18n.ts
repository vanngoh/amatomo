import type { Lang, Role } from "./types";

const T = {
  "zh-TW": {
    role: { elder: "阿嬤", caregiver: "照護員 Siti", family: "家人", coach: "AI 照護教練" },
    original: "原文",
    typeHere: "輸入訊息…",
    send: "送出",
    listening: "聆聽中…",
    tapToSpeak: "按一下說話",
    tapToStop: "按一下停止",
    enableSound: "🔊 按一下開啟聲音",
    soundOn: "🔊 自動朗讀：開",
    soundOff: "🔈 自動朗讀：關",
    quick: "快速句子",
    todayLog: "📋 今日照護紀錄",
    meals: "飲食",
    medication: "用藥",
    mood: "心情",
    alerts: "警示",
    summary: "總結",
    noAlerts: "今天沒有警示",
    close: "關閉",
    empty: "還沒有訊息。說一句話開始吧！",
    alert: "健康警示",
    dismiss: "知道了",
    loading: "產生中…",
    sending: "翻譯中…",
    noMic: "此瀏覽器不支援語音輸入，請用文字輸入。",
  },
  "ja-JP": {
    role: { elder: "おばあちゃん", caregiver: "介護士 Siti", family: "家族", coach: "AIケアコーチ" },
    original: "原文",
    typeHere: "メッセージを入力…",
    send: "送信",
    listening: "聞いています…",
    tapToSpeak: "タップして話す",
    tapToStop: "タップして停止",
    enableSound: "🔊 タップして音声をオン",
    soundOn: "🔊 読み上げ：オン",
    soundOff: "🔈 読み上げ：オフ",
    quick: "クイック文",
    todayLog: "📋 今日のケア記録",
    meals: "食事",
    medication: "服薬",
    mood: "気分",
    alerts: "アラート",
    summary: "まとめ",
    noAlerts: "今日のアラートはありません",
    close: "閉じる",
    empty: "まだメッセージはありません。",
    alert: "健康アラート",
    dismiss: "確認",
    loading: "作成中…",
    sending: "翻訳中…",
    noMic: "このブラウザは音声入力に対応していません。文字で入力してください。",
  },
  "id-ID": {
    role: { elder: "Ama", caregiver: "Siti (saya)", family: "Keluarga", coach: "Pelatih Perawatan AI" },
    original: "Asli",
    typeHere: "Ketik pesan…",
    send: "Kirim",
    listening: "Mendengarkan…",
    tapToSpeak: "Ketuk untuk bicara",
    tapToStop: "Ketuk untuk berhenti",
    enableSound: "🔊 Ketuk untuk menyalakan suara",
    soundOn: "🔊 Bacakan otomatis: AKTIF",
    soundOff: "🔈 Bacakan otomatis: MATI",
    quick: "Kalimat cepat",
    todayLog: "📋 Catatan hari ini",
    meals: "Makan",
    medication: "Obat",
    mood: "Suasana hati",
    alerts: "Peringatan",
    summary: "Ringkasan",
    noAlerts: "Tidak ada peringatan hari ini",
    close: "Tutup",
    empty: "Belum ada pesan. Mulai bicara!",
    alert: "Peringatan kesehatan",
    dismiss: "Mengerti",
    loading: "Membuat…",
    sending: "Menerjemahkan…",
    noMic: "Browser ini tidak mendukung input suara. Silakan ketik.",
  },
};

export type Strings = (typeof T)["zh-TW"];
export function t(lang: Lang): Strings {
  return T[lang];
}

export const ROLE_ICON: Record<Role, string> = {
  elder: "👵",
  caregiver: "🧕",
  family: "👩",
  coach: "🤖",
};

export const LANG_LABEL: Record<Lang, string> = {
  "zh-TW": "中文",
  "id-ID": "Indonesia",
  "ja-JP": "日本語",
};

export const COACH_UI = {
  title: "Pelatih Perawatan AI",
  hint: "Tanyakan apa saja tentang merawat Ama.",
  placeholder: "Tulis pertanyaan…",
  ask: "Tanya",
  thinking: "Sedang berpikir…",
  escalate: "⚠️ Hubungi keluarga atau dokter sekarang. Keluarga sudah diberi tahu.",
};

/** Demo lines (CLAUDE.md section 2). */
export const DEMO_LINES = {
  line1: "Ama, sudah waktunya makan siang. Mau makan bubur?",
  line2: "好，謝謝你。可是我今天有點頭暈。",
  line3: "Ama sudah minum obat tekanan darah tadi pagi.",
  line4: "Ama pusing dan tidak mau makan. Apa yang harus saya lakukan?",
};
