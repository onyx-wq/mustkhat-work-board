(() => {
  "use strict";
  const API =
    "https://jhcapqpulonokzpuojmy.supabase.co/functions/v1/team-reporting/board";
  const A2_DONE_BASE =
    "https://jhcapqpulonokzpuojmy.supabase.co/functions/v1/waiting-tracker/done";

  // ── 언어(한국어/태국어) — 2026-09-10 사용자 요구: 상단 토글로 전환 ──────────
  const STRINGS = {
    ko: {
      title: "팀 업무 보드",
      description: "업무를 옮기며 팀의 흐름을 확인하세요.",
      loading: "보드를 불러오는 중…",
      refresh: "새로고침",
      footnote:
        "9초마다 갱신 · A2 업무는 /wait에서 처리 · 카드 순서는 최근 변경순",
      columns: {
        open: "시작 전",
        in_progress: "진행 중",
        waiting: "대기 중(A2)",
        blocked: "막힘",
        completed: "완료",
        cancelled: "취소",
      },
      moveLabel: "상태 이동…",
      moveAria: (title) => `${title} 상태 이동`,
      a2Reply: "회신 완료",
      a2Done: "작업 완료",
      a2Managed: "A2 연동 · 처리 완료",
      empty: "등록된 업무가 없습니다",
      unowned: "담당 미상",
      due: (date) => `마감 ${date}`,
      detailAria: (title) => `${title} 상세 보기`,
      detailOwner: "담당자",
      detailDue: "마감",
      detailStatus: "상태",
      detailDueUnset: "미정",
      detailClose: "닫기",
      detailNoBody: "적어 둔 상세 내용이 없습니다.",
      dueUnset: "마감 미정",
      descriptionReadOnly: "팀의 업무 흐름을 확인하세요. (보기 전용)",
      needLink: "슬랙에서 받은 업무 보드 링크를 열어 주세요.",
      needLinkStatus: "서명 링크 필요",
      forbidden: "링크 권한을 확인해 주세요.",
      refreshFailed:
        "갱신하지 못했습니다. 기존 화면을 유지하며 다시 시도합니다.",
      badResponse: "보드 응답을 확인하지 못했습니다.",
      connectionCheck: "연결을 확인해 주세요.",
      connectionFailed: "연결 실패",
      delayedStatus: (date) => `갱신 지연 · ${date} 기준`,
      syncedStatus: (date) => `${date} 기준`,
      savingStatus: "변경 저장 중…",
      cantMoveHere: "현재 상태에서 이동할 수 없는 칸입니다.",
      badMoveUrl: "잘못된 이동 주소입니다.",
      saveFailed: "저장하지 못했습니다.",
      movedTo: (label) => `팀 업무 보드 · ${label} 상태로 옮겼습니다.`,
      reverted: (message) =>
        `${message} 화면을 원래 칸으로 되돌렸습니다. 서버 상태를 다시 확인합니다.`,
      badActionUrl: "잘못된 처리 주소입니다.",
      actionFailed: "처리하지 못했습니다.",
      repliedDone: "회신 완료로 처리했습니다.",
      workDone: "작업 완료로 처리했습니다.",
      recheck: (message) => `${message} 화면을 다시 확인합니다.`,
      confirmTitle: (label) => `${label} 처리할까요?`,
      confirmMoveBody: (title) =>
        `“${title}” 업무가 완료 칸으로 이동합니다. 보드에서는 되돌릴 수 없습니다.`,
      confirmA2Body: (title) =>
        `“${title}” 항목이 A2에서 최종 완료 처리됩니다. 되돌릴 수 없습니다.`,
      dialogBack: "돌아가기",
      dialogConfirm: "확인",
      addTask: "+ 새 업무",
      addDialogTitle: "새 업무 등록",
      addTitleLabel: "업무 제목",
      addDescriptionLabel: "업무 내용",
      addDescriptionPlaceholder: "무엇을, 어디까지 하면 되는지 적어 주세요. (선택)",
      addDueLabel: "마감일",
      addDueHint: "비워 두면 '마감 미정'으로 올라갑니다.",
      addTitlePlaceholder: "예: 상세페이지 초안 작업",
      addAssigneeLabel: "담당자",
      addConfirm: "등록",
      addTitleRequired: "업무 제목을 입력해 주세요.",
      addCreating: "등록 중…",
      addCreated: (title) => `“${title}” 업무를 등록했습니다.`,
      addAssigned: (title, name) =>
        `“${title}” 업무를 ${name}님에게 배정하고 알림을 보냈습니다.`,
      addFailed: "등록하지 못했습니다.",
    },
    th: {
      title: "บอร์ดงานทีม",
      description: "ลากการ์ดงานเพื่อดูความคืบหน้าของทีม",
      loading: "กำลังโหลดบอร์ด…",
      refresh: "รีเฟรช",
      footnote:
        "รีเฟรชทุก 9 วินาที · งาน A2 จัดการผ่าน /wait · เรียงตามการเปลี่ยนแปลงล่าสุด",
      columns: {
        open: "ยังไม่เริ่ม",
        in_progress: "กำลังทำ",
        waiting: "รอ A2",
        blocked: "ติดขัด",
        completed: "เสร็จแล้ว",
        cancelled: "ยกเลิก",
      },
      moveLabel: "ย้ายสถานะ…",
      moveAria: (title) => `ย้ายสถานะ ${title}`,
      a2Reply: "ตอบกลับแล้ว",
      a2Done: "งานเสร็จแล้ว",
      a2Managed: "เชื่อม A2 · ดำเนินการเสร็จแล้ว",
      empty: "ยังไม่มีงานที่บันทึกไว้",
      unowned: "ไม่ระบุผู้รับผิดชอบ",
      due: (date) => `ครบกำหนด ${date}`,
      detailAria: (title) => `ดูรายละเอียดของ ${title}`,
      detailOwner: "ผู้รับผิดชอบ",
      detailDue: "ครบกำหนด",
      detailStatus: "สถานะ",
      detailDueUnset: "ไม่ระบุ",
      detailClose: "ปิด",
      detailNoBody: "ยังไม่มีรายละเอียดเพิ่มเติม",
      dueUnset: "ไม่ระบุกำหนด",
      descriptionReadOnly: "ดูความคืบหน้างานของทีม (โหมดดูอย่างเดียว)",
      needLink: "กรุณาเปิดลิงก์บอร์ดงานที่ได้รับจาก Slack",
      needLinkStatus: "ต้องใช้ลิงก์ที่มีลายเซ็น",
      forbidden: "กรุณาตรวจสอบสิทธิ์ของลิงก์",
      refreshFailed: "รีเฟรชไม่สำเร็จ จะลองใหม่โดยคงหน้าจอเดิมไว้",
      badResponse: "ไม่สามารถตรวจสอบข้อมูลบอร์ดได้",
      connectionCheck: "กรุณาตรวจสอบการเชื่อมต่อ",
      connectionFailed: "เชื่อมต่อไม่สำเร็จ",
      delayedStatus: (date) => `รีเฟรชล่าช้า · ข้อมูล ณ ${date}`,
      syncedStatus: (date) => `ข้อมูล ณ ${date}`,
      savingStatus: "กำลังบันทึกการเปลี่ยนแปลง…",
      cantMoveHere: "ย้ายไปช่องนี้จากสถานะปัจจุบันไม่ได้",
      badMoveUrl: "ที่อยู่สำหรับย้ายไม่ถูกต้อง",
      saveFailed: "บันทึกไม่สำเร็จ",
      movedTo: (label) => `บอร์ดงานทีม · ย้ายไปสถานะ ${label} แล้ว`,
      reverted: (message) =>
        `${message} ย้ายกลับช่องเดิมแล้ว กำลังตรวจสอบสถานะจากเซิร์ฟเวอร์อีกครั้ง`,
      badActionUrl: "ที่อยู่สำหรับดำเนินการไม่ถูกต้อง",
      actionFailed: "ดำเนินการไม่สำเร็จ",
      repliedDone: "บันทึกเป็นตอบกลับแล้ว",
      workDone: "บันทึกเป็นงานเสร็จแล้ว",
      recheck: (message) => `${message} กำลังตรวจสอบหน้าจออีกครั้ง`,
      confirmTitle: (label) => `ยืนยัน "${label}" หรือไม่?`,
      confirmMoveBody: (title) =>
        `งาน “${title}” จะย้ายไปช่องเสร็จสิ้น ย้อนกลับในบอร์ดนี้ไม่ได้`,
      confirmA2Body: (title) =>
        `รายการ “${title}” จะถูกปิดงานถาวรใน A2 ย้อนกลับไม่ได้`,
      dialogBack: "กลับ",
      dialogConfirm: "ยืนยัน",
      addTask: "+ งานใหม่",
      addDialogTitle: "เพิ่มงานใหม่",
      addTitleLabel: "ชื่องาน",
      addDescriptionLabel: "รายละเอียดงาน",
      addDescriptionPlaceholder: "ระบุว่าต้องทำอะไรและถึงขั้นไหน (ไม่บังคับ)",
      addDueLabel: "กำหนดส่ง",
      addDueHint: "เว้นว่างไว้จะขึ้นว่า \"ไม่ระบุกำหนด\"",
      addTitlePlaceholder: "เช่น ร่างหน้ารายละเอียดสินค้า",
      addAssigneeLabel: "ผู้รับผิดชอบ",
      addConfirm: "บันทึก",
      addTitleRequired: "กรุณากรอกชื่องาน",
      addCreating: "กำลังบันทึก…",
      addCreated: (title) => `บันทึกงาน “${title}” แล้ว`,
      addAssigned: (title, name) =>
        `มอบหมายงาน “${title}” ให้ ${name} และส่งการแจ้งเตือนแล้ว`,
      addFailed: "บันทึกไม่สำเร็จ",
    },
  };
  let lang = localStorage.getItem("board-lang") === "th" ? "th" : "ko";
  const t = () => STRINGS[lang];

  // 2026-09-10 사용자 요구("이거랑 맞춰져야하는데, 안맞아"): 웹 보드를 슬랙 DM
  // 보고서와 같은 핵심 칸을 보여준다. A2 원본 대기는 별도 칸을 만들지 않고
  // 진행 중 흐름에서 A2 버튼으로 처리한다. 완료·취소된 카드도 다시 활성 칸으로
  // 되돌릴 수 있게 한다.
  const COLUMN_ORDER = ["open", "in_progress", "blocked", "completed", "cancelled"];
  const inColumn = (item, column) =>
    column === "in_progress"
      ? item.status === "in_progress" || item.status === "waiting"
      : item.status === column;
  const transitions = {
    open: ["in_progress", "blocked", "completed", "cancelled"],
    in_progress: ["open", "blocked", "completed", "cancelled"],
    blocked: ["open", "in_progress", "completed", "cancelled"],
    waiting: ["open", "in_progress", "blocked", "completed", "cancelled"],
    completed: ["open", "in_progress", "blocked", "cancelled"],
    cancelled: ["open", "in_progress", "blocked", "completed"],
  };
  const names = {
    U07G9TQTJDC: "전영찬",
    U06V2FAGQCD: "오환",
    U0APY9W912P: "박찬우",
    U089T883KMF: "포키",
  };
  // 사람 이름은 뜻을 옮기는 게 아니라 정해진 표기를 쓰는 것이라 AI 번역에 맡기지 않고
  // 여기 고정한다(2026-09-15). 모르는 사람은 한국어 표기를 그대로 보여준다.
  const namesTh = {
    U07G9TQTJDC: "ยองชาน",
    U06V2FAGQCD: "ฮวาน",
    U0APY9W912P: "ชานอู",
    U089T883KMF: "นริศรา",
  };
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const url = new URL(API);
  url.search = new URLSearchParams({
    v: params.get("v") || "",
    sig: params.get("sig") || "",
    format: "json",
  });
  let state = null,
    dragging = null,
    busy = false,
    loading = false,
    deferred = null,
    epoch = 0;
  const managed = (item) => item.externalId?.startsWith("wait:");
  const allowed = (item, target) =>
    transitions[item.status]?.includes(target) &&
    !!item.moves?.[target];
  const held = () =>
    dragging || busy || document.activeElement?.tagName === "SELECT";
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function notice(message) {
    $("notice").textContent = message;
    $("notice").hidden = !message;
  }
  function owner(item) {
    const raw = item.ownerName || t().unowned;
    const id = raw.replace(/^<@|>$/g, "");
    if (lang === "th") return namesTh[id] || names[id] || raw;
    return names[id] || raw;
  }
  // 태국어 화면에서는 번역된 제목을 쓴다. 아직 번역이 안 됐거나 실패했으면 한국어
  // 원문을 그대로 보여준다 — 번역이 멈춰도 보드는 계속 읽을 수 있어야 한다.
  function cardTitle(item) {
    return lang === "th" && item.titleTh ? item.titleTh : item.title;
  }
  function cardDescription(item) {
    return (lang === "th" && item.descriptionTh) || item.description || "";
  }
  // 2026-09-16: 이제 '업무 내용'을 따로 받아 저장하므로 그게 있으면 그걸 쓴다.
  // 그 전에 등록된 업무는 지시문 전체가 제목에 들어가 있어(카드 하나가 아홉 줄이었다)
  // "짧은 제목 — 긴 설명" 형태면 갈라서 보여준다. 옛 데이터를 위한 폴백이다.
  const TITLE_SPLIT = /\s[—–]\s/u;
  const TITLE_HEAD_MAX = 40;
  function splitTitle(item) {
    const full = cardTitle(item) || "";
    const saved = cardDescription(item);
    if (saved) return { head: full, body: saved };
    const match = TITLE_SPLIT.exec(full);
    if (!match) return { head: full, body: "" };
    const head = full.slice(0, match.index).trim();
    const body = full.slice(match.index + match[0].length).trim();
    // 앞부분이 제목이라기엔 길면 나누지 않는다 — 억지로 자르면 뜻이 끊긴다.
    if (!head || !body || head.length > TITLE_HEAD_MAX)
      return { head: full, body: "" };
    return { head, body };
  }
  // 카드 상세 모달 — 카드에서는 두 줄만 보여주고, 전문은 여기서 읽는다.
  function openDetail(item, column) {
    const dialog = $("detail-dialog");
    if (!dialog) return;
    const { head, body } = splitTitle(item);
    $("detail-title").textContent = head;
    const rows = [
      [t().detailStatus, t().columns[column || item.status] || item.status],
      [t().detailOwner, owner(item)],
      [t().detailDue, item.dueDate || t().detailDueUnset],
    ];
    $("detail-meta").replaceChildren(
      ...rows.flatMap(([label, value]) => [
        node("dt", "", label),
        node("dd", "", value),
      ]),
    );
    const bodyEl = $("detail-body");
    bodyEl.textContent = body || t().detailNoBody;
    bodyEl.classList.toggle("empty-body", !body);
    $("detail-close").textContent = t().detailClose;
    dialog.showModal();
  }
  function buildActiveCard(item, { showA2Tag = true, column = null } = {}) {
    const card = node("article", "card");
    card.dataset.id = item.id;
    card.draggable =
      !busy && Object.keys(item.moves || {}).length > 0;
    const { head, body } = splitTitle(item);
    card.append(node("h3", "", head));
    if (body) card.append(node("p", "card-desc", body));
    // 2026-09-16 대표님 지시: 카드 안에서 펼치지 않고, 카드를 누르면 상세 모달을 띄운다.
    card.tabIndex = 0;
    card.setAttribute("aria-haspopup", "dialog");
    card.setAttribute("aria-label", t().detailAria(head));
    card.addEventListener("click", (event) => {
      // 상태 이동 select·A2 버튼을 누른 건 카드를 연 게 아니다.
      if (event.target.closest("select, button, option")) return;
      if (dragging) return;
      openDetail(item, column);
    });
    card.addEventListener("keydown", (event) => {
      if (event.target !== card) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDetail(item, column);
    });
    const meta = node("div", "card-meta");
    if (showA2Tag && managed(item)) meta.append(node("span", "a2-tag", "A2"));
    const name = owner(item);
    meta.append(
      node("span", "avatar", name.slice(0, 1)),
      node("span", "", name),
    );
    // 2026-09-15 대표님 지시: 시작 전·진행 중·막힘·완료 칸에서도 마감을 취소 칸처럼
    // 항상 보이게 한다. 마감일이 없는 업무는 빈칸으로 두지 않고 '마감 미정'으로 적는다.
    if (item.dueDate) {
      const today = new Date().toLocaleDateString("sv-SE");
      const due = node("span", "due", t().due(item.dueDate));
      if (item.dueDate <= today) due.classList.add("urgent");
      meta.append(due);
    } else {
      meta.append(node("span", "due unset", t().dueUnset));
    }
    card.append(meta);
    if (managed(item) && !["completed", "cancelled"].includes(item.status)) {
      const actions = node("div", "actions");
      if (item.a2Actions?.reply) {
        const btn = node("button", "a2-reply", t().a2Reply);
        btn.type = "button";
        btn.disabled = busy;
        btn.addEventListener("click", () =>
          a2Action(item, "reply", item.a2Actions.reply),
        );
        actions.append(btn);
      }
      if (item.a2Actions?.done) {
        const btn = node("button", "a2-done", t().a2Done);
        btn.type = "button";
        btn.disabled = busy;
        btn.addEventListener("click", () =>
          a2Action(item, "done", item.a2Actions.done),
        );
        actions.append(btn);
      }
      if (actions.children.length) card.append(actions);
      else card.append(node("p", "managed", t().a2Managed));
    } else {
      const select = node("select");
      select.setAttribute("aria-label", t().moveAria(head));
      select.disabled = busy;
      select.append(new Option(t().moveLabel, ""));
      for (const target of transitions[item.status] || [])
        if (
          (!managed(item) ||
            ["completed", "cancelled"].includes(item.status)) &&
          transitions[item.status]?.includes(target) &&
          item.moves?.[target]
        )
          select.append(new Option(t().columns[target], target));
      select.addEventListener("change", () => {
        const target = select.value;
        select.value = "";
        select.blur();
        if (target) move(item, target);
      });
      select.addEventListener("blur", () => setTimeout(flush, 0));
      card.append(select);
    }
    card.addEventListener("dragstart", (event) => {
      if (
        !card.draggable ||
        busy ||
        event.target.closest("select")
      ) {
        event.preventDefault();
        return;
      }
      dragging = item;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
      card.classList.add("dragging");
      document
        .querySelectorAll("[data-target]")
        .forEach((zone) =>
          zone.classList.add(
            allowed(item, zone.dataset.target)
              ? "drop-allowed"
              : "drop-disabled",
          ),
        );
    });
    card.addEventListener("dragend", endDrag);
    return card;
  }
  function buildClosedCard(item, column = null) {
    const card = buildActiveCard(item, { showA2Tag: false, column });
    card.classList.add("closed");
    return card;
  }
  function renderChrome() {
    document.documentElement.lang = lang;
    // 2026-09-15: 열람은 팀 전원, 변경은 관리자만. 서버가 편집 권한이 없다고 알려주면
    // (canEdit=false · createUrl 없음) 눌러도 거절될 '새 업무' 버튼을 아예 숨긴다.
    // 카드의 이동 버튼·드래그는 서버가 moves를 비워 보내므로 저절로 사라진다.
    const readOnly = !!state && state.canEdit === false;
    $("board-title").textContent = t().title;
    $("board-description").textContent = readOnly
      ? t().descriptionReadOnly
      : t().description;
    $("add-task").hidden = readOnly;
    $("refresh").textContent = t().refresh;
    $("footnote").textContent = t().footnote;
    $("lang-ko").setAttribute("aria-pressed", String(lang === "ko"));
    $("lang-th").setAttribute("aria-pressed", String(lang === "th"));
    $("add-task").textContent = t().addTask;
    $("add-title").textContent = t().addDialogTitle;
    $("add-title-label").textContent = t().addTitleLabel;
    $("add-task-title").placeholder = t().addTitlePlaceholder;
    $("add-description-label").textContent = t().addDescriptionLabel;
    $("add-task-description").placeholder = t().addDescriptionPlaceholder;
    $("add-due-label").textContent = t().addDueLabel;
    $("add-due-hint").textContent = t().addDueHint;
    $("add-assignee-label").textContent = t().addAssigneeLabel;
    $("add-cancel").textContent = t().dialogBack;
    $("add-confirm").textContent = t().addConfirm;
    const assignee = $("add-task-assignee");
    const kept = assignee.value;
    // 2026-09-16 대표님 지적: 담당자 목록만 한국어로 남아 있었다. 카드의 담당자
    // 표기와 같은 표를 쓴다(namesTh → names 순 폴백).
    assignee.replaceChildren(
      ...Object.keys(names).map(
        (id) =>
          new Option(
            (lang === "th" && namesTh[id]) || names[id] || id,
            id,
          ),
      ),
    );
    assignee.value = kept;
  }
  function render() {
    renderChrome();
    if (!state) return;
    const columns = document.createDocumentFragment();
    for (const column of COLUMN_ORDER) {
      const items = ["completed", "cancelled"].includes(column)
        ? state.completed.filter((item) => item.status === column)
        : state.items.filter((item) => inColumn(item, column));
      const section = node("section", "column");
      section.id = `board-column-${column}`;
      const header = node("div", "column-header");
      header.append(
        node("span", "dot"),
        node("h2", "", t().columns[column]),
        node("span", "count", String(items.length)),
      );
      const cards = node("div", "cards");
      // 완료 칸의 카드도 buildClosedCard를 통해 다시 활성 칸으로 옮길 수 있다.
      section.dataset.target = column;
      for (const item of items)
        cards.append(
          ["completed", "cancelled"].includes(column)
            ? buildClosedCard(item, column)
            : buildActiveCard(item, { column }),
        );
      if (!items.length) cards.append(node("p", "empty", t().empty));
      section.append(header, cards);
      columns.append(section);
    }
    $("board-columns").replaceChildren(columns);
    $("board-columns").setAttribute("aria-busy", String(busy));
    $("sync-status").textContent = t().syncedStatus(
      new Date(state.generatedAt).toLocaleString(
        lang === "th" ? "th-TH" : "ko-KR",
        {
          hour12: false,
        },
      ),
    );
    $("refresh").disabled = busy;
  }
  function flush() {
    if (!held() && deferred) {
      state = deferred;
      deferred = null;
      render();
    }
  }
  function endDrag() {
    dragging = null;
    document
      .querySelectorAll(".dragging,.drop-allowed,.drop-disabled,.drop-over")
      .forEach((el) =>
        el.classList.remove(
          "dragging",
          "drop-allowed",
          "drop-disabled",
          "drop-over",
        ),
      );
    flush();
  }
  async function load() {
    if (loading || busy || document.hidden) return;
    if (!params.get("v") || !params.get("sig")) {
      notice(t().needLink);
      $("sync-status").textContent = t().needLinkStatus;
      return;
    }
    loading = true;
    const started = epoch;
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401 || response.status === 403
            ? t().forbidden
            : t().refreshFailed,
        );
      const data = await response.json();
      if (!Array.isArray(data.items) || !Array.isArray(data.completed))
        throw new Error(t().badResponse);
      if (started !== epoch) return;
      if (held()) deferred = data;
      else {
        state = data;
        render();
      }
    } catch (error) {
      if (started === epoch) {
        notice(error.message || t().connectionCheck);
        $("sync-status").textContent = state
          ? t().delayedStatus(
              new Date(state.generatedAt).toLocaleString(
                lang === "th" ? "th-TH" : "ko-KR",
              ),
            )
          : t().connectionFailed;
      }
    } finally {
      loading = false;
    }
  }
  function confirmFinish(label, description) {
    $("finish-title").textContent = t().confirmTitle(label);
    $("finish-description").textContent = description;
    $("finish-confirm").textContent = label;
    $("finish-cancel").textContent = t().dialogBack;
    const dialog = $("finish-dialog");
    dialog.returnValue = "";
    dialog.showModal();
    return new Promise((resolve) =>
      dialog.addEventListener(
        "close",
        () => resolve(dialog.returnValue === "confirm"),
        { once: true },
      ),
    );
  }
  async function move(item, target) {
    if (busy) return;
    if (!item.moves?.[target]) {
      notice(t().cantMoveHere);
      endDrag();
      return;
    }
    busy = true;
    ++epoch;
    deferred = null;
    endDrag();
    if (
      ["completed", "cancelled"].includes(target) &&
      !(await confirmFinish(
        t().columns[target],
        t().confirmMoveBody(cardTitle(item)),
      ))
    ) {
      busy = false;
      render();
      load();
      return;
    }
    const before = structuredClone(state);
    state.items = state.items.filter((card) => card.id !== item.id);
    state.completed = state.completed.filter((card) => card.id !== item.id);
    const moved = { ...item, status: target, moves: {} };
    if (["completed", "cancelled"].includes(target))
      state.completed = [moved, ...state.completed].slice(0, 12);
    else state.items.unshift(moved);
    render();
    $("sync-status").textContent = t().savingStatus;
    notice("");
    try {
      const actionUrl = new URL(item.moves[target]);
      if (
        actionUrl.origin !== url.origin ||
        actionUrl.pathname !== `${url.pathname}/action`
      )
        throw new Error(t().badMoveUrl);
      const response = await fetch(actionUrl, {
        method: "POST",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || t().saveFailed);
      notice(t().movedTo(t().columns[target]));
    } catch (error) {
      state = before;
      notice(t().reverted(error.message));
    } finally {
      busy = false;
      render();
      load();
    }
  }
  // A2(waiting-tracker) [회신 완료]/[작업 완료] — team-reporting의 move()와 다른
  // 엔드포인트(waiting-tracker/done)를 부른다. A2 원본이 진짜 소스이므로 이 보드는
  // 결과를 낙관적으로 미리 그리지 않고, 처리 후 항상 서버에서 다시 불러온다.
  async function a2Action(item, kind, actionUrl) {
    if (busy) return;
    if (
      kind === "done" &&
      !(await confirmFinish(t().a2Done, t().confirmA2Body(cardTitle(item))))
    )
      return;
    busy = true;
    ++epoch;
    deferred = null;
    render();
    $("sync-status").textContent = t().savingStatus;
    notice("");
    try {
      const target = new URL(actionUrl);
      const base = new URL(A2_DONE_BASE);
      if (target.origin !== base.origin || target.pathname !== base.pathname)
        throw new Error(t().badActionUrl);
      const response = await fetch(target, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || t().actionFailed);
      notice(kind === "reply" ? t().repliedDone : t().workDone);
    } catch (error) {
      notice(t().recheck(error.message));
    } finally {
      busy = false;
      render();
      load();
    }
  }
  document.addEventListener("dragover", (event) => {
    const zone = event.target.closest("[data-target]");
    if (dragging && zone && allowed(dragging, zone.dataset.target)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      zone.classList.add("drop-over");
    }
  });
  document.addEventListener("dragleave", (event) => {
    const zone = event.target.closest("[data-target]");
    if (zone && !zone.contains(event.relatedTarget))
      zone.classList.remove("drop-over");
  });
  document.addEventListener("drop", (event) => {
    if (!dragging) return;
    event.preventDefault();
    const item = dragging;
    const zone = event.target.closest("[data-target]");
    if (zone) move(item, zone.dataset.target);
    else endDrag();
  });
  // 2026-09-10 사용자 요구: "업무등록을 이 대시보드에서도 할 수 있게" — /task와
  // 같은 등록 로직(team-reporting의 registerWorkItem)을 이 보드에서 직접 호출한다.
  // 등록 주소(createUrl)는 서버가 보드 조회 응답에 이미 서명해서 내려준다.
  function openAddDialog() {
    if (busy || !state?.createUrl) return;
    $("add-task-title").value = "";
    $("add-task-description").value = "";
    $("add-task-due").value = "";
    $("add-task-assignee").value = "";
    const dialog = $("add-dialog");
    dialog.returnValue = "";
    dialog.showModal();
    $("add-task-title").focus();
  }
  async function submitAddTask() {
    const title = $("add-task-title").value.trim();
    if (!title) {
      notice(t().addTitleRequired);
      return;
    }
    const description = $("add-task-description").value.trim() || null;
    const dueDate = $("add-task-due").value || null;
    const assigneeSlackId = $("add-task-assignee").value || null;
    busy = true;
    render();
    $("sync-status").textContent = t().addCreating;
    notice("");
    try {
      const response = await fetch(state.createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ title, description, dueDate, assigneeSlackId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error || t().addFailed);
      notice(
        assigneeSlackId && result.assignee_notified
          ? t().addAssigned(
              title,
              (lang === "th" && namesTh[assigneeSlackId]) ||
                names[assigneeSlackId] ||
                assigneeSlackId,
            )
          : t().addCreated(title),
      );
    } catch (error) {
      notice(`${t().addFailed} ${error.message || ""}`.trim());
    } finally {
      busy = false;
      render();
      load();
    }
  }
  $("add-task").addEventListener("click", openAddDialog);
  $("add-dialog").addEventListener("close", () => {
    if ($("add-dialog").returnValue === "confirm") submitAddTask();
  });
  function setLang(next) {
    if (next === lang) return;
    lang = next;
    try {
      localStorage.setItem("board-lang", lang);
    } catch {
      // 저장 안 돼도(사생활 보호 모드 등) 이번 화면 전환 자체는 계속 동작한다.
    }
    render();
  }
  $("lang-ko").addEventListener("click", () => setLang("ko"));
  $("lang-th").addEventListener("click", () => setLang("th"));
  $("refresh").addEventListener("click", load);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load();
  });
  window.addEventListener("online", load);
  renderChrome();
  setInterval(load, 9000);
  load();
})();
