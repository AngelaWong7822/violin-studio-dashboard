// Lightweight i18n — no build step, just a dictionary + DOM text-swapping.
// Usage: add data-i18n="key" (textContent) or data-i18n-placeholder="key"
// (input placeholder) to any element, then call applyI18n() after render.
const I18N_STRINGS = {
  en: {
    "nav.schedule": "Schedule",
    "nav.availability": "Availability",
    "nav.leads": "Leads",
    "nav.attendance": "Attendance",
    "nav.payments": "Payments",
    "nav.logout": "Log out",

    "login.title": "Violin Studio Login",
    "login.email_placeholder": "Email",
    "login.password_placeholder": "Password",
    "login.button": "Log in",
    "login.help": "Accounts are created in the Supabase dashboard (Authentication > Users) — one for Angela, one for the boyfriend.",

    "schedule.title": "This Week",
    "schedule.new_appt": "+ New appointment",
    "schedule.col_when": "When",
    "schedule.col_type": "Type",
    "schedule.col_with": "With",
    "schedule.col_status": "Status",
    "schedule.col_paid": "Paid",
    "schedule.empty": 'No appointments yet — click "+ New appointment" to add one.',
    "schedule.calendar_title": "Shared Google Calendar",
    "schedule.edit": "Edit",

    "dialog.new_title": "New appointment",
    "dialog.edit_title": "Edit appointment",
    "dialog.type": "Type",
    "dialog.contact": "Contact name / phone",
    "dialog.contact_placeholder": "e.g. Chan Tai Man / 9123 4567",
    "dialog.start": "Start",
    "dialog.end": "End",
    "dialog.status": "Status",
    "dialog.paid": "Paid",
    "dialog.cancel": "Cancel",
    "dialog.save": "Save",

    "type.consultation": "Consultation",
    "type.lesson": "Lesson",
    "type.group_class": "Group class",

    "status.confirmed": "Confirmed",
    "status.pending_confirmation": "Pending confirmation",
    "status.completed": "Completed",
    "status.cancelled": "Cancelled",
    "status.no_show": "No show",

    "availability.title": "Weekly availability",
    "availability.save": "Save",
    "availability.description": "Tap a cell to mark yourself free at that time every week. Bookmark this page to your phone's home screen — this is the one thing worth keeping up to date so Angela can quote you a slot instantly.",
    "availability.saved": "Saved ✓",
    "day.0": "Sun", "day.1": "Mon", "day.2": "Tue", "day.3": "Wed", "day.4": "Thu", "day.5": "Fri", "day.6": "Sat",

    "leads.title": "Leads pipeline",
    "leads.new": "+ New lead",
    "lead.name": "Name",
    "lead.phone": "WhatsApp number",
    "lead.phone_placeholder": "+852 9123 4567",
    "lead.source": "Source",
    "dialog.new_lead": "New lead",

    "leadstatus.inquired": "Inquired",
    "leadstatus.consultation_booked": "Consultation booked",
    "leadstatus.attended": "Attended",
    "leadstatus.converted": "Converted",
    "leadstatus.lost": "Lost",

    "source.facebook_ad": "Facebook ad",
    "source.whatsapp_direct": "WhatsApp direct",
    "source.referral": "Referral",
    "source.existing_student": "Existing student",

    "attendance.title": "Attendance",
    "attendance.session": "Session",
    "attendance.col_student": "Student",
    "attendance.col_attended": "Attended",
    "attendance.add_to_roster": "Add to roster",
    "attendance.empty_roster": "No students on the roster yet — add one below.",
    "attendance.empty_sessions": "No upcoming/recent lessons or group classes yet — add one from the Schedule tab.",

    "payments.title": "Payments",
    "payments.unpaid_only": "Show unpaid only",
    "payments.empty": "Nothing to show.",
  },
  "zh-Hant": {
    "nav.schedule": "時間表",
    "nav.availability": "得閒時間",
    "nav.leads": "客戶",
    "nav.attendance": "出席",
    "nav.payments": "付款",
    "nav.logout": "登出",

    "login.title": "小提琴 Studio 登入",
    "login.email_placeholder": "電郵",
    "login.password_placeholder": "密碼",
    "login.button": "登入",
    "login.help": "帳戶要喺Supabase後台開(Authentication > Users)——一個俾Angela,一個俾男朋友。",

    "schedule.title": "本星期",
    "schedule.new_appt": "+ 新增預約",
    "schedule.col_when": "時間",
    "schedule.col_type": "類型",
    "schedule.col_with": "對象",
    "schedule.col_status": "狀態",
    "schedule.col_paid": "已付",
    "schedule.empty": "仲未有預約 —— 撳「+ 新增預約」加一個。",
    "schedule.calendar_title": "共用 Google 日曆",
    "schedule.edit": "編輯",

    "dialog.new_title": "新增預約",
    "dialog.edit_title": "編輯預約",
    "dialog.type": "類型",
    "dialog.contact": "聯絡人姓名 / 電話",
    "dialog.contact_placeholder": "例如:陳大文 / 9123 4567",
    "dialog.start": "開始時間",
    "dialog.end": "結束時間",
    "dialog.status": "狀態",
    "dialog.paid": "已付款",
    "dialog.cancel": "取消",
    "dialog.save": "儲存",

    "type.consultation": "諮詢",
    "type.lesson": "堂",
    "type.group_class": "小組班",

    "status.confirmed": "已確認",
    "status.pending_confirmation": "待確認",
    "status.completed": "已完成",
    "status.cancelled": "已取消",
    "status.no_show": "缺席",

    "availability.title": "每週得閒時間",
    "availability.save": "儲存",
    "availability.description": "㩒一格代表你嗰個時段每星期都得閒。將呢頁加落手機主畫面——呢樣係唯一要keep住update嘅嘢,等Angela可以即刻話到客得閒時間。",
    "availability.saved": "已儲存 ✓",
    "day.0": "日", "day.1": "一", "day.2": "二", "day.3": "三", "day.4": "四", "day.5": "五", "day.6": "六",

    "leads.title": "客戶追蹤",
    "leads.new": "+ 新增客戶",
    "lead.name": "姓名",
    "lead.phone": "WhatsApp 號碼",
    "lead.phone_placeholder": "+852 9123 4567",
    "lead.source": "來源",
    "dialog.new_lead": "新增客戶",

    "leadstatus.inquired": "查詢中",
    "leadstatus.consultation_booked": "已約諮詢",
    "leadstatus.attended": "已出席",
    "leadstatus.converted": "已轉正式生",
    "leadstatus.lost": "流失",

    "source.facebook_ad": "Facebook 廣告",
    "source.whatsapp_direct": "WhatsApp 直接聯絡",
    "source.referral": "介紹",
    "source.existing_student": "現有學生",

    "attendance.title": "出席",
    "attendance.session": "堂節",
    "attendance.col_student": "學生",
    "attendance.col_attended": "出席",
    "attendance.add_to_roster": "加入名單",
    "attendance.empty_roster": "名單仲未有學生 —— 喺下面加一個。",
    "attendance.empty_sessions": "仲未有將到/最近嘅堂或小組班 —— 去「時間表」頁加一個。",

    "payments.title": "付款",
    "payments.unpaid_only": "只顯示未付",
    "payments.empty": "冇嘢顯示。",
  },
};

function getLang() {
  return localStorage.getItem("violin_studio_lang") || "zh-Hant";
}

function setLang(lang) {
  localStorage.setItem("violin_studio_lang", lang);
}

function t(key) {
  const lang = getLang();
  return I18N_STRINGS[lang]?.[key] ?? I18N_STRINGS.en[key] ?? key;
}

function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = lang === "zh-Hant" ? "zh-Hant" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-lang-toggle]").forEach((btn) => {
    btn.textContent = lang === "zh-Hant" ? "EN" : "中文";
  });
}

function toggleLang() {
  setLang(getLang() === "zh-Hant" ? "en" : "zh-Hant");
  applyI18n();
  if (typeof window.onLangChange === "function") window.onLangChange();
}

function localeForDates() {
  return getLang() === "zh-Hant" ? "zh-HK" : "en-HK";
}
