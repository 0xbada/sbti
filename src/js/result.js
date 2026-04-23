"use strict";

(function () {
  const RESULT_SNAPSHOT_KEY = "sbti_last_result";
  const QUIZ_STATE_KEY = "sbti_quiz_v1";

  const retryBtn = document.getElementById("result-retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      try { localStorage.removeItem(QUIZ_STATE_KEY); } catch (_) {}
      location.href = "/quiz/";
    });
  }

  const pageEl = document.querySelector("[data-type-code]");
  if (!pageEl) return;
  const pageTypeCode = pageEl.dataset.typeCode;

  const banner = document.getElementById("result-banner");
  if (!banner) return;
  const labelEl = document.getElementById("banner-label");
  const matchEl = document.getElementById("banner-match-rate");
  const noteEl = document.getElementById("banner-note");

  let snapshot = null;
  try {
    const raw = sessionStorage.getItem(RESULT_SNAPSHOT_KEY);
    snapshot = raw ? JSON.parse(raw) : null;
  } catch (_) {}

  // Priority 1: own result (sessionStorage snapshot for this type)
  if (snapshot && snapshot.typeCode === pageTypeCode) {
    const pct = Math.round((snapshot.matchRate || 0) * 100);
    if (labelEl) labelEl.textContent = "당신의 결과";
    if (matchEl) matchEl.textContent = `매칭률 ${pct}%`;
    if (noteEl) {
      if (snapshot.hiddenTriggered) {
        noteEl.textContent = "히든 유형에 걸렸어요 — 특정 답변 조합에서만 나오는 결과예요.";
      } else if (snapshot.isFallback) {
        noteEl.textContent = "어떤 유형과도 60% 이상 맞지 않는 희귀 프로필이에요.";
      } else {
        noteEl.textContent = "";
      }
    }
    banner.hidden = false;
    return;
  }

  // Priority 2: friend's shared link (?m=85 → visitor is not the sharer)
  const raw = new URLSearchParams(location.search).get("m");
  const friendPct = parseInt(raw, 10);
  if (Number.isFinite(friendPct) && friendPct >= 0 && friendPct <= 100) {
    banner.classList.add("result-banner--friend");
    if (labelEl) labelEl.textContent = "공유자의 결과";
    if (matchEl) matchEl.textContent = `매칭률 ${friendPct}%`;
    if (noteEl) noteEl.textContent = "당신도 궁금하다면 아래에서 테스트해 보세요.";
    banner.hidden = false;
  }
})();
