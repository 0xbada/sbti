"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  score,
  computeRawScores,
  findBestMatch,
  checkHiddenOverride,
  flattenAxes,
  euclideanDistance,
  SCORING_CONFIG
} = require("../src/js/scoring");

const dimensions = require("../src/_data/dimensions.json");
const types = require("../src/_data/types.json");
const questions = require("../src/_data/questions.json");

const data = { dimensions, types, questions };
const axisCodes = flattenAxes(dimensions).map(a => a.code);

test("flattenAxes returns 15 axes in declaration order", () => {
  assert.equal(axisCodes.length, 15);
  assert.equal(axisCodes[0], "SELF_AWARE");
  assert.equal(axisCodes[14], "SOC_CONFL");
});

test("euclideanDistance is symmetric and zero for identical profiles", () => {
  const a = { SELF_AWARE: 0.2, SELF_ESTEEM: 0.5 };
  const b = { SELF_AWARE: 0.8, SELF_ESTEEM: 0.5 };
  const codes = ["SELF_AWARE", "SELF_ESTEEM"];
  assert.equal(
    euclideanDistance(a, b, codes, 0.5),
    euclideanDistance(b, a, codes, 0.5)
  );
  assert.equal(euclideanDistance(a, a, codes, 0.5), 0);
});

test("empty answers produce a neutral profile (all 0.5)", () => {
  const result = computeRawScores([], questions, axisCodes, 0.5);
  for (const code of axisCodes) {
    assert.equal(result.profile[code], 0.5);
  }
  assert.deepEqual(result.triggers, {});
});

test("unknown questionId is silently skipped", () => {
  const result = score([{ questionId: 999, label: "H" }], data);
  assert.equal(result.triggers.DRUNK, undefined);
});

test("single DRUNK trigger does not hit threshold of 2", () => {
  const result = score([{ questionId: 3, label: "H" }], data);
  assert.equal(result.triggers.DRUNK, 1);
  assert.equal(result.hiddenTriggered, false);
  assert.notEqual(result.typeCode, "DRUNK");
});

test("DRUNK trigger overrides when threshold is met (fixture)", () => {
  const fixtureQuestions = [
    {
      id: 101,
      options: [
        { label: "H", scores: { SOC_EXT: 0.9 }, triggers: { DRUNK: 1 } }
      ]
    },
    {
      id: 102,
      options: [
        { label: "H", scores: { SOC_EXT: 0.9 }, triggers: { DRUNK: 1 } }
      ]
    }
  ];
  const fixtureData = { dimensions, types, questions: fixtureQuestions };
  const answers = [
    { questionId: 101, label: "H" },
    { questionId: 102, label: "H" }
  ];
  const result = score(answers, fixtureData);
  assert.equal(result.typeCode, "DRUNK");
  assert.equal(result.hiddenTriggered, true);
  assert.equal(result.triggers.DRUNK, 2);
});

test("hidden type overrides even a strong base match", () => {
  // Craft a profile perfectly matching CTRL, but also trigger DRUNK above threshold
  const fixtureQuestions = [
    {
      id: 201,
      options: [
        {
          label: "H",
          scores: { SELF_CONTROL: 0.95, ACT_DRIVE: 0.9 },
          triggers: { DRUNK: 5 }
        }
      ]
    }
  ];
  const fixtureData = { dimensions, types, questions: fixtureQuestions };
  const result = score([{ questionId: 201, label: "H" }], fixtureData);
  assert.equal(result.typeCode, "DRUNK", "hidden overrides base");
  assert.equal(result.hiddenTriggered, true);
});

test("forced-high threshold triggers HHHH fallback", () => {
  const result = score([], data, { matchRateThreshold: 0.99 });
  assert.equal(result.typeCode, "HHHH");
  assert.equal(result.isFallback, true);
});

test("baseTypeCode is populated even when fallback is used", () => {
  const result = score([], data, { matchRateThreshold: 0.99 });
  assert.equal(result.isFallback, true);
  assert.notEqual(result.baseTypeCode, null);
  assert.notEqual(result.baseTypeCode, "HHHH");
});

test("fallback and hidden types are excluded from base matching", () => {
  const { type } = findBestMatch({ SELF_AWARE: 0.5 }, types, axisCodes, SCORING_CONFIG);
  assert.notEqual(type.code, "HHHH");
  assert.notEqual(type.code, "DRUNK");
});

test("matchRate is in [0, 1] for any valid input", () => {
  const answers = [
    { questionId: 1, label: "H" },
    { questionId: 2, label: "L" },
    { questionId: 3, label: "M" }
  ];
  const result = score(answers, data);
  assert.ok(result.matchRate >= 0 && result.matchRate <= 1, `matchRate ${result.matchRate} out of range`);
});

test("score result shape is stable (snapshot)", () => {
  const answers = [
    { questionId: 1, label: "L" },
    { questionId: 2, label: "M" },
    { questionId: 3, label: "L" }
  ];
  const result = score(answers, data);
  // Shape check, not specific values
  assert.ok("typeCode" in result);
  assert.ok("nameKo" in result);
  assert.ok("dimensionProfile" in result);
  assert.ok("matchRate" in result);
  assert.ok("distance" in result);
  assert.ok("baseTypeCode" in result);
  assert.ok("triggers" in result);
  assert.ok("isFallback" in result);
  assert.ok("hiddenTriggered" in result);
  assert.equal(Object.keys(result.dimensionProfile).length, 15);
});
