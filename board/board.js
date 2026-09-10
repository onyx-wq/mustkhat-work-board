(() => {
  "use strict";
  const API =
    "https://jhcapqpulonokzpuojmy.supabase.co/functions/v1/team-reporting/board";
  const labels = {
    in_progress: "진행 중",
    open: "시작 전",
    waiting: "대기 중 (A2)",
    blocked: "막힘",
    completed: "완료",
    cancelled: "취소",
  };
  const transitions = {
    open: ["in_progress", "cancelled"],
    in_progress: ["open", "blocked", "completed", "cancelled"],
    blocked: ["in_progress", "cancelled"],
    waiting: [],
    completed: [],
    cancelled: [],
  };
  const names = {
    U07G9TQTJDC: "전영찬",
    U06V2FAGQCD: "오환",
    U0APY9W912P: "박찬우",
    U089T883KMF: "포키",
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
    !managed(item) &&
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
    const raw = item.ownerName || "담당 미상";
    return names[raw.replace(/^<@|>$/g, "")] || raw;
  }
  function render() {
    if (!state) return;
    const columns = document.createDocumentFragment();
    for (const status of ["in_progress", "open", "waiting", "blocked"]) {
      const items = state.items.filter((item) => item.status === status);
      const column = node("section", "column");
      column.dataset.target = status;
      column.id = `board-column-${status}`;
      const header = node("div", "column-header");
      header.append(
        node("span", "dot"),
        node("h2", "", labels[status]),
        node("span", "count", String(items.length)),
      );
      const cards = node("div", "cards");
      for (const item of items) {
        const card = node("article", "card");
        card.dataset.id = item.id;
        card.draggable =
          !busy && !managed(item) && Object.keys(item.moves || {}).length > 0;
        card.append(node("h3", "", item.title));
        const meta = node("div", "card-meta");
        const name = owner(item);
        meta.append(
          node("span", "avatar", name.slice(0, 1)),
          node("span", "", name),
        );
        if (item.dueDate) {
          const today = new Date().toLocaleDateString("sv-SE");
          const due = node("span", "due", `마감 ${item.dueDate}`);
          if (item.dueDate <= today) due.classList.add("urgent");
          meta.append(due);
        }
        card.append(meta);
        if (managed(item))
          card.append(node("p", "managed", "A2 연동 · /wait에서 처리"));
        else {
          const select = node("select");
          select.setAttribute("aria-label", `${item.title} 상태 이동`);
          select.disabled = busy;
          select.append(new Option("상태 이동…", ""));
          for (const target of transitions[item.status] || [])
            if (allowed(item, target))
              select.append(new Option(labels[target], target));
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
            managed(item) ||
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
        cards.append(card);
      }
      if (!items.length)
        cards.append(node("p", "empty", "등록된 업무가 없습니다"));
      column.append(header, cards);
      columns.append(column);
    }
    $("board-columns").replaceChildren(columns);
    $("board-columns").setAttribute("aria-busy", String(busy));
    const closed = document.createDocumentFragment();
    for (const item of state.completed) {
      const row = node("div", "closed-row");
      row.dataset.id = item.id;
      row.append(
        node("span", `closed-label ${item.status}`, labels[item.status]),
        node("span", "closed-title", item.title),
        node("span", "owner", owner(item)),
      );
      closed.append(row);
    }
    if (!state.completed.length)
      closed.append(node("p", "empty", "최근 종료된 업무가 없습니다"));
    $("closed-list").replaceChildren(closed);
    $("closed-count").textContent = String(state.completed.length);
    $("sync-status").textContent =
      `${new Date(state.generatedAt).toLocaleString("ko-KR", { hour12: false })} 기준`;
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
      notice("슬랙에서 받은 업무 보드 링크를 열어 주세요.");
      $("sync-status").textContent = "서명 링크 필요";
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
            ? "링크 권한을 확인해 주세요."
            : "갱신하지 못했습니다. 기존 화면을 유지하며 다시 시도합니다.",
        );
      const data = await response.json();
      if (!Array.isArray(data.items) || !Array.isArray(data.completed))
        throw new Error("보드 응답을 확인하지 못했습니다.");
      if (started !== epoch) return;
      if (held()) deferred = data;
      else {
        state = data;
        render();
      }
    } catch (error) {
      if (started === epoch) {
        notice(error.message || "연결을 확인해 주세요.");
        $("sync-status").textContent = state
          ? `갱신 지연 · ${new Date(state.generatedAt).toLocaleString("ko-KR")} 기준`
          : "연결 실패";
      }
    } finally {
      loading = false;
    }
  }
  function confirmFinish(item, target) {
    $("finish-title").textContent = `업무를 ${labels[target]}할까요?`;
    $("finish-description").textContent =
      `“${item.title}” 업무가 최근 종료로 이동합니다. 보드에서는 되돌릴 수 없습니다.`;
    $("finish-confirm").textContent = labels[target];
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
    if (!allowed(item, target)) {
      notice("현재 상태에서 이동할 수 없는 칸입니다.");
      endDrag();
      return;
    }
    busy = true;
    ++epoch;
    deferred = null;
    endDrag();
    if (
      ["completed", "cancelled"].includes(target) &&
      !(await confirmFinish(item, target))
    ) {
      busy = false;
      render();
      load();
      return;
    }
    const before = structuredClone(state);
    state.items = state.items.filter((card) => card.id !== item.id);
    const moved = { ...item, status: target, moves: {} };
    if (["completed", "cancelled"].includes(target))
      state.completed = [moved, ...state.completed].slice(0, 12);
    else state.items.unshift(moved);
    render();
    $("sync-status").textContent = "변경 저장 중…";
    notice("");
    try {
      const actionUrl = new URL(item.moves[target]);
      if (
        actionUrl.origin !== url.origin ||
        actionUrl.pathname !== `${url.pathname}/action`
      )
        throw new Error("잘못된 이동 주소입니다.");
      const response = await fetch(actionUrl, {
        method: "POST",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || "저장하지 못했습니다.");
      notice(`${labels[target]} 상태로 옮겼습니다.`);
    } catch (error) {
      state = before;
      notice(
        `${error.message} 화면을 원래 칸으로 되돌렸습니다. 서버 상태를 다시 확인합니다.`,
      );
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
  $("refresh").addEventListener("click", load);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load();
  });
  window.addEventListener("online", load);
  setInterval(load, 9000);
  load();
})();
