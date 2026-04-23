"use strict";

(function () {
  const KAKAO_APP_KEY = "e30630e5a7dbeb87021862866db01818";
  const SITE_URL = "https://sbti.funhada.xyz";
  const QUIZ_URL = SITE_URL + "/quiz/";
  const RESULT_SNAPSHOT_KEY = "sbti_last_result";

  const pageEl = document.querySelector("[data-type-code]");
  if (!pageEl) return;

  const typeCode = pageEl.dataset.typeCode;
  const typeName = pageEl.dataset.typeNameKo || "";
  const typeTagline = pageEl.dataset.typeTagline || "";
  const ogImagePath = pageEl.dataset.ogImage || "/img/og-default.jpg";

  function getMatchRate() {
    try {
      const raw = sessionStorage.getItem(RESULT_SNAPSHOT_KEY);
      if (raw) {
        const snap = JSON.parse(raw);
        if (snap && snap.typeCode === typeCode && typeof snap.matchRate === "number") {
          return Math.round(snap.matchRate * 100);
        }
      }
    } catch (_) {}
    const raw = new URLSearchParams(location.search).get("m");
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) return parsed;
    return null;
  }

  function buildShareURL() {
    const rate = getMatchRate();
    const url = new URL(location.pathname, SITE_URL);
    if (rate !== null) url.searchParams.set("m", String(rate));
    return url.toString();
  }

  let toastTimer;
  function showToast(msg) {
    let el = document.querySelector(".share-toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "share-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("share-toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("share-toast--visible");
    }, 2200);
  }

  function ensureKakaoReady() {
    if (typeof window.Kakao === "undefined") return false;
    if (!window.Kakao.isInitialized()) {
      try { window.Kakao.init(KAKAO_APP_KEY); } catch (_) { return false; }
    }
    return window.Kakao.isInitialized();
  }

  function shareKakao() {
    if (!ensureKakaoReady()) {
      showToast("카카오톡 공유를 불러오지 못했어요. 링크 복사를 써주세요.");
      return;
    }
    const rate = getMatchRate();
    const title = rate !== null
      ? `내 SBTI는 ${typeCode} · ${typeName} (매칭 ${rate}%)`
      : `내 SBTI는 ${typeCode} · ${typeName}`;
    const shareURL = buildShareURL();
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: title,
        description: typeTagline,
        imageUrl: SITE_URL + ogImagePath,
        link: { mobileWebUrl: shareURL, webUrl: shareURL }
      },
      buttons: [
        {
          title: "나도 검사해보기",
          link: { mobileWebUrl: QUIZ_URL, webUrl: QUIZ_URL }
        }
      ]
    });
  }

  async function copyLink() {
    const url = buildShareURL();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast("링크를 복사했어요");
    } catch (_) {
      showToast("복사에 실패했어요. 주소창에서 직접 복사해 주세요.");
    }
  }

  function downloadImage() {
    const a = document.createElement("a");
    a.href = ogImagePath;
    a.download = `sbti-${typeCode}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const kakaoBtn = document.getElementById("share-kakao");
  const copyBtn = document.getElementById("share-copy");
  const downloadBtn = document.getElementById("share-download");
  if (kakaoBtn) kakaoBtn.addEventListener("click", shareKakao);
  if (copyBtn) copyBtn.addEventListener("click", copyLink);
  if (downloadBtn) downloadBtn.addEventListener("click", downloadImage);
})();
