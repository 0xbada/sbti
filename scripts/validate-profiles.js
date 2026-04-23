#!/usr/bin/env node
"use strict";

const THRESHOLD = 0.5;

function l2Distance(a, b, axisCodes) {
  let sum = 0;
  for (const code of axisCodes) {
    const av = a[code] ?? 0.5;
    const bv = b[code] ?? 0.5;
    const d = av - bv;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function isRegular(type) {
  return !type.fallback && !type.hidden;
}

function enumerateAllPairs(types) {
  const pairs = [];
  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      pairs.push({ a: types[i], b: types[j] });
    }
  }
  return pairs;
}

function enumerateRegularPairs(types) {
  return enumerateAllPairs(types).filter(
    p => isRegular(p.a) && isRegular(p.b)
  );
}

module.exports = {
  l2Distance,
  enumerateAllPairs,
  enumerateRegularPairs,
  isRegular,
  THRESHOLD
};

// CLI entrypoint
if (require.main === module) {
  const path = require("path");
  const types = require(path.join(__dirname, "..", "src", "_data", "types.json"));
  const dimensions = require(path.join(__dirname, "..", "src", "_data", "dimensions.json"));
  const axisCodes = dimensions.models.flatMap(m => m.axes.map(a => a.code));

  const allPairs = enumerateAllPairs(types).map(p => ({
    ...p,
    dist: l2Distance(p.a.dimensionProfile, p.b.dimensionProfile, axisCodes),
    isRegularPair: isRegular(p.a) && isRegular(p.b)
  }));

  allPairs.sort((x, y) => x.dist - y.dist);

  const regularPairs = allPairs.filter(p => p.isRegularPair);
  const violations = regularPairs.filter(p => p.dist < THRESHOLD);

  console.log("=".repeat(64));
  console.log("SBTI 유형 프로필 충돌 검증");
  console.log("=".repeat(64));
  console.log(`총 유형: ${types.length} (일반 ${types.filter(isRegular).length} + 특수 ${types.length - types.filter(isRegular).length})`);
  console.log(`비교 쌍: 전체 ${allPairs.length} / 일반 유형만 ${regularPairs.length}`);
  console.log(`임계값: L2 ≥ ${THRESHOLD} (일반 쌍에만 게이트 적용)`);
  console.log("");

  console.log("[최소 거리 top 10 (전체 쌍)]");
  allPairs.slice(0, 10).forEach((p, i) => {
    const tag = p.isRegularPair ? (p.dist < THRESHOLD ? "⚠️ 미만" : "✅") : "(info)";
    console.log(`  ${String(i + 1).padStart(2)}. ${p.a.code.padEnd(8)} ↔ ${p.b.code.padEnd(8)} L2=${p.dist.toFixed(3)} ${tag}`);
  });
  console.log("");

  if (violations.length > 0) {
    console.log(`[일반 유형 쌍 충돌 ${violations.length}개 (L2 < ${THRESHOLD})]`);
    violations.forEach(p => {
      console.log(`  - ${p.a.code} ↔ ${p.b.code} (L2=${p.dist.toFixed(3)})`);
      const extremes = axisCodes
        .map(c => ({
          code: c,
          av: p.a.dimensionProfile[c] ?? 0.5,
          bv: p.b.dimensionProfile[c] ?? 0.5
        }))
        .filter(x => Math.abs(x.av - x.bv) < 0.1 && (x.av <= 0.25 || x.av >= 0.75))
        .map(x => `${x.code}(${x.av.toFixed(2)})`);
      if (extremes.length) console.log(`    공통 극단 축: ${extremes.join(", ")}`);
    });
    console.log("");
  }

  console.log("[각 유형의 최근접 (일반 유형 기준)]");
  const regulars = types.filter(isRegular);
  for (const t of regulars) {
    const closest = regularPairs
      .filter(p => p.a.code === t.code || p.b.code === t.code)
      .map(p => ({ other: p.a.code === t.code ? p.b : p.a, dist: p.dist }))
      .sort((x, y) => x.dist - y.dist)[0];
    if (closest) {
      console.log(`  ${t.code.padEnd(8)} → ${closest.other.code.padEnd(8)} (L2=${closest.dist.toFixed(3)})`);
    }
  }
  console.log("");

  console.log("[슈퍼축 분포 (일반 유형)]");
  for (const model of dimensions.models) {
    const modelAxes = model.axes.map(a => a.code);
    const vals = regulars.map(t => {
      const v = modelAxes.map(c => t.dimensionProfile[c] ?? 0.5);
      return v.reduce((a, b) => a + b, 0) / v.length;
    });
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / vals.length);
    const ok = std >= 0.1 ? "✅" : "⚠️";
    console.log(`  ${model.code.padEnd(10)} ${model.nameKo} : min=${min.toFixed(2)} max=${max.toFixed(2)} std=${std.toFixed(2)} ${ok}`);
  }
  console.log("");

  if (violations.length === 0) {
    console.log(`✅ 통과 (일반 유형 ${regularPairs.length}쌍 모두 L2 ≥ ${THRESHOLD})`);
    process.exit(0);
  } else {
    console.log(`❌ 실패 — ${violations.length}개 쌍 L2 < ${THRESHOLD}`);
    process.exit(1);
  }
}
