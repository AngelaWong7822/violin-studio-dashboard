// Global parent search — a 🔍 button in the top nav (and Ctrl+K) on every page.
// Type a phone number (any part of it, with or without 852 / spaces) or a name
// (parent, student, or social-media name) and every matching parent shows up
// with what they are in the system: a student (group / private) and/or a lead.
// Clicking a chip jumps to the right page:
//   student -> packages.html?q=<name> / private.html?q=<name>  (pre-fills that page's own search box)
//   lead    -> leads.html?contact=<contact id>                  (opens the edit dialog)
// Needs supabase-config.js, i18n.js and settings.js (esc) loaded first.
(function () {
  if (window.__gsearchInit) return;
  window.__gsearchInit = true;

  const MAX_ROWS = 20;
  const CONTACT_COLS = "id, name, whatsapp_number, social_media_name";

  const css = `
  #gsearch-btn { font-size: 15px; }
  dialog.gsearch-dialog { border: 1.5px solid #fdba74; border-radius: 18px; padding: 0; width: 600px; max-width: 94vw; margin: 8vh auto auto; background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%); box-shadow: 0 18px 50px rgba(124, 45, 18, .28); color: #27272a; }
  dialog.gsearch-dialog::backdrop { background: rgba(124, 45, 18, .28); }
  .gsearch-box { padding: 16px 18px 14px; }
  .gsearch-input { width: 100%; box-sizing: border-box; font: inherit; font-size: 16px; padding: 10px 16px; border: 1.5px solid #fdba74; border-radius: 999px; background: #fff; outline: none; color: #27272a; }
  .gsearch-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234, 88, 12, .12); }
  .gsearch-hint { margin: 10px 4px 2px; font-size: 12px; color: #92400e; opacity: .8; }
  .gsearch-results { margin-top: 10px; max-height: 56vh; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
  .gsearch-row { background: #fff; border: 1px solid #fed7aa; border-radius: 14px; padding: 8px 12px; }
  .gsearch-row.sel { border-color: #ea580c; box-shadow: 0 0 0 2px rgba(234, 88, 12, .15); }
  .gsearch-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .gsearch-name { font-weight: 700; color: #7c2d12; }
  .gsearch-sub { font-size: 12px; color: #71717a; }
  .gsearch-phone { font-size: 12px; font-weight: 600; color: #166534; background: #dcfce7; border: 1px solid #86efac; border-radius: 999px; padding: 1px 9px; text-decoration: none; }
  .gsearch-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  a.gsearch-chip { font-size: 12px; text-decoration: none; color: #9a3412; background: #ffedd5; border: 1px solid #fdba74; border-radius: 999px; padding: 2px 10px; }
  a.gsearch-chip:hover { background: #fed7aa; }
  a.gsearch-chip.lead { background: #fef9c3; border-color: #fde047; color: #854d0e; }
  a.gsearch-chip.off { opacity: .55; }
  .gsearch-none { text-align: center; color: #92400e; padding: 18px 4px 8px; font-size: 14px; }
  @media (max-width: 640px) { dialog.gsearch-dialog { margin-top: 3vh; } }
  `;

  function tx(key, fallback) { const v = t(key); return v === key ? fallback : v; }

  // Escape LIKE wildcards so a typed % or _ is matched literally.
  function likePattern(s) { return "%" + s.replace(/[\\%_]/g, "\\$&") + "%"; }

  let dlg, input, results, hint, seq = 0, timer = null, selIdx = -1, rowsData = [];

  function build() {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    dlg = document.createElement("dialog");
    dlg.className = "gsearch-dialog";
    dlg.innerHTML = `
      <div class="gsearch-box">
        <input type="text" class="gsearch-input" autocomplete="off" spellcheck="false" />
        <div class="gsearch-hint"></div>
        <div class="gsearch-results"></div>
      </div>`;
    document.body.appendChild(dlg);
    input = dlg.querySelector(".gsearch-input");
    results = dlg.querySelector(".gsearch-results");
    hint = dlg.querySelector(".gsearch-hint");

    // click on the dimmed backdrop closes it
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(run, 220);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!rowsData.length) return;
        selIdx = (selIdx + (e.key === "ArrowDown" ? 1 : -1) + rowsData.length) % rowsData.length;
        paintSel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const row = results.querySelectorAll(".gsearch-row")[selIdx < 0 ? 0 : selIdx];
        const first = row?.querySelector("a.gsearch-chip") || row?.querySelector("a.gsearch-phone");
        if (first) first.click();
      }
    });
  }

  function paintSel() {
    results.querySelectorAll(".gsearch-row").forEach((r, i) => r.classList.toggle("sel", i === selIdx));
    const r = results.querySelectorAll(".gsearch-row")[selIdx];
    if (r) r.scrollIntoView({ block: "nearest" });
  }

  function openDialog() {
    if (!dlg) build();
    input.placeholder = tx("search.placeholder", "Phone number or name…");
    hint.textContent = tx("search.hint", "Type any part of a phone number, a parent name, a student name or a social media name.");
    if (!dlg.open) dlg.showModal();
    input.select();
  }

  // ---------- query ----------
  async function findMatches(q) {
    const digits = q.replace(/[^0-9]/g, "");
    const phoneish = /^[0-9+\s\-()]+$/.test(q) && digits.length >= 3;
    const like = likePattern(q);
    const sb = supabaseClient;

    const jobs = [
      sb.from("contacts").select(CONTACT_COLS).ilike("name", like).limit(40),
      sb.from("contacts").select(CONTACT_COLS).ilike("social_media_name", like).limit(40),
      sb.from("students").select(`id, contact_id, name, is_group, active, contacts(${CONTACT_COLS})`).ilike("name", like).limit(40),
    ];
    if (phoneish) jobs.push(sb.from("contacts").select(CONTACT_COLS).ilike("whatsapp_number", likePattern(digits)).limit(40));
    const res = await Promise.all(jobs);
    const failed = res.find(r => r.error);
    if (failed) throw failed.error;

    const contacts = new Map();
    for (const r of [res[0], res[1], res[3]]) for (const c of (r?.data ?? [])) contacts.set(c.id, c);
    for (const s of (res[2].data ?? [])) if (s.contacts) contacts.set(s.contacts.id, s.contacts);

    const ids = [...contacts.keys()];
    if (!ids.length) return [];
    const [stu, led] = await Promise.all([
      sb.from("students").select("id, contact_id, name, is_group, active").in("contact_id", ids),
      sb.from("leads").select("id, contact_id, status").in("contact_id", ids),
    ]);
    if (stu.error) throw stu.error;
    if (led.error) throw led.error;

    const ql = q.toLowerCase();
    const rows = ids.map(id => {
      const c = contacts.get(id);
      return {
        contact: c,
        students: (stu.data ?? []).filter(s => s.contact_id === id),
        leads: (led.data ?? []).filter(l => l.contact_id === id),
      };
    });
    // Best matches first: name / phone starting with the query, then the rest A-Z.
    const score = (r) => {
      const n = (r.contact.name ?? "").toLowerCase(), p = (r.contact.whatsapp_number ?? "");
      if (n === ql) return 0;
      if (n.startsWith(ql) || (phoneish && p.endsWith(digits))) return 1;
      return 2;
    };
    rows.sort((a, b) => score(a) - score(b) || (a.contact.name ?? "").localeCompare(b.contact.name ?? ""));
    return rows;
  }

  async function run() {
    const q = input.value.trim();
    const mine = ++seq;
    if (!q) { results.innerHTML = ""; rowsData = []; selIdx = -1; return; }
    results.innerHTML = `<div class="gsearch-none">…</div>`;
    let rows;
    try { rows = await findMatches(q); }
    catch (err) {
      if (mine !== seq) return;
      results.innerHTML = `<div class="gsearch-none">${esc(err.message ?? String(err))}</div>`;
      return;
    }
    if (mine !== seq) return; // a newer keystroke already took over
    rowsData = rows.slice(0, MAX_ROWS);
    selIdx = rowsData.length ? 0 : -1;
    render(rows.length);
  }

  function chipsFor(r) {
    const out = [];
    for (const s of r.students) {
      const label = s.name || r.contact.name || "";
      const page = s.is_group ? "packages.html" : "private.html";
      const icon = s.is_group ? "🎻" : "🧸";
      const kind = tx(s.is_group ? "search.group_student" : "search.private_student", s.is_group ? "Group" : "Private");
      out.push(`<a class="gsearch-chip${s.active === false ? " off" : ""}" href="${page}?q=${encodeURIComponent(label)}">${icon} ${esc(label)} · ${esc(kind)}${s.active === false ? " · " + esc(tx("search.inactive", "inactive")) : ""}</a>`);
    }
    for (const l of r.leads) {
      const key = "leadstatus." + l.status;
      const st = tx(key, l.status);
      out.push(`<a class="gsearch-chip lead" href="leads.html?contact=${encodeURIComponent(r.contact.id)}">🌱 ${esc(tx("search.lead", "Lead"))} · ${esc(st)}</a>`);
    }
    return out.join("");
  }

  function render(total) {
    if (!rowsData.length) {
      results.innerHTML = `<div class="gsearch-none">${esc(tx("search.none", "No match"))}</div>`;
      return;
    }
    results.innerHTML = rowsData.map((r, i) => {
      const c = r.contact;
      const phone = c.whatsapp_number ?? "";
      const digits = phone.replace(/[^0-9]/g, "");
      const wa = digits ? `<a class="gsearch-phone" href="https://wa.me/${digits}" target="_blank" rel="noopener" title="WhatsApp">💬 ${esc(phone)}</a>` : "";
      const social = c.social_media_name ? `<span class="gsearch-sub">${esc(c.social_media_name)}</span>` : "";
      const chips = chipsFor(r);
      return `<div class="gsearch-row${i === selIdx ? " sel" : ""}">
        <div class="gsearch-top"><span class="gsearch-name">${esc(c.name || phone || "—")}</span>${wa}${social}</div>
        <div class="gsearch-chips">${chips || `<span class="gsearch-sub">${esc(tx("search.contact_only", "Contact only (not a student or lead)"))}</span>`}</div>
      </div>`;
    }).join("") + (total > rowsData.length
      ? `<div class="gsearch-none" style="padding:6px 4px 0;font-size:12px;">${esc(tf("search.more", { n: total - rowsData.length }))}</div>` : "");
  }

  // ---------- wiring ----------
  function init() {
    const refresh = document.getElementById("refresh-btn");
    const nav = document.querySelector("header.topnav");
    if (!nav) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "gsearch-btn";
    btn.textContent = "🔍";
    btn.title = tx("search.title", "Search parents (Ctrl+K)");
    btn.setAttribute("aria-label", btn.title);
    btn.addEventListener("click", openDialog);
    if (refresh) refresh.before(btn); else nav.appendChild(btn);

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openDialog();
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
