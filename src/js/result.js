"use strict";

(function () {
  const RESULT_SNAPSHOT_KEY = "sbti_last_result";
  const QUIZ_STATE_KEY = "sbti_quiz_v1";

  // Retry button — clears quiz progress and returns to /quiz/
  const retryBtn = document.getElementById("result-retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", function () {
      try { localStorage.removeItem(QUIZ_STATE_KEY); } catch (_) {}
      location.href = "/quiz/";
    });
  }

  // Post-quiz banner — only visible when the last-session snapshot matches
  // this page's type code. Shared links (no snapshot, or different type)
  // see only the static type content below.
  const pageEl = document.querySelector("[data-type-code]");
  if (!pageEl) return;
  const pageTypeCode = pageEl.dataset.typeCode;

  let snapshot;
  try {
    const raw = sessionStorage.getItem(RESULT_SNAPSHOT_KEY);
    snapshot = raw ? JSON.parse(raw) : null;
  } catch (_) {
    return;
  }

  if (!snapshot || snapshot.typeCode !== pageTypeCode) return;

  const banner = document.getElementById("result-banner");
  if (!banner) return;

  const matchEl = document.getElementById("banner-match-rate");
  const noteEl = document.getElementById("banner-note");

  const matchRatePct = Math.round((snapshot.matchRate || 0) * 100);
  if (matchEl) matchEl.textContent = `매칭률 ${matchRatePct}%`;

  if (noteEl) {
    if (snapshot.hiddenTriggered) {
      noteEl.textContent = "히든 유형에 걸렸어요 — 특정 답변 조합에서만 나오는 결과예요.";
    } else if (snapshot.isFallback) {
      noteEl.textContent = "어떤 유형과도 60% 이상 맞지 않는 희귀 프로필이에요.";
    }
  }

  banner.hidden = false;
})();
