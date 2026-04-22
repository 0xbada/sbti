"use strict";

/*
 * SBTI Scoring Engine
 *
 * Maps user answers to one of 27 personality types using Euclidean
 * nearest-neighbor matching over a 15-dimension profile space.
 * Hidden types (DRUNK) override via trigger counters; a fallback type
 * (HHHH) catches low-confidence matches.
 *
 * All functions are pure — data is passed in, nothing is imported.
 * Exposed via UMD: works in browser (window.SBTI) and Node (module.exports).
 */

const SCORING_CONFIG = {
  matchRateThreshold: 0.6,
  fallbackTypeCode: "HHHH",
  defaultAxisValue: 0.5
};

function flattenAxes(dimensionsData) {
  return dimensionsData.models.flatMap(model =>
    model.axes.map(axis => ({ ...axis, modelCode: model.code }))
  );
}

function computeRawScores(answers, questions, axisCodes, defaultValue) {
  const sums = {};
  const counts = {};
  const triggers = {};

  for (const code of axisCodes) {
    sums[code] = 0;
    counts[code] = 0;
  }

  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) continue;
    const option = question.options.find(o => o.label === answer.label);
    if (!option) continue;

    if (option.scores) {
      for (const [code, value] of Object.entries(option.scores)) {
        if (code in sums) {
          sums[code] += value;
          counts[code] += 1;
        }
      }
    }

    if (option.triggers) {
      for (const [name, count] of Object.entries(option.triggers)) {
        triggers[name] = (triggers[name] || 0) + count;
      }
    }
  }

  const profile = {};
  for (const code of axisCodes) {
    profile[code] = counts[code] > 0 ? sums[code] / counts[code] : defaultValue;
  }

  return { profile, triggers };
}

function euclideanDistance(profileA, profileB, axisCodes, defaultValue) {
  let sumSq = 0;
  for (const code of axisCodes) {
    const a = code in profileA ? profileA[code] : defaultValue;
    const b = code in profileB ? profileB[code] : defaultValue;
    const diff = a - b;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

function findBestMatch(profile, types, axisCodes, config) {
  const candidates = types.filter(t => !t.fallback && !t.hidden);
  const maxDistance = Math.sqrt(axisCodes.length);

  let best = null;
  let bestDistance = Infinity;

  for (const type of candidates) {
    const d = euclideanDistance(
      profile,
      type.dimensionProfile,
      axisCodes,
      config.defaultAxisValue
    );
    if (d < bestDistance) {
      bestDistance = d;
      best = type;
    }
  }

  const matchRate = best ? 1 - bestDistance / maxDistance : 0;
  return { type: best, distance: bestDistance, matchRate, maxDistance };
}

function checkHiddenOverride(triggers, types) {
  for (const type of types) {
    if (!type.hidden || !type.triggerName || !type.triggerThreshold) continue;
    const count = triggers[type.triggerName] || 0;
    if (count >= type.triggerThreshold) return type;
  }
  return null;
}

function findFallbackType(types, fallbackCode) {
  return (
    types.find(t => t.fallback) ||
    types.find(t => t.code === fallbackCode) ||
    null
  );
}

function score(answers, data, configOverrides = {}) {
  const config = { ...SCORING_CONFIG, ...configOverrides };
  const axes = flattenAxes(data.dimensions);
  const axisCodes = axes.map(a => a.code);

  const { profile, triggers } = computeRawScores(
    answers,
    data.questions,
    axisCodes,
    config.defaultAxisValue
  );
  const baseMatch = findBestMatch(profile, data.types, axisCodes, config);

  let resultType = baseMatch.type;
  let isFallback = false;

  if (!resultType || baseMatch.matchRate < config.matchRateThreshold) {
    const fb = findFallbackType(data.types, config.fallbackTypeCode);
    if (fb) {
      resultType = fb;
      isFallback = true;
    }
  }

  const hiddenType = checkHiddenOverride(triggers, data.types);
  if (hiddenType) {
    resultType = hiddenType;
    isFallback = false;
  }

  return {
    typeCode: resultType ? resultType.code : null,
    nameKo: resultType ? resultType.nameKo : null,
    dimensionProfile: profile,
    matchRate: baseMatch.matchRate,
    distance: baseMatch.distance,
    baseTypeCode: baseMatch.type ? baseMatch.type.code : null,
    triggers,
    isFallback,
    hiddenTriggered: !!hiddenType
  };
}

const api = {
  score,
  computeRawScores,
  findBestMatch,
  checkHiddenOverride,
  findFallbackType,
  flattenAxes,
  euclideanDistance,
  SCORING_CONFIG
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.SBTI = Object.assign(window.SBTI || {}, api);
}
