// Shared "⚙️" settings menu used by every dashboard page — houses the
// language toggle and the full data-wipe utility (for UAT resets), so both
// live in one place instead of being duplicated per page.

// Tables in FK-safe delete order: children before the parents they reference.
const WIPE_TABLES_IN_ORDER = [
  "attendance", "pending_actions", "messages", "packages",
  "appointments", "availability_blocks", "leads", "students", "classes", "contacts",
];
const WIPE_CONFIRM_PHRASE = "DELETE";

function initSettingsMenu() {
  const btn = document.getElementById("settings-btn");
  const menu = document.getElementById("settings-menu");
  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "none" ? "flex" : "none";
  });
  document.addEventListener("click", (e) => {
    if (menu.style.display !== "none" && !menu.contains(e.target) && e.target !== btn) {
      menu.style.display = "none";
    }
  });

  const langBtn = document.getElementById("settings-lang-toggle");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      toggleLang();
      if (typeof window.onLangChange === "function") window.onLangChange();
    });
  }

  const wipeBtn = document.getElementById("settings-wipe-btn");
  if (wipeBtn) {
    wipeBtn.addEventListener("click", async () => {
      const typed = prompt(tf("settings.wipe_prompt", { phrase: WIPE_CONFIRM_PHRASE }));
      if (typed === null) return;
      if (typed !== WIPE_CONFIRM_PHRASE) { alert(t("settings.wipe_mismatch")); return; }

      wipeBtn.disabled = true;
      const originalLabel = wipeBtn.textContent;
      wipeBtn.textContent = t("settings.wiping_calendar");

      const { data: calendarResult, error: calendarError } = await supabaseClient.functions.invoke("wipe-calendar-events");
      if (calendarError || !calendarResult?.ok) {
        const detail = calendarError?.message || (calendarResult?.failed ?? []).join("; ") || "unknown error";
        alert(tf("settings.wipe_calendar_failed", { detail }));
        wipeBtn.disabled = false;
        wipeBtn.textContent = originalLabel;
        return;
      }

      wipeBtn.textContent = t("settings.wiping");

      for (const table of WIPE_TABLES_IN_ORDER) {
        const { error } = await supabaseClient
          .from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) {
          alert(`${table}: ${error.message}`);
          wipeBtn.disabled = false;
          wipeBtn.textContent = originalLabel;
          return;
        }
      }
      alert(t("settings.wipe_done"));
      location.reload();
    });
  }
}
