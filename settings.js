// Shared "⚙️" settings menu used by every dashboard page — houses the
// language toggle and the Excel export, so both live in one place instead
// of being duplicated per page.

// ---------- Export: Attendance + Payment sheets (group classes only) ----------
// Two report-style sheets that read like the app's own Attendance/Payments
// tabs (one block per class), rather than a raw per-table dump — per
// Angela's request to see it "separated by class" the way she already
// scans it in packages.html.

function exportAttendanceSymbol(row) {
  if (!row) return "-";
  if (row.status === "attended") return "✓";
  if (row.status === "leave") return "請假";
  if (row.status === "no_show") return "✕";
  return "-";
}

function exportIsDeductible(row) {
  return row.status === "leave" && row.make_up_status === "pending";
}

// A package's "N lessons" are the first N appointments in that class on/after
// its start_date — mirrors packages.html's own getPackageLessonAppointments,
// computed from the appointments already fetched instead of a fresh query
// per package.
function exportPackageLessonAppointments(classAppointments, pkg) {
  return classAppointments
    .filter(a => a.class_id === pkg.class_id && a.scheduled_start >= pkg.start_date)
    .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
    .slice(0, pkg.total_lessons ?? 0);
}

// price minus deductible ("pending") leaves minus any credit carried in
// from an earlier package — same math as packages.html's effectivePrice.
function exportEffectivePrice(pkg, lessons, incomingCreditAmount) {
  if (!pkg.total_lessons) return pkg.price ?? 0;
  const perLessonPrice = pkg.price / pkg.total_lessons;
  const ownDeduction = lessons.filter(exportIsDeductible).length * perLessonPrice;
  return Math.max(0, pkg.price - ownDeduction - (incomingCreditAmount ?? 0));
}

function exportExtraFeeTotal(lessons) {
  return lessons
    .filter(l => l?.make_up_status === "combined_with_private" && l?.make_up_extra_fee != null)
    .reduce((sum, l) => sum + Number(l.make_up_extra_fee), 0);
}

