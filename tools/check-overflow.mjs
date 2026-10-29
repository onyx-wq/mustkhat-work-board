#!/usr/bin/env node
// 업무 보드 화면 넘침·겹침 자동 검사
//
// 2026-10-21 박찬우 PM 지적: 카드 상세 창에서 긴 제목이 닫기(×) 버튼을 덮었다(고친 커밋 5bef441).
// "앞으로 이렇게 되는 것들도 안 나오게 확실하게" — 그래서 같은 종류의 문제가 다시 생기면
// 바로 잡아 주는 검사를 둔다.
//
// 하는 일
//   1. board/index.html 을 읽어 board.js 대신 시험용 내용(아주 긴 한국어 제목·띄어쓰기 없는
//      주소·태국어·긴 이름)을 채우는 스크립트를 넣고, board.css 를 그대로 붙여 시험 화면을 만든다.
//   2. 맥의 Chrome 을 화면 없이(headless) 띄워 폭 380·768·960·1100·1280·1440 에서 보드·상세 창·대기 창·
//      추가 창·확인 창을 하나씩 열어 본다.
//   3. 각 화면에서 ① 버튼과 글자가 겹치는지 ② 칸 밖으로 넘치는지 ③ 창이 화면 밖으로 나가는지 본다.
//   문제가 있으면 어디·어떤 폭인지 적고 종료 코드 1, 없으면 "이상 없음" 과 0.
//
// 새로 설치할 것 없음 — node 22 이상(전역 WebSocket·fetch)과 Chrome 만 있으면 된다.
// 사용법은 tools/README.md.

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CSS_PATH = resolve(opt("--css", join(ROOT, "board/board.css")));
const HTML_PATH = resolve(opt("--html", join(ROOT, "board/index.html")));
const WIDTHS = opt("--widths", "380,768,960,1100,1280,1440").split(",").map(Number);
const HEIGHT = Number(opt("--height", "800"));
const KEEP = args.includes("--keep");
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (typeof WebSocket === "undefined") {
  console.error("node 22 이상이 필요합니다(전역 WebSocket). 지금: " + process.version);
  process.exit(2);
}
if (!existsSync(CHROME)) {
  console.error("Chrome 을 찾지 못했습니다: " + CHROME + "\nCHROME_PATH 로 위치를 알려 주세요.");
  process.exit(2);
}

