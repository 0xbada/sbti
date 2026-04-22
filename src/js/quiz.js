"use strict";

(function () {
  const STATE_KEY = "sbti_quiz_v1";
  const RESULT_SNAPSHOT_KEY = "sbti_last_result";

  const questionsEl = document.getElementById("quiz-questions");
  const dimensionsEl = document.getElementById("quiz-dimensions");
  const typesEl = document.getElementById("quiz-types");
  if (!questionsEl || !dimensionsEl || !typesEl) return;

  const data = {
    questions: JSON.parse(questionsEl.textContent),
    dimensions: JSON.parse(dimensionsEl.textContent),
    types: JSON.parse(typesEl.textContent)
  };

  // Main flow: non-hidden questions. Hidden probe questions surface via
  // trigger counters (future extension).
  const mainQuestions = data.questions.filter(q => !q.hidden);

  const rootEl = document.getElementById("quiz-root");
  const progressEl = document.getElementById("quiz-progress");
  const questionEl = document.getElementById("quiz-question");
  const optionsEl = document.getElementById("quiz-options");
  const backEl = document.getElementById("quiz-back");

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

  function render() {
    if (state.currentIndex >= mainQuestions.length) {
      completeAndRedirect();
      return;
    }
    renderQuestion();
  }

  function renderQuestion() {
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

  function completeAndRedirect() {
    const result = window.SBTI.score(state.answers, data);
    const type = data.types.find(t => t.code === result.typeCode);

    if (!type || !type.slug) {
      console.error("SBTI: cannot resolve result type slug", result);
      return;
    }

    // Stash a snapshot for the result page to enhance UX (match rate, etc.)
    try {
      sessionStorage.setItem(
        RESULT_SNAPSHOT_KEY,
        JSON.stringify({
          typeCode: result.typeCode,
          matchRate: result.matchRate,
          isFallback: result.isFallback,
          hiddenTriggered: result.hiddenTriggered,
          triggers: result.triggers
        })
      );
    } catch (_) {}

    window.location.href = `/result/${type.slug}/`;
  }

  function goBack() {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      saveState();
      render();
    }
  }

  backEl.addEventListener("click", goBack);
  render();
})();
