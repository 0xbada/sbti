"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  l2Distance,
  enumerateRegularPairs,
  THRESHOLD
} = require("../scripts/validate-profiles");

const AXES = [
  "SELF_AWARE", "SELF_ESTEEM", "SELF_CONTROL",
  "EMO_EXPR", "EMO_STAB", "EMO_EMPATHY",
  "ATT_OPTIM", "ATT_CYNIC", "ATT_REAL",
  "ACT_DRIVE", "ACT_DILIG", "ACT_RISK",
  "SOC_EXT", "SOC_AGREE", "SOC_CONFL"
];

test("l2Distance is zero for identical profiles", () => {
  const p = Object.fromEntries(AXES.map(a => [a, 0.5]));
  assert.equal(l2Distance(p, p, AXES), 0);
});

test("l2Distance is symmetric", () => {
  const a = { ...Object.fromEntries(AXES.map(ax => [ax, 0.5])), SELF_AWARE: 0.2 };
  const b = { ...Object.fromEntries(AXES.map(ax => [ax, 0.5])), SELF_AWARE: 0.8 };
  assert.equal(l2Distance(a, b, AXES), l2Distance(b, a, AXES));
});

test("l2Distance handles missing axis with default 0.5", () => {
  const a = { SELF_AWARE: 0.5 };
  const b = { SELF_AWARE: 0.5 };
  assert.equal(l2Distance(a, b, AXES), 0);
});

test("enumerateRegularPairs excludes pairs containing fallback or hidden", () => {
  const types = [
    { code: "A", dimensionProfile: {} },
    { code: "B", dimensionProfile: {} },
    { code: "C", fallback: true, dimensionProfile: {} },
    { code: "D", hidden: true, dimensionProfile: {} }
  ];
  const pairs = enumerateRegularPairs(types);
  // Only A-B is a regular pair
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].a.code, "A");
  assert.equal(pairs[0].b.code, "B");
});

test("THRESHOLD is 0.5 (documented invariant)", () => {
  assert.equal(THRESHOLD, 0.5);
});