function buildAttendanceSheetRows(data) {
  const rows = [];
  const classesSorted = [...data.classes].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  for (const cls of classesSorted) {
    const classAppointments = data.appointments
      .filter(a => a.class_id === cls.id)
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
    if (!classAppointments.length) continue;

    const studentIds = [...new Set(data.packages.filter(p => p.class_id === cls.id).map(p => p.student_id))];
    const studentsInClass = studentIds
      .map(id => ({ id, name: data.studentsById.get(id) ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
    if (!studentsInClass.length) continue;

    rows.push([cls.name ?? ""]);
    rows.push(["日期", ...studentsInClass.map(s => s.name)]);
    for (const appt of classAppointments) {
      const dateLabel = new Date(appt.scheduled_start).toLocaleString(localeForDates(), { dateStyle: "medium", timeStyle: "short" });
      rows.push([
        dateLabel,
        ...studentsInClass.map(s => exportAttendanceSymbol(data.attendanceByApptAndStudent.get(`${appt.id}:${s.id}`))),
      ]);
    }
    rows.push([]);
  }
  return rows.length ? rows : [["冇小組課資料"]];
}

function buildPaymentSheetRows(data) {
  const rows = [];
  const classesSorted = [...data.classes].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  // Incoming deferred credits: an attendance row that logs a credit
  // consumed by a specific later package — same cross-reference
  // packages.html itself uses, computed here from the attendance rows
  // already in hand instead of a fresh query.
  const incomingCreditByPackage = new Map();
  for (const a of data.attendance) {
    if (!a.deferred_credit_used_in_package_id) continue;
    incomingCreditByPackage.set(
      a.deferred_credit_used_in_package_id,
      (incomingCreditByPackage.get(a.deferred_credit_used_in_package_id) ?? 0) + (a.deferred_credit_amount ?? 0),
    );
  }

  // Matches packages.html's own Payments tab exactly: one row per STUDENT
  // (summed across every term/renewal package they've had in that class),
  // same five columns in the same order — 學生/期數/總金額/額外費用/已付.
  for (const cls of classesSorted) {
    const classPackages = data.packages.filter(p => p.class_id === cls.id);
    if (!classPackages.length) continue;

    rows.push([cls.name ?? ""]);
    rows.push(["學生", "期數", "總金額", "額外費用", "已付"]);

    const byStudent = new Map();
    for (const pkg of classPackages) {
      if (!byStudent.has(pkg.student_id)) byStudent.set(pkg.student_id, []);
      byStudent.get(pkg.student_id).push(pkg);
    }
    const studentIds = [...byStudent.keys()].sort((a, b) =>
      (data.studentsById.get(a) ?? "").localeCompare(data.studentsById.get(b) ?? "", "zh-Hant"));

    for (const studentId of studentIds) {
      const pkgs = byStudent.get(studentId);
      let totalAmount = 0, totalExtraFee = 0, paidCount = 0, lessonCount = 0;
      for (const pkg of pkgs) {
        const classAppointments = data.appointments.filter(a => a.class_id === pkg.class_id);
        const lessons = exportPackageLessonAppointments(classAppointments, pkg)
          .map(a => data.attendanceByApptAndStudent.get(`${a.id}:${pkg.student_id}`))
          .filter(Boolean);
        totalAmount += exportEffectivePrice(pkg, lessons, incomingCreditByPackage.get(pkg.id));
        totalExtraFee += exportExtraFeeTotal(lessons);
        paidCount += lessons.filter(l => l.paid).length;
        lessonCount += pkg.total_lessons ?? 0;
      }
      rows.push([
        data.studentsById.get(studentId) ?? "", pkgs.length, Math.round(totalAmount),
        totalExtraFee > 0 ? `+$${Math.round(totalExtraFee)}` : "—", `${paidCount} / ${lessonCount}`,
      ]);
    }
    rows.push([]);
  }
  return rows.length ? rows : [["冇小組課資料"]];
}

// ---------- Toast + custom confirm/prompt (replacing native alert/confirm/prompt) ----------
// Shared across every page via this one file, matching the app's own
// styling instead of a jarring native browser popup.

function showToast(message, type = "default", duration = 2500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, duration);
}

// Yes/No confirm — replaces confirm() for destructive actions.
function showConfirm(message, { danger = true } = {}) {
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = "confirm-dialog";
    dlg.innerHTML = `
      <p class="confirm-message"></p>
      <div class="confirm-actions">
        <button type="button" class="confirm-cancel">${t("common.cancel")}</button>
        <button type="button" class="confirm-ok ${danger ? "danger" : "primary"}">${t("common.confirm")}</button>
      </div>`;
    dlg.querySelector(".confirm-message").textContent = message;
    document.body.appendChild(dlg);
    dlg.showModal();
    function cleanup(result) {
      dlg.close();
      dlg.addEventListener("close", () => dlg.remove(), { once: true });
      resolve(result);
    }
    dlg.querySelector(".confirm-cancel").addEventListener("click", () => cleanup(false));
    dlg.querySelector(".confirm-ok").addEventListener("click", () => cleanup(true));
    dlg.addEventListener("cancel", () => cleanup(false)); // Esc key
  });
}

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

  const exportBtn = document.getElementById("settings-export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      exportBtn.disabled = true;
      const originalLabel = exportBtn.textContent;
      exportBtn.textContent = t("settings.exporting");

      try {
        // Paged through in full rather than a single select("*") — Supabase's
        // REST API caps a single request at 1000 rows, which would otherwise
        // silently truncate a large table instead of erroring.
        const PAGE_SIZE = 1000;
        async function fetchAllRows(buildQuery) {
          const rows = [];
          for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
            if (error) throw new Error(error.message);
            rows.push(...(data ?? []));
            if (!data || data.length < PAGE_SIZE) break;
          }
          return rows;
        }

        // Group classes only, per Angela's request — students/contacts get
        // filtered down to just the ones actually enrolled in a group
        // class, not every private student or WhatsApp lead in the system.
        const groupStudents = await fetchAllRows(() =>
          supabaseClient.from("students").select("*").eq("is_group", true));
        const groupStudentIds = groupStudents.map(s => s.id);
        const groupContactIds = [...new Set(groupStudents.map(s => s.contact_id).filter(Boolean))];

        const [contacts, classes, packages, appointments, attendance] = await Promise.all([
          groupContactIds.length
            ? fetchAllRows(() => supabaseClient.from("contacts").select("*").in("id", groupContactIds))
            : [],
          fetchAllRows(() => supabaseClient.from("classes").select("*")),
          fetchAllRows(() => supabaseClient.from("packages").select("*")),
          fetchAllRows(() => supabaseClient.from("appointments").select("*").eq("type", "group_class")),
          groupStudentIds.length
            ? fetchAllRows(() => supabaseClient.from("attendance").select("*").in("student_id", groupStudentIds))
            : [],
        ]);
        const contactLabel = (c) => c?.name || c?.whatsapp_number || "";
        const contactsById = new Map(contacts.map(c => [c.id, contactLabel(c)]));
        const studentsById = new Map(groupStudents.map(s => [s.id, contactsById.get(s.contact_id) ?? ""]));
        const attendanceByApptAndStudent = new Map(attendance.map(a => [`${a.appointment_id}:${a.student_id}`, a]));

        const data = { classes, packages, appointments, attendance, studentsById, attendanceByApptAndStudent };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildAttendanceSheetRows(data)), "Attendance");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildPaymentSheetRows(data)), "Payment");

        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `violin-studio-backup-${today}.xlsx`);
        showToast(t("settings.export_done"), "success");
      } catch (err) {
        showToast(tf("settings.export_failed", { detail: err.message }), "error");
      } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = originalLabel;
      }
    });
  }
}
