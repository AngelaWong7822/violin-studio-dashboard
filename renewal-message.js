// Term renewal message: writes the WhatsApp text for one student's term
// (lesson dates, recorded leave, skipped holiday weeks, fee, and the offer to
// turn last term's unused leave into a 1:1 lesson) for her to review, copy
// and send herself. Nothing is ever sent from here. The message is always in
// Chinese (it goes to parents); the dialog labels follow the UI language.
// Payment details are typed into the dialog and kept in
// studio_settings.renewal_message, never in this (public) source.
(() => {
  const DEFAULTS = { intro: "這是今期上堂的日子，方便你Mark底 😁", payment: "", privatePrice: 600, dads: [] };
  const DAY = 86400000;
  const LEAVE_OFFER_FROM = 2;

  const startOfDay = (v) => { const d = new Date(v); d.setHours(0, 0, 0, 0); return d; };
  const shortDate = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
  const longDate = (d) => `${d.getFullYear()}年${shortDate(d)}`;
  const holidayZh = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return HK_HOLIDAYS[`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`]?.[0] ?? "";
  };

  // Weeks between the first and last lesson with no lesson within 3 days of
  // the class's usual weekday — i.e. the weeks that are skipped.
  function skippedWeeks(dates, weekday) {
    if (dates.length < 2 || weekday == null) return [];
    const days = dates.map(startOfDay);
    const d = new Date(days[0]);
    d.setDate(d.getDate() - 3);
    while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
    const out = [];
    for (; d < days[days.length - 1]; d.setDate(d.getDate() + 7)) {
      if (!days.some((x) => Math.round(Math.abs(x - d) / DAY) <= 3)) out.push(new Date(d));
    }
    return out;
  }

  function skippedLines(weeks) {
    const lines = [];
    const holidays = weeks.filter((d) => holidayZh(d));
    const others = weeks.filter((d) => !holidayZh(d));
    if (holidays.length) {
      const items = holidays.map((d) => `${shortDate(d)} ${holidayZh(d)}`);
      const joined = items.length > 1 ? `${items.slice(0, -1).join("、")}及 ${items[items.length - 1]}` : items[0];
      lines.push(`（${joined}假期停課）`);
    }
    if (others.length) lines.push(`（${others.map(shortDate).join("、")}停課）`);
    return lines;
  }

  function leaveNote(lesson, perLesson, madeUpDate) {
    if (lesson.status !== "leave") return "";
    if (lesson.make_up_status === "pending") return `（請假，今期扣 $${Math.round(perLesson)}）`;
    if (lesson.make_up_status === "deferred_to_next_package") return "（已記錄請假，下期扣數）";
    if (lesson.make_up_status === "combined_with_private" && lesson.make_up_remark) return "（已記錄請假，轉私人堂補）";
    const target = lesson.make_up_status === "made_up" ? madeUpDate(lesson) : null;
    if (target) return `（已記錄請假，${shortDate(new Date(target))}補堂）`;
    return "（已記錄請假，保留補課 Quota）";
  }

  // A leave nobody has dealt with yet: not made up, deducted, deferred or
  // folded into a private lesson.
  const isUnusedLeave = (l) => l.status === "leave" && (
    !l.make_up_status || l.make_up_status === "unprocessed"
    || (l.make_up_status === "made_up" && !l.made_up_appointment_id)
    || (l.make_up_status === "combined_with_private" && !l.make_up_remark));

  function greetingName(name, parent) {
    const base = String(name ?? "").replace(/\s*(媽媽|媽咪|爸爸)\s*$/, "").trim();
    return `你好，${base}${parent === "dad" ? "爸爸" : "媽媽"}，`;
  }

  // info: { name, weekday, price, totalLessons, finalPrice, lessons, prev: { price, totalLessons, lessons } | null, madeUpDate }
  function buildRenewalMessage(info, settings, parent) {
    const lessons = [...info.lessons].sort((a, b) => new Date(a.date) - new Date(b.date));
    const perLesson = info.totalLessons ? info.price / info.totalLessons : 0;
    const out = [greetingName(info.name, parent), "", settings.intro];
    let weeks = skippedWeeks(lessons.map((l) => l.date), info.weekday);
    lessons.forEach((l, i) => {
      const when = startOfDay(l.date);
      const before = weeks.filter((d) => d < when);
      weeks = weeks.filter((d) => d >= when);
      out.push(...skippedLines(before));
      out.push(`${i + 1}. ${longDate(when)}${leaveNote(l, perLesson, info.madeUpDate)}`);
    });

    const deducted = Math.round(info.price - info.finalPrice);
    let fee = `今期學費：${info.finalPrice}/${info.totalLessons}`;
    if (deducted > 0) fee += `（原價 ${Math.round(info.price)}，已扣請假堂數 $${deducted}）`;
    if (settings.payment) fee += `, ${settings.payment}`;
    out.push("", fee);

    const unused = (info.prev?.lessons ?? []).filter(isUnusedLeave)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (unused.length >= LEAVE_OFFER_FROM) {
      const prevPer = info.prev.price > 0 && info.prev.totalLessons ? info.prev.price / info.prev.totalLessons : perLesson;
      const surcharge = Math.round(Number(settings.privatePrice) - LEAVE_OFFER_FROM * prevPer);
      out.push("",
        `另外見到上期有 ${unused.length} 堂請假未補（${unused.map((l) => shortDate(new Date(l.date))).join("、")}），`,
        `會唔會想${surcharge > 0 ? `加 $${surcharge}，` : ""}將 ${LEAVE_OFFER_FROM} 堂轉做 1 堂 1:1 private 堂（45 分鐘）？`);
    }
    return out.join("\n");
  }

  async function loadSettings() {
    const { data, error } = await supabaseClient.from("studio_settings").select("renewal_message").maybeSingle();
    return { settings: { ...DEFAULTS, ...(data?.renewal_message ?? {}) }, error };
  }
  async function saveSettings(settings) {
    const { error } = await supabaseClient.from("studio_settings").upsert({ id: true, renewal_message: settings });
    return error;
  }

  async function copyText(textarea) {
    try {
      await navigator.clipboard.writeText(textarea.value);
      return true;
    } catch (e) {
      textarea.select();
      return document.execCommand("copy");
    }
  }

  // info as for buildRenewalMessage, plus studentId and phone.
  async function openRenewalMessage(info) {
    const loaded = await loadSettings();
    let settings = loaded.settings;
    let parent = settings.dads.includes(info.studentId) ? "dad" : "mum";
    const digits = String(info.phone ?? "").replace(/[^0-9]/g, "");

    const dialog = document.createElement("dialog");
    dialog.className = "renewal-msg-dialog";
    dialog.innerHTML = `
      <div class="rm-body">
        <div class="rm-head"><strong>${esc(info.name)}</strong><span>${digits ? esc(tf("renewmsg.send_to", { phone: info.phone })) : esc(t("renewmsg.no_phone"))}</span></div>
        <div class="rm-parent"><span>${esc(t("renewmsg.greet_as"))}</span>
          <button type="button" data-parent="mum">媽媽</button><button type="button" data-parent="dad">爸爸</button></div>
        <p class="rm-warn" hidden></p>
        <textarea class="rm-text" rows="17" aria-label="${esc(t("renewmsg.button"))}"></textarea>
        <details class="rm-settings">
          <summary>${esc(t("renewmsg.settings"))}</summary>
          <label>${esc(t("renewmsg.intro"))}<input type="text" data-setting="intro" /></label>
          <label>${esc(t("renewmsg.payment"))}<input type="text" data-setting="payment" placeholder="FPS to …" /></label>
          <label>${esc(t("renewmsg.private_price"))}<input type="number" min="0" step="1" data-setting="privatePrice" /></label>
          <button type="button" class="rm-save">${esc(t("renewmsg.save_settings"))}</button>
        </details>
        <p class="rm-status" role="status"></p>
        <div class="rm-actions">
          <button type="button" class="link rm-close">${esc(t("renewmsg.close"))}</button>
          <button type="button" class="rm-wa"${digits ? "" : " hidden"}>${esc(t("renewmsg.open_whatsapp"))}</button>
          <button type="button" class="primary rm-copy">${esc(t("renewmsg.copy"))}</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const $ = (sel) => dialog.querySelector(sel);
    const textarea = $(".rm-text");
    const status = (msg) => { $(".rm-status").textContent = msg; };
    const paintParent = () => dialog.querySelectorAll("[data-parent]")
      .forEach((b) => b.setAttribute("aria-pressed", b.dataset.parent === parent));
    const regenerate = () => { textarea.value = buildRenewalMessage(info, settings, parent); };

    dialog.querySelectorAll("[data-setting]").forEach((el) => { el.value = settings[el.dataset.setting] ?? ""; });
    if (!settings.payment) $(".rm-settings").open = true;
    const warnings = [];
    if (info.lessons.length < info.totalLessons) warnings.push(tf("renewmsg.short_dates", { n: info.lessons.length, total: info.totalLessons }));
    if (!settings.payment) warnings.push(t("renewmsg.need_payment"));
    if (warnings.length) { $(".rm-warn").textContent = warnings.join(" "); $(".rm-warn").hidden = false; }
    if (loaded.error) status(tf("renewmsg.load_failed", { error: loaded.error.message }));
    paintParent();
    regenerate();

    dialog.querySelectorAll("[data-parent]").forEach((btn) => btn.addEventListener("click", async () => {
      parent = btn.dataset.parent;
      paintParent();
      // Swap only the greeting line, so anything she has typed stays.
      const lines = textarea.value.split("\n");
      if (lines[0].startsWith("你好")) lines[0] = greetingName(info.name, parent);
      textarea.value = lines.join("\n");
      const dads = settings.dads.filter((id) => id !== info.studentId);
      if (parent === "dad") dads.push(info.studentId);
      settings = { ...settings, dads };
      if (loaded.error) return;
      const error = await saveSettings(settings);
      if (error) status("Save failed: " + error.message);
    }));
    $(".rm-save").addEventListener("click", async () => {
      const next = { ...settings };
      dialog.querySelectorAll("[data-setting]").forEach((el) => { next[el.dataset.setting] = el.value.trim(); });
      next.privatePrice = Number(next.privatePrice) || DEFAULTS.privatePrice;
      next.intro = next.intro || DEFAULTS.intro;
      const error = await saveSettings(next);
      if (error) { status("Save failed: " + error.message); return; }
      settings = next;
      regenerate();
      if (settings.payment) $(".rm-warn").hidden = info.lessons.length >= info.totalLessons;
      status(t("renewmsg.saved"));
    });
    $(".rm-copy").addEventListener("click", async () => {
      status((await copyText(textarea)) ? t("renewmsg.copied") : t("renewmsg.copy_failed"));
    });
    $(".rm-wa").addEventListener("click", () => {
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(textarea.value)}`, "_blank", "noopener");
    });
    $(".rm-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => dialog.remove());
    dialog.showModal();
  }

  window.openRenewalMessage = openRenewalMessage;
  window.buildRenewalMessage = buildRenewalMessage;
})();
