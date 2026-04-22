"use strict";

(function () {
  const STATE_KEY = "sbti_quiz_v1";

  const questionsEl = document.getElementById("quiz-questions");
  const dimensionsEl = document.getElementById("quiz-dimensions");
  const typesEl = document.getElementById("quiz-types");
  if (!questionsEl || !dimensionsEl || !typesEl) return;

  const data = {
    questions: JSON.parse(questionsEl.textContent),
    dimensions: JSON.parse(dimensionsEl.textContent),
    types: JSON.parse(typesEl.textContent)
  };

  // Main flow: non-hidden questions only. Hidden probe questions surface
  // based on trigger counters (future extension).
  const mainQuestions = data.questions.filter(q => !q.hidden);

  const rootEl = document.getElementById("quiz-root");
  const progressEl = document.getElementById("quiz-progress");
  const questionEl = document.getElementById("quiz-question");
  const optionsEl = document.getElementById("quiz-options");
  const backEl = document.getElementById("quiz-back");
  const resultEl = document.getElementById("quiz-result");
  const resultCodeEl = document.getElementById("result-type-code");
  const resultNameEl = document.getElementById("result-type-name");
  const resultTaglineEl = document.getElementById("result-tagline");
  const resultMatchEl = document.getElementById("result-match-rate");
  const resultNoteEl = document.getElementById("result-note");
  const retryEl = document.getElementById("result-retry");

  let state = loadState() || { answers: [], currentIndex: 0 };

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function clearState() {
    try {
      localStorage.removeItem(STATE_KEY);
    } catch (_) {}
  }

  function render() {
    if (state.currentIndex >= mainQuestions.length) {
      renderResult();
      return;
    }
    renderQuestion();
  }

  function renderQuestion() {
    rootEl.hidden = false;
    resultEl.hidden = true;

    const q = mainQuestions[state.currentIndex];
    const total = mainQuestions.length;
    progressEl.textContent = `${state.currentIndex + 1} / ${total}`;
    questionEl.textContent = q.text;

    const prev = state.answers[state.currentIndex];

    optionsEl.innerHTML = "";
    for (const option of q.options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option";
      btn.textContent = option.text;
      btn.setAttribute("role", "radio");
      const isSelected = prev && prev.label === option.label;
      btn.setAttribute("aria-checked", isSelected ? "true" : "false");
      if (isSelected) btn.classList.add("quiz-option--selected");
      btn.addEventListener("click", () => selectOption(q, option));
      optionsEl.appendChild(btn);
    }

    backEl.hidden = state.currentIndex === 0;
  }

  function selectOption(question, option) {
    state.answers[state.currentIndex] = {
      questionId: question.id,
      label: option.label
    };
    state.currentIndex += 1;
    saveState();
    render();
  }

  function renderResult() {
    rootEl.hidden = true;
    resultEl.hidden = false;

    const result = window.SBTI.score(state.answers, data);
    const type = data.types.find(t => t.code === result.typeCode);

    resultCodeEl.textContent = result.typeCode || "—";
    resultNameEl.textContent = type ? type.nameKo : "";
    resultTaglineEl.textContent = type ? type.tagline : "";
    resultMatchEl.textContent = `매칭률 ${Math.round(result.matchRate * 100)}%`;

    if (result.hiddenTriggered) {
      resultNoteEl.textContent = "히든 유형에 걸렸어요.";
    } else if (result.isFallback) {
      resultNoteEl.textContent = "어떤 유형과도 확실히 맞지 않는 희귀 프로필이에요.";
    } else {
      resultNoteEl.textContent = "";
    }
  }

  function goBack() {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      saveState();
      render();
    }
  }

  function retry() {
    clearState();
    state = { answers: [], currentIndex: 0 };
    render();
  }

  backEl.addEventListener("click", goBack);
  retryEl.addEventListener("click", retry);

  render();
})();