// ─────────────────────────────────────────────────────────────
// 페이지 안에서 도는 부분 — 시험 내용 채우기와 검사. 문자열로 페이지에 넣는다.
// ─────────────────────────────────────────────────────────────
function inPage() {
  const LONG = {
    ko: "태국 쇼피·라자다·틱톡샵 세 곳의 지난달 매출을 상품별·날짜별로 모아 한국 본사 보고서 양식에 맞춰 다시 정리하고 빠진 주문 번호를 하나씩 확인해서 담당자에게 알려 주기 (긴급, 이번 주 금요일까지 반드시)",
    url: "https://seller.shopee.co.th/portal/sale/order?type=toship&source=all&sort_by=create_date&page=1&from=20261001&to=20261021&shop_id=1234567890abcdefghijklmnopqrstuvwxyz",
    th: "ตรวจสอบยอดขายของร้านค้าทั้งหมดบนช้อปปี้ลาซาด้าและติ๊กต๊อกช็อปของเดือนที่แล้วแล้วสรุปเป็นรายงานส่งให้สำนักงานใหญ่ที่เกาหลีภายในวันศุกร์นี้",
    word: "Supercalifragilisticexpialidocious_ImportShippingTFDARegistrationChecklistFinalFinalV2",
  };
  const NAME = "ปิยะพงษ์ ศรีสุวรรณวงศ์ไพบูลย์ (Piyapong Srisuwanwongpaiboon)";
  const BODY =
    LONG.ko + "\n\n" + LONG.url + "\n\n" + LONG.th + "\n\n" + LONG.word + "\n" + "줄 ".repeat(200);
  const $ = (id) => document.getElementById(id);
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  // board.js 의 render()·buildActiveCard() 가 그리는 구조를 본뜬다.
  function fillBoard(showNotice) {
    $("sync-status").textContent = "2026. 10. 21. 오후 4:50:12 기준";
    const cols = [
      ["open", "시작 전", [LONG.ko, LONG.url]],
      ["in_progress", "진행 중", [LONG.th, LONG.word]],
      ["blocked", "막힘", [LONG.url + " " + LONG.ko]],
      ["completed", "완료", [LONG.word + LONG.th]],
    ];
    const frag = document.createDocumentFragment();
    for (const [key, label, titles] of cols) {
      const section = node("section", "column");
      section.id = "board-column-" + key;
      section.dataset.target = key;
      const header = node("div", "column-header");
      header.append(node("span", "dot"), node("h2", "", label), node("span", "count", String(titles.length)));
      if (key === "completed") header.append(archiveButton("지난 완료"));
      const cards = node("div", "cards");
      for (const title of titles) {
        const card = node("article", "card" + (key === "completed" ? " closed" : ""));
        card.tabIndex = 0;
        card.append(node("h3", "", title), node("p", "card-desc", BODY));
        const meta = node("div", "card-meta");
        meta.append(node("span", "avatar", NAME.slice(0, 1)), node("span", "", NAME));
        meta.append(node("span", "due urgent", "마감 2026-10-21"), node("span", "due unset", "마감 미정"));
        card.append(meta);
        const select = node("select");
        select.append(new Option("상태 이동…", ""), new Option("진행 중", "in_progress"));
        card.append(select);
        cards.append(card);
      }
      section.append(header, cards);
      frag.append(section);
    }
    $("board-columns").replaceChildren(frag);
    $("board-columns").removeAttribute("aria-busy");
    // 알림 줄에는 카드 제목이 그대로 들어간다(board.js notice(t().deleted(head)) 등).
    // 창을 볼 때는 숨겨 두어 창 검사 결과가 보드 쪽 문제에 섞이지 않게 한다.
    const notice = $("notice");
    notice.hidden = !showNotice;
    notice.textContent = "「" + LONG.url + "」 업무를 삭제했습니다.";
  }

  // 2026-10-29: 완료 칸 머리의 「지난 완료」 단추(board.js archiveButton). 태국어가 더 길다.
  function archiveButton(label) {
    const b = node("button", "archive-button");
    b.type = "button";
    b.innerHTML = '<svg viewBox="0 0 16 16" width="13" height="13"></svg>';
    b.append(node("span", "", label));
    return b;
  }
  // 「지난 완료」 창(board.js openArchive): 달 제목 + 날짜·제목·담당자 줄.
  function fillArchive(title) {
    $("detail-title").textContent = "지난 완료";
    $("detail-meta").replaceChildren(node("dt", "", "기준"), node("dd", "", "지난달 이전에 끝난 일"));
    const list = node("div", "archive");
    for (const month of ["2026년 9월 · 12건", "กันยายน 2569 · 12 รายการ"]) {
      list.append(node("h3", "archive-month", month));
      for (const t of [title, LONG.word, LONG.th, "짧은 일"]) {
        const row = node("div", "archive-row");
        row.append(node("span", "archive-date", "09/28"), node("span", "archive-title", t), node("span", "archive-owner", NAME));
        list.append(row);
      }
    }
    const body = $("detail-body");
    body.classList.remove("empty-body");
    body.classList.add("archive-body");
    body.replaceChildren(list);
  }

  // 2026-10-22: 넓은 화면 전체 보기 = 사람별 줄(board.js renderLanes). 줄 안 카드는 마감과 상태 이동이
  // 한 줄이라 좁아지면 마감 글자가 잘렸다(박찬우 PM 「저번에도 이러더니」). 한국어·태국어 둘 다 본다.
  function fillLanes(lang) {
    fillBoard(false);
    const th = lang === "th";
    const due = th ? ["ครบกำหนด 2026-10-21", "ไม่ระบุกำหนด"] : ["마감 2026-10-21", "마감 미정"];
    const bar = $("person-filter");
    if (bar)
      bar.replaceChildren(
        ...[th ? "ทั้งหมด" : "전체", "Thanatporn", "Tanapon", "Athitaya", "Thassanee", "Wannasorn", "Pimkaew", "Teemapohn", "Natchar", NAME].map((n, i) => {
          const b = node("button", "chip");
          b.type = "button";
          b.append(node("span", "", n), node("span", "chip-count", String(14 - i)));
          return b;
        }),
      );
    const cols = ["open", "in_progress", "blocked", "completed"];
    const labels = th ? ["ยังไม่เริ่ม", "กำลังทำ", "ติดขัด", "เสร็จแล้ว"] : ["시작 전", "진행 중", "막힘", "완료"];
    const frag = document.createDocumentFragment();
    frag.append(node("div", "lane-corner"));
    cols.forEach((c, i) => {
      const h = node("div", "column-header lane-col");
      h.dataset.col = c;
      h.append(node("span", "dot"), node("h2", "", labels[i]), node("span", "count", "13"));
      if (c === "completed") h.append(archiveButton(th ? "ย้อนหลัง" : "지난 완료"));
      frag.append(h);
    });
    for (const person of [th ? "ถามหลายคน" : "여러 명에게 묻는 중", NAME, "Thanatporn"]) {
      const head = node("button", "lane-head");
      head.type = "button";
      head.append(node("span", "avatar", person.slice(0, 1)), node("span", "lane-name", person), node("span", "lane-count", th ? "ทำอยู่ 6 · ติดขัด 1" : "진행 6 · 막힘 1"));
      frag.append(head);
      cols.forEach((c, i) => {
        const cell = node("div", "lane-cell");
        cell.dataset.target = c;
        if (i === 2) {
          const g = node("article", "card group-card");
          g.append(node("h3", "", LONG.th), node("p", "card-desc", "요청 전영찬"));
          const bar2 = node("div", "group-progress");
          const fill = node("span");
          fill.style.width = "40%";
          bar2.append(fill);
          const meta = node("div", "card-meta");
          meta.append(node("span", "avatar", "10"), node("span", "", NAME + (th ? " และอีก 9 คน" : " 외 9명")), node("span", "due", th ? "ตอบแล้ว 4/10" : "회신 4/10"));
          g.append(bar2, meta);
          cell.append(g);
        } else
          for (const [t, d] of [[LONG.ko, due[0]], [LONG.th, due[1]], [LONG.word, due[0]]]) {
            const card = node("article", "card" + (c === "completed" ? " closed" : ""));
            card.append(node("h3", "", t), node("p", "card-desc", BODY));
            const meta = node("div", "card-meta");
            meta.append(node("span", "avatar", NAME.slice(0, 1)), node("span", "", NAME), node("span", "due" + (d === due[1] ? " unset" : " urgent"), d));
            const select = node("select");
            select.append(new Option(th ? "ย้ายสถานะ…" : "상태 이동…", ""));
            card.append(meta, select);
            cell.append(card);
          }
        frag.append(cell);
      });
    }
    $("board-columns").classList.add("lanes");
    $("board-columns").replaceChildren(frag);
  }

  function fillDetail(title) {
    $("detail-title").textContent = title;
    const rows = [
      ["상태", "진행 중"],
      ["담당자", NAME],
      ["마감", "2026-10-21"],
      ["링크", LONG.url],
    ];
    $("detail-meta").replaceChildren(...rows.flatMap(([k, v]) => [node("dt", "", k), node("dd", "", v)]));
    $("detail-body").textContent = BODY;
    // 숨김 버튼도 모두 보이게 — 버튼이 가장 많을 때를 본다. 수정은 가장 긴 문구(잠김).
    for (const id of ["detail-wait", "detail-delete", "detail-edit"]) $(id).hidden = false;
    $("detail-wait").textContent = "요청 보내기";
    $("detail-delete").textContent = "삭제";
    $("detail-edit").textContent = "수정 불가";
    $("detail-edit").disabled = true;
    const lock = $("detail-lock-note");
    if (lock) {
      lock.hidden = false;
      lock.textContent = "슬랙 대기 목록에서 온 업무라 여기서 고칠 수 없습니다 — " + LONG.url;
    }
  }

  function fillWait(title) {
    $("wait-description").textContent = "「" + title + "」 업무의 답을 기다리는 사람에게 단추 DM을 보냅니다.";
    const sel = $("wait-target");
    sel.replaceChildren(new Option(NAME, "u1"));
  }

  function fillAdd(title) {
    $("add-title").textContent = "업무 수정 — " + title;
    $("add-task-title").value = title;
    $("add-task-description").value = BODY;
    $("add-task-assignee").replaceChildren(new Option(NAME, "u1"));
    $("add-due-display").textContent = "2026년 10월 21일 화요일";
  }

  function fillFinish(title) {
    $("finish-title").textContent = "「" + title + "」 을(를) 완료로 옮길까요?";
    $("finish-description").textContent = LONG.url + " " + LONG.th;
    $("finish-cancel").textContent = "돌아가기";
    $("finish-confirm").textContent = "완료로 옮기기";
  }

  // ── 검사 도구 ──
  const visible = (el) =>
    el.checkVisibility
      ? el.checkVisibility({ visibilityProperty: true })
      : !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const inter = (a, b) => {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return right - left > 1 && bottom - top > 1 ? { left, top, right, bottom } : null;
  };
  const toBox = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  // 조상 중 넘친 내용을 자르는 상자(overflow 가 visible 이 아닌 것)로 사각형을 잘라 실제 보이는 부분만 남긴다.
  function clip(box, el) {
    let r = box;
    for (let a = el; a && r; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const ar = a.getBoundingClientRect();
      const pad = {
        left: ar.left + a.clientLeft,
        top: ar.top + a.clientTop,
        right: ar.left + a.clientLeft + a.clientWidth,
        bottom: ar.top + a.clientTop + a.clientHeight,
      };
      r = inter(r, pad);
    }
    return r;
  }
  function describe(el) {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) {
        s += "#" + e.id;
        parts.unshift(s);
        break;
      }
      if (e.classList.length) s += "." + [...e.classList].join(".");
      parts.unshift(s);
    }
    return parts.join(" > ");
  }
  const short = (s) => {
    s = (s || "").replace(/\s+/g, " ").trim();
    return s.length > 30 ? s.slice(0, 30) + "…" : s;
  };

  function check(scope, viewport) {
    const problems = [];
    const add = (kind, where, detail) => problems.push({ kind, where, detail });
    // 화면 크기는 node 쪽에서 정한 값을 쓴다 — 페이지가 넘치면 휴대폰 흉내 화면이 저절로
    // 축소돼 innerWidth·innerHeight 가 커지므로 그 값을 믿지 않는다.
    const vw = viewport.width;
    const vh = viewport.height;

    // 버튼 모으기
    const buttons = [...scope.querySelectorAll("button, [role=button]")].filter(visible);
    const btnBoxes = buttons
      .map((b) => ({ el: b, box: clip(toBox(b.getBoundingClientRect()), b.parentElement) }))
      .filter((b) => b.box);

    // 글자 실제 영역(줄마다) 모으기 — 버튼·입력칸 안의 글자는 그 자체이므로 뺀다.
    const texts = [];
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim()) continue;
      const parent = t.parentElement;
      if (!parent || parent.closest("button, select, option, textarea, script, style, [role=button]")) continue;
      if (!visible(parent)) continue;
      const range = document.createRange();
      range.selectNodeContents(t);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        const box = clip(toBox(r), parent);
        if (box) texts.push({ el: parent, box, text: t.textContent });
      }
    }

    // ① 버튼과 글자 겹침
    const seen = new Set();
    for (const b of btnBoxes) {
      for (const tx of texts) {
        if (b.el.contains(tx.el)) continue;
        const hit = inter(b.box, tx.box);
        if (!hit) continue;
        const key = describe(b.el) + "|" + describe(tx.el);
        if (seen.has(key)) continue;
        seen.add(key);
        add(
          "버튼-글자 겹침",
          describe(b.el),
          `버튼 「${short(b.el.textContent) || b.el.getAttribute("aria-label")}」 이(가) ${describe(tx.el)} 의 글자 「${short(tx.text)}」 와 겹침 (${Math.round(hit.right - hit.left)}×${Math.round(hit.bottom - hit.top)}px)`,
        );
      }
    }
    // ① 버튼끼리 겹침
    for (let i = 0; i < btnBoxes.length; i++)
      for (let j = i + 1; j < btnBoxes.length; j++) {
        const a = btnBoxes[i], c = btnBoxes[j];
        if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
        if (inter(a.box, c.box))
          add("버튼끼리 겹침", describe(a.el), `${describe(a.el)} 와 ${describe(c.el)} 가 겹침`);
      }
    // ① 버튼 위를 다른 것이 덮는지(가운데 점을 눌렀을 때 그 버튼이 잡히는지)
    for (const b of btnBoxes) {
      const x = (b.box.left + b.box.right) / 2;
      const y = (b.box.top + b.box.bottom) / 2;
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const top = document.elementFromPoint(x, y);
      if (top && !b.el.contains(top) && !top.contains(b.el))
        add("버튼이 가려짐", describe(b.el), `가운데를 누르면 ${describe(top)} 이(가) 잡힘`);
    }

    // ③ 단추·선택 칸이 비정상적으로 커짐(2026-10-22: 줄 보기에서 상태 이동 칸이 세로로 100px 넘게 늘어났다)
    for (const el of scope.querySelectorAll("select, button:not(.lane-head)")) {
      if (!visible(el)) continue;
      const h = el.getBoundingClientRect().height;
      if (h > 60) add("단추·선택 칸이 너무 큼", describe(el), `높이 ${Math.round(h)}px`);
    }

    // ② 칸 밖으로 넘침 — 스크롤로 보라고 만든 상자(overflow auto/scroll)와 입력칸은 뺀다.
    const over = [];
    for (const el of [scope, ...scope.querySelectorAll("*")]) {
      if (!visible(el) || el.matches("input, textarea, select, option, script, style, br")) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "inline" || cs.display === "contents") continue;
      if (["auto", "scroll"].includes(cs.overflowX)) continue;
      if (el.scrollWidth > el.clientWidth + 1) over.push(el);
    }
    // 안쪽에서 넘친 게 바깥까지 밀어낸 경우는 가장 안쪽만 알린다.
    for (const el of over)
      if (!over.some((o) => o !== el && el.contains(o)))
        add("가로 넘침", describe(el), `내용 폭 ${el.scrollWidth}px > 칸 폭 ${el.clientWidth}px`);
    if (scope.tagName !== "DIALOG" && document.documentElement.scrollWidth > vw + 1)
      add("페이지 가로 스크롤", "html", `페이지 폭 ${document.documentElement.scrollWidth}px > 화면 ${vw}px`);

    // ③ 창이 화면 밖으로 — 열린 창과 그 안의 버튼
    for (const d of document.querySelectorAll("dialog[open]")) {
      const r = d.getBoundingClientRect();
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)
        add(
          "창이 화면 밖",
          describe(d),
          `창 (${Math.round(r.left)},${Math.round(r.top)})~(${Math.round(r.right)},${Math.round(r.bottom)}) / 화면 ${vw}×${vh}`,
        );
    }
    if (scope.tagName === "DIALOG") {
      const dr = scope.getBoundingClientRect();
      for (const b of buttons) {
        const r = b.getBoundingClientRect();
        if (r.right > vw + 1 || r.left < -1)
          add("버튼이 화면 밖", describe(b), `버튼 오른쪽 끝 ${Math.round(r.right)}px / 화면 ${vw}px`);
        else if (r.right > dr.right + 1 || r.left < dr.left - 1)
          add("버튼이 창 밖", describe(b), `버튼 (${Math.round(r.left)}~${Math.round(r.right)}px) / 창 (${Math.round(dr.left)}~${Math.round(dr.right)}px)`);
      }
    }
    return problems;
  }

  const fills = { ko: LONG.ko, url: LONG.url, th: LONG.th, word: LONG.word };
  window.__runCase = (name, viewport) => {
    for (const d of document.querySelectorAll("dialog[open]")) d.close();
    $("board-columns").classList.remove("lanes");
    if (name.startsWith("lanes:")) {
      // 사람별 줄은 넓은 화면(960px 이상)에서만 쓴다 — 좁은 화면은 칸 보기(위 "board")가 맡는다.
      if (viewport.width < 960) return [];
      fillLanes(name.slice(6));
      return check($("work-board"), viewport);
    }
    fillBoard(name === "board");
    if (name === "board") return check($("work-board"), viewport);
    const [kind, variant] = name.split(":");
    const title = fills[variant];
    const map = {
      detail: ["detail-dialog", fillDetail],
      wait: ["wait-dialog", fillWait],
      add: ["add-dialog", fillAdd],
      finish: ["finish-dialog", fillFinish],
      archive: ["detail-dialog", fillArchive],
    };
    const [id, fill] = map[kind];
    $("detail-body").classList.remove("archive-body");
    const dlg = $(id);
    if (!dlg) return [{ kind: "시험 준비 실패", where: id, detail: "index.html 에서 창을 찾지 못함" }];
    fill(title);
    dlg.showModal();
    // 창 안을 맨 위로 — 스크롤 위치에 따라 결과가 바뀌지 않게.
    dlg.querySelectorAll("*").forEach((e) => (e.scrollTop = 0));
    return check(dlg, viewport);
  };
  window.__cases = ["board", "lanes:ko", "lanes:th"].concat(
    ...["detail", "wait", "add", "finish", "archive"].map((k) => Object.keys(fills).map((v) => k + ":" + v)),
  );
}

// ─────────────────────────────────────────────────────────────
// 시험 화면 만들기 — 진짜 index.html 에서 board.js 를 빼고 board.css 를 그대로 붙인다.
// ─────────────────────────────────────────────────────────────
function buildFixture() {
  let html = readFileSync(HTML_PATH, "utf8");
  const css = readFileSync(CSS_PATH, "utf8");
  html = html.replace(/<script\b[^>]*src=["'][^"']*board\.js[^"']*["'][^>]*>\s*<\/script>/i, "");
  const linkRe = /<link\b[^>]*href=["'][^"']*board\.css[^"']*["'][^>]*>/i;
  if (!linkRe.test(html)) throw new Error("index.html 에서 board.css 연결 줄을 찾지 못했습니다");
  html = html.replace(linkRe, () => `<style>\n${css}\n</style>`);
  html = html.replace(/<\/body>/i, () => `<script>(${inPage.toString()})();</script>\n</body>`);
  return html;
}

// ─────────────────────────────────────────────────────────────
// Chrome 띄우고 DevTools 통로(CDP)로 조종
// ─────────────────────────────────────────────────────────────
async function launchChrome(profileDir) {
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const portFile = join(profileDir, "DevToolsActivePort");
  for (let i = 0; i < 150; i++) {
    if (existsSync(portFile)) {
      const port = readFileSync(portFile, "utf8").split("\n")[0].trim();
      if (port) return { proc, port };
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error("Chrome 이 15초 안에 뜨지 않았습니다");
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const ready = new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = () => j(new Error("DevTools 연결 실패"));
  });
  return {
    ready,
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const n = ++id;
        pending.set(n, { resolve, reject });
        ws.send(JSON.stringify({ id: n, method, params }));
      }),
    once: (method) =>
      new Promise((r) => {
        const l = (m) => {
          if (m.method === method) {
            listeners.splice(listeners.indexOf(l), 1);
            r(m.params);
          }
        };
        listeners.push(l);
      }),
    close: () => ws.close(),
  };
}

async function main() {
  const work = mkdtempSync(join(tmpdir(), "board-overflow-"));
  const fixturePath = join(work, "fixture.html");
  writeFileSync(fixturePath, buildFixture());
  const profile = join(work, "chrome-profile");
  const { proc, port } = await launchChrome(profile);
  let exitCode = 0;
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("Chrome 페이지를 찾지 못했습니다");
    const c = cdp(page.webSocketDebuggerUrl);
    await c.ready;
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    const loaded = c.once("Page.loadEventFired");
    await c.send("Page.navigate", { url: pathToFileURL(fixturePath).href });
    await loaded;
    await c.send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => 1)", awaitPromise: true });

    const evalJson = async (expr) => {
      const r = await c.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error("페이지 안 오류: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    const cases = await evalJson("window.__cases");
    const all = [];
    for (const width of WIDTHS) {
      await c.send("Emulation.setDeviceMetricsOverride", {
        width,
        height: HEIGHT,
        deviceScaleFactor: 1,
        mobile: width < 600,
      });
      for (const name of cases) {
        const problems = await evalJson(`window.__runCase(${JSON.stringify(name)}, ${JSON.stringify({ width, height: HEIGHT })})`);
        for (const p of problems) all.push({ width, name, ...p });
      }
    }
    c.close();

    console.log(`검사 대상: ${CSS_PATH}`);
    console.log(`폭 ${WIDTHS.join("·")}px × 화면 ${cases.length}가지(보드·상세·대기·추가·확인 창, 긴 한국어/주소/태국어/긴 단어)`);
    if (!all.length) {
      console.log("이상 없음");
    } else {
      exitCode = 1;
      // 같은 자리·같은 문제는 폭·화면을 모아 한 줄로
      const groups = new Map();
      for (const p of all) {
        const key = p.kind + "|" + p.where + "|" + p.detail.replace(/\d+(\.\d+)?px|\d+×\d+px|\(\d+,\d+\)~\(\d+,\d+\)/g, "#");
        if (!groups.has(key)) groups.set(key, { ...p, widths: new Set(), names: new Set() });
        groups.get(key).widths.add(p.width);
        groups.get(key).names.add(p.name);
      }
      console.log(`문제 ${groups.size}가지 발견:\n`);
      for (const g of groups.values()) {
        console.log(`✗ [${g.kind}] ${g.where}`);
        console.log(`    ${g.detail}`);
        console.log(`    폭: ${[...g.widths].join("·")}px / 화면: ${[...g.names].join(", ")}`);
      }
    }
    if (KEEP) console.log(`\n시험 화면 파일: ${fixturePath}`);
  } finally {
    proc.kill();
    await new Promise((r) => setTimeout(r, 300));
    if (!KEEP) rmSync(work, { recursive: true, force: true });
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("검사 도구 오류: " + err.message);
  process.exit(2);
});
