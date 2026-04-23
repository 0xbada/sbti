# SBTI 21유형 확장 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/_data/types.json`의 6유형을 27유형으로 확장해 SBTI MVP P0를 완료한다.

**Architecture:** 2-Phase 순차 실행 — Phase 1에서 검증 스크립트로 방어된 좌표(nameKo/tagline/rarity/15차원 프로필)를 먼저 확정하고 사용자 리뷰 게이트를 거친 뒤, Phase 2에서 아키타입별 5개 톤 결로 본문을 배치 작성한다. 기존 Eleventy pagination과 스코어링 엔진은 건드리지 않고 데이터만 추가한다.

**Tech Stack:** Node.js 18+, Eleventy 3.x, Nunjucks, Vanilla JS, `node:test` 러너. 추가 의존성 없음.

**설계 문서 참조:** `docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md` — 브레인스토밍 합의(6개 결정), 톤 정책, 금지사항 등은 이 스펙에서 최종 근거를 확인하라.

---

## Context — 프로젝트 최소 지식

이 플랜을 실행하는 엔지니어가 알아야 할 것:

1. **스코어링 엔진** (`src/js/scoring.js`): 사용자 답변 → 15차원 벡터 → 각 유형 `dimensionProfile`과 유클리드 거리 → 최근접 유형 선택. `fallback:true`(HHHH) 또는 `hidden:true`(DRUNK)는 `findBestMatch`에서 제외.
2. **결과 페이지 자동 라우팅** (`src/result/index.njk`): Eleventy `pagination`이 `types.json`을 순회하며 `/result/{slug}/`를 자동 생성. 21개 추가 시 템플릿 변경 없이 21개 URL이 생성됨.
3. **15차원 축 코드 (고정):** `src/_data/dimensions.json`에 선언. `SELF_AWARE, SELF_ESTEEM, SELF_CONTROL, EMO_EXPR, EMO_STAB, EMO_EMPATHY, ATT_OPTIM, ATT_CYNIC, ATT_REAL, ACT_DRIVE, ACT_DILIG, ACT_RISK, SOC_EXT, SOC_AGREE, SOC_CONFL`.
4. **OG 카드 생성기** (`scripts/generate-og-cards.js`): ImageMagick 호출해서 `types.json`의 각 유형에 대해 `src/img/types/{CODE}.jpg` 1200×630 플레이스홀더를 생성. ImageMagick + 시스템 폰트 `AppleSDGothicNeo.ttc` 필요.
5. **21개 추가할 코드 (순서 고정):** FUCK, SHIT, ATM-er, BOSS, GOGO, SEXY, LOVE-R, MUM, THAN-K, THIN-K, FAKE, JOKE-R, OH-NO, WOC!, OJBK, ZZZZ, POOR, SOLO, IMSB, IMFW, Dior-s.
6. **rare 5개 잠정:** Dior-s, THIN-K, FAKE, MUM, WOC!. 나머지 16개는 `common`.

---

## Task 1: 프로필 거리 검증 스크립트 (TDD)

**Files:**
- Create: `scripts/validate-profiles.js`
- Create: `tests/validate-profiles.test.js`
- Modify: `package.json`

**목적:** 27유형 모든 쌍의 L2 거리를 계산해, 일반 유형 25개 간 쌍이 모두 L2 ≥ 0.5인지 검증. HHHH·DRUNK 포함 쌍은 리포트에만 표시하고 실패 게이트에서 제외.

- [ ] **Step 1: 유틸 함수 테스트 먼저 작성**

파일: `tests/validate-profiles.test.js`

```js
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
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `node --test tests/validate-profiles.test.js`
Expected: FAIL with "Cannot find module '../scripts/validate-profiles'"

- [ ] **Step 3: 최소 구현 작성**

파일: `scripts/validate-profiles.js`

```js
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
```

- [ ] **Step 4: 테스트 재실행, 통과 확인**

Run: `node --test tests/validate-profiles.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: 현재 6유형 기준 스크립트 수동 실행해 베이스라인 확인**

Run: `node scripts/validate-profiles.js`
Expected: exit 0, 리포트 출력. 현재 6유형은 모두 L2 ≥ 0.5일 것으로 예상. 만약 실패하면 기존 데이터 문제이므로 이 플랜 이전에 해결해야 함 — 실행자는 즉시 중단하고 상위에 보고.

- [ ] **Step 6: package.json에 validate 스크립트 등록**

파일: `package.json` 의 `"scripts"` 객체에 다음 추가 (기존 `"test"` 앞/뒤 상관없음):

```json
"validate": "node scripts/validate-profiles.js"
```

- [ ] **Step 7: npm run validate 확인**

Run: `npm run validate`
Expected: Step 5와 동일 출력, exit 0.

- [ ] **Step 8: 커밋**

```bash
git add scripts/validate-profiles.js tests/validate-profiles.test.js package.json
git commit -m "feat: add profile validation script

27유형 프로필 거리 검증 CLI. 일반 유형 쌍에 L2 >= 0.5 게이트 적용,
HHHH/DRUNK 포함 쌍은 리포트만. TDD로 유틸 함수 5개 테스트."
```

---

## Task 2: Phase 0 리서치 — 18개 나머지 코드 조사

**Files:**
- Modify: `docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md` (§6.2 채움)

**목적:** FAKE, MUM, WOC! 3개는 이미 §6.1에 박제됨. 나머지 18개 코드에 대해 같은 YAML 스키마로 원작 키워드를 추출. 이 결과가 Phase 1 좌표 작성의 유일한 가드레일.

**대상 18개 코드:** FUCK, SHIT, ATM-er, BOSS, GOGO, SEXY, LOVE-R, THAN-K, THIN-K, JOKE-R, OH-NO, OJBK, ZZZZ, POOR, SOLO, IMSB, IMFW, Dior-s.

- [ ] **Step 1: 소스 URL 리스트 확보**

스펙 §3 Phase 0에 명시된 5개 소스 중 **유형별 직접 URL 제공**하는 2개를 우선:

- `https://www.sbti-test.org/en/types/{lowercase-code-or-variant}`
- `https://www.sbti.ai/en/types/{CODE}` (대문자, 특수문자 포함 `WOC!`는 URL 인코딩 주의)

교차 검증:
- `https://sbtitest.io/en/personalities` (목록 페이지에서 유형 세부 링크)
- `https://rednotememe.com/guides/sbti-personality-test` (27유형 통합 가이드)

- [ ] **Step 2: 각 코드별 WebFetch 2회**

18개 × 2소스 = 36 WebFetch. 병렬 실행 가능. 각 호출의 prompt 예시:

```
Extract the SBTI "{CODE}" personality type archetype from this page.
Report only:
1. Core archetype in 3-5 words (no full sentences)
2. Key high/low dimensions if mentioned (from: SELF_AWARE, SELF_ESTEEM, SELF_CONTROL, EMO_EXPR, EMO_STAB, EMO_EMPATHY, ATT_OPTIM, ATT_CYNIC, ATT_REAL, ACT_DRIVE, ACT_DILIG, ACT_RISK, SOC_EXT, SOC_AGREE, SOC_CONFL)
3. One notable quirk or misconception to avoid
DO NOT copy sentences verbatim. Keywords only.
```

실패 케이스 처리:
- URL이 404 또는 빈 페이지 → `sbtitest.io/en/personalities` 목록에서 링크 재탐색
- 두 소스 결과가 상충 → 두 해석 모두 YAML의 `notes`에 기록 (Phase 1에서 택일)

- [ ] **Step 3: 스펙 §6.2에 YAML 18블록 작성**

파일: `docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md`
섹션: `### 6.2 나머지 18개 (구현 세션에서 채움)` 아래의 `*공란 — Phase 0 리서치에서 작성*` 줄을 18개 YAML 블록으로 대체.

각 블록 스키마 (§6.1 참고, 동일 포맷):

```yaml
CODE:
  origin_intent: "3~5단어"
  source_sites: ["url1", "url2"]
  archetype_family: "직설 팩폭|자조 루저|허세 과시|따뜻함|사색 관찰"
  key_dimensions:
    HIGH: [축_코드_1개_이상]
    LOW:  [축_코드_1개_이상]
  naming_hint: "-러|-왕|-자|신조어|밈|-뇌|-쟁이|-보 중 1~2 후보"
  rarity_candidate: common  # 또는 rare — rare는 Dior-s만 해당(이미 잠정)
  notes: |
    원작 키 모티프 3~5단어.
    한국 재해석 방향.
    금지사항: 원작 문장 직역 방지 포인트.
```

- [ ] **Step 4: 톤 표 영향 검증**

스펙 §3 Phase 2 톤 표의 아키타입 결 분류와 §6.2의 `archetype_family`를 대조. 불일치 발견 시 §3 표 수정 (WOC!처럼 결 이동).

체크 코드 (shell):
```bash
grep -oE "archetype_family: \"[^\"]+\"" docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md | sort | uniq -c
```
Expected: 5개 결 값만 등장, 각 카운트 합이 21 (3개 선행 + 18개 신규).

- [ ] **Step 5: 커밋**

```bash
git add docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md
git commit -m "docs: complete phase 0 research for 21-type expansion

나머지 18개 코드 원작 레퍼런스 조사. 키워드만 추출, 직역 금지 가드레일 준수.
FAKE/MUM/WOC! 포함 21개 모두 아키타입 결 분류 확정."
```

---

## Task 3: Phase 1 — 21유형 좌표 작성 + 검증 + 사용자 리뷰 게이트

**Files:**
- Modify: `src/_data/types.json` (21개 추가, `description`은 빈 문자열 `""` 자리만)
- Modify: `docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md` (§7 리포트 박제)

**목적:** 21개 유형의 `code, slug, nameKo, tagline, rarity, hidden, thumbnailPath, dimensionProfile`만 먼저 확정. `description`은 Phase 2까지 `""`. 검증 스크립트 통과 후 사용자 리뷰 대기.

- [ ] **Step 1: types.json 구조 확인**

Run: `node -e "console.log(JSON.stringify(require('./src/_data/types.json')[0], null, 2))"`
Expected: 기존 DEAD 객체 출력. 스키마 필드 확인:
```
code, slug, nameKo, tagline, description, rarity, hidden, thumbnailPath, dimensionProfile
```

- [ ] **Step 2: 21유형 좌표 드래프트 작성**

`src/_data/types.json` 배열 끝에 21개 객체 append. 각 객체 스키마:

```json
{
  "code": "FUCK",
  "slug": "fuck",
  "nameKo": "<Phase 0의 naming_hint 기반 1개 선택>",
  "tagline": "<한 줄 설명, 20~35자>",
  "description": "",
  "rarity": "common",
  "hidden": false,
  "thumbnailPath": "/img/types/FUCK.jpg",
  "dimensionProfile": {
    "SELF_AWARE": 0.0,
    "SELF_ESTEEM": 0.0,
    ... (15축 모두 0.0~1.0 값)
  }
}
```

작성 원칙 (스펙 §3 Phase 1 참고):
- **slug**: `code.toLowerCase()`. 단 특수문자 `!` 등은 제거 (예: `WOC!` → `woc`, `ATM-er` → `atm-er`, `LOVE-R` → `love-r`, `THAN-K` → `than-k`, `THIN-K` → `thin-k`, `JOKE-R` → `joke-r`, `OH-NO` → `oh-no`, `Dior-s` → `dior-s`, `IMSB` → `imsb`, `IMFW` → `imfw`, `OJBK` → `ojbk`).
- **thumbnailPath**: `/img/types/{CODE}.jpg` — 원본 코드 대소문자 유지. 단 `WOC!`는 파일명에 `!` 피하려면 `/img/types/WOC.jpg`로. 일관성: `generate-og-cards.js`가 생성하는 파일명과 일치해야 함. 확인 필요.
- **hidden**: 21개 전부 `false`.
- **rarity**: Phase 0의 `rarity_candidate` 반영. 기본 `common`, 5개(Dior-s, THIN-K, FAKE, MUM, WOC!)만 `rare`.
- **dimensionProfile**: Phase 0의 `key_dimensions` HIGH/LOW를 반영. HIGH축은 0.7~0.9, LOW축은 0.1~0.3, 나머지는 0.4~0.6. 0.1 단위 quantization (기존 6유형의 0.05/0.95는 극단 케이스에만 예외).

- [ ] **Step 3: generate-og-cards.js의 파일명 생성 규칙 확인**

Run: `grep -n "thumbnailPath\|\.jpg" scripts/generate-og-cards.js`

파일명 패턴을 확인하고, 21개 `thumbnailPath`가 이 패턴과 일치하도록 조정. 불일치 시 thumbnailPath를 스크립트 생성 파일명에 맞춤.

- [ ] **Step 4: JSON 유효성 검증**

Run: `node -e "const t=require('./src/_data/types.json'); console.log('count:', t.length); console.log('codes:', t.map(x=>x.code).join(', '))"`
Expected: `count: 27` + 27개 코드 목록 (기존 6 + 신규 21).

- [ ] **Step 5: 검증 스크립트 실행**

Run: `npm run validate`
Expected: exit 0. 일반 유형 25개 × 24 / 2 = 300쌍 전부 L2 ≥ 0.5.

실패 시 (violations 출력 시):
- 충돌 쌍 중 **원작 의도가 더 뚜렷한 쪽을 보존**하고, 다른 쪽의 `dimensionProfile`에서 중간값(0.4~0.6)이었던 축 1~2개를 0.2 또는 0.8로 분산 이동.
- 수정 1회당 `npm run validate` 재실행. 최대 5회 루프.
- 5회 초과 시 좌표 재설계 필요 — 사용자에게 상위 보고.

- [ ] **Step 6: Eleventy 빌드 확인**

Run: `npx @11ty/eleventy --quiet`
Expected: 에러 없이 완료. `_site/result/` 아래 27개 디렉토리 생성.

Run: `ls _site/result/ | wc -l`
Expected: `27`

- [ ] **Step 7: 기존 스코어링 테스트 통과 확인**

Run: `npm test`
Expected: 기존 테스트 12개 모두 PASS (types.json 추가는 shape/behavior 테스트 영향 없음).

- [ ] **Step 8: 리포트 박제 — §7 좌표 테이블**

스펙 파일의 `## 7. Phase 1 좌표 테이블 (구현 세션 시 채움)` 아래 `*공란 — 구현 세션에서 작성*`을 다음 3 블록으로 대체:

1. **21유형 좌표 테이블** (마크다운 테이블: #, code, nameKo, tagline, rarity, archetype_family)
2. **15차원 프로필 테이블** (15열 × 21행)
3. **검증 리포트** (`npm run validate` 출력 복사 — 단, ANSI 이스케이프 없이 plain text로)

- [ ] **Step 9: 🛑 사용자 리뷰 게이트**

**커밋하지 말고 여기서 정지.** 사용자에게 다음 메시지 전달:

> Phase 1 좌표 작성 완료. `docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md` §7에 21유형 테이블 + 15차원 프로필 + 검증 리포트 박제했습니다. `npm run validate` exit 0, `npm test` 통과. 확인 후 승인 / 수정 요청 알려주세요.

사용자가 승인하면 Step 10으로. 수정 요청이면 반영 후 `npm run validate` 재실행 → 재리뷰.

- [ ] **Step 10: 사용자 승인 후 커밋**

```bash
git add src/_data/types.json docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md
git commit -m "feat: add 21 type dimension profiles and metadata

nameKo/tagline/rarity/15차원 프로필 확정. description은 Phase 2에서 추가.
validate-profiles 통과(300쌍 모두 L2 >= 0.5), Eleventy 빌드 27유형 페이지 생성 확인.
사용자 승인 완료."
```

---

## Task 4: Phase 2a — 직설 팩폭 배치 (3개)

**Files:**
- Modify: `src/_data/types.json` — FUCK, SHIT, POOR의 `description` 필드 채움

**대상 유형:** FUCK, SHIT, POOR

**톤:** 쿨/차갑. "어차피 안 됨" 류. 직설 팩폭. 단 메타 톤 "자조 자각"은 유지 — 본인이 팩폭하는 대상이 본인임을 알고 있음.

**작성 템플릿 (유형당 400~600자):**
1. 핵심 행동 묘사 1~2문장 (아키타입이 뭘 하는지)
2. 한국 맥락 예시 1~2문장 (회식/단톡방/연애/소비/직장 중 택)
3. 자기 인식 상태 1문장 (본인이 그걸 아는지/모르는지)
4. 킥 한 줄 (반전 자기긍정 or 팩폭)

**금지사항 (스펙 §3 Phase 2 참고):**
- 특정 직업·지역·성별 조롱
- 실명·브랜드명 ("샤넬" X, "명품 가방" O)
- 정치·종교·성적 지향 언급
- 원작 설명 문장 직역

- [ ] **Step 1: Phase 0 §6.2 재확인**

FUCK, SHIT, POOR의 `origin_intent`, `notes` 재독. 재해석 방향이 머리에 들어가야 함.

- [ ] **Step 2: 3유형 본문 작성**

각 유형의 `description` 필드를 빈 문자열 `""` → 400~600자 한국어 문단으로 치환.

글자수 체크 (작성 후):
```bash
node -e "
const t = require('./src/_data/types.json');
['FUCK','SHIT','POOR'].forEach(c => {
  const x = t.find(y=>y.code===c);
  console.log(c, 'len=', [...x.description].length);
});
"
```
Expected: 각 400~600 사이.

- [ ] **Step 3: JSON 유효성 + 빌드 확인**

Run: `node -e "require('./src/_data/types.json')"` → 에러 없음
Run: `npx @11ty/eleventy --quiet` → 성공

- [ ] **Step 4: 육안 자가 검토**

3개 본문을 나란히 읽어보기. 체크포인트:
- 반말 통일
- 첫 문장이 비슷한 구조로 시작하지 않는지 ("~한다" 3연속 등)
- 한국 맥락 예시가 3개 모두 다른 영역 (회식 / 단톡방 / 연애 중 겹침 허용하되 동일 문장 표현 금지)
- 마지막 킥 한 줄이 세 번 모두 "~다." 구조인지 체크 후 1~2개 다르게

- [ ] **Step 5: 커밋 보류 — 다음 배치까지 누적**

이 배치는 커밋하지 않음. Task 8 완료 후 한 번에 커밋.

---

## Task 5: Phase 2b — 자조 루저 배치 (6개)

**Files:**
- Modify: `src/_data/types.json` — ATM-er, SOLO, IMSB, IMFW, ZZZZ, OH-NO

**톤:** "네, 접니다" 자기인정. 자조 루저. 한국 사회에서 공감률 높은 흔한 자화상 톤.

- [ ] **Step 1: Phase 0 §6.2 재확인**

ATM-er, SOLO, IMSB, IMFW, ZZZZ, OH-NO 6개의 `origin_intent`, `notes` 재독.

- [ ] **Step 2: 6유형 본문 작성**

각 유형 `description` 400~600자 한국어 작성. 템플릿 4단 구조 (Task 4 참조).

자조 루저 톤 가이드:
- "~이다"보다 "~이라는 거다", "~인 사람" 같은 자기 3인칭화 허용
- 과한 자기비하(자살 암시 등) 금지 — "한심하다" 수준까지만
- 킥은 "그래도 잘 살아있음" 방향의 자기긍정 권장 (원작 자조 → 한국 정서는 따뜻함 약간 더)

- [ ] **Step 3: 글자수 + JSON + 빌드 검증**

```bash
node -e "
const t = require('./src/_data/types.json');
['ATM-er','SOLO','IMSB','IMFW','ZZZZ','OH-NO'].forEach(c => {
  const x = t.find(y=>y.code===c);
  const len = [...x.description].length;
  console.log(c, 'len=', len, len>=400 && len<=600 ? '✅' : '❌');
});
"
```
Expected: 6개 모두 ✅.

Run: `npx @11ty/eleventy --quiet` → 성공

- [ ] **Step 4: 배치 간 톤 중복 점검**

Task 4(직설 팩폭) 3개와 이번 6개를 나란히 읽기. "~하는 게 아니라" 같은 관용구가 9개 본문에 반복 나오는지 확인 후 분산.

- [ ] **Step 5: 커밋 보류**

Task 8 완료 후 한 번에 커밋.

---

## Task 6: Phase 2c — 허세 과시 배치 (4개)

**Files:**
- Modify: `src/_data/types.json` — BOSS, Dior-s, SEXY, GOGO

**톤:** 살짝 과장된 자뻑. 허세 과시. 단 완전 나르시시즘이 아니라 "본인도 웃기다는 걸 아는 자뻑".

- [ ] **Step 1: Phase 0 §6.2 재확인**

BOSS, Dior-s, SEXY, GOGO 4개. 특히:
- **Dior-s**: 명품 과시 주의 — 브랜드명 금지, "명품 가방/시계" 추상화
- **SEXY**: 성적 묘사 금지 — "매력 어필", "플러팅" 수준까지만
- **GOGO**: "돌진러" 급한 결정 패턴

- [ ] **Step 2: 4유형 본문 작성**

400~600자 × 4. 허세 톤 가이드:
- 자기 자랑 → 바로 뒤 자기 인식의 킥 ("근데 본인도 알고 있다")
- 과장 표현 허용 ("세상이 자기 중심으로 돌아감")
- 비하적 3인칭 대신 1인칭-자조 혼합 톤

- [ ] **Step 3: 글자수 + JSON + 빌드 검증**

```bash
node -e "
const t = require('./src/_data/types.json');
['BOSS','Dior-s','SEXY','GOGO'].forEach(c => {
  const x = t.find(y=>y.code===c);
  const len = [...x.description].length;
  console.log(c, 'len=', len, len>=400 && len<=600 ? '✅' : '❌');
});
"
```
Expected: 4개 모두 ✅.

Run: `npx @11ty/eleventy --quiet` → 성공

- [ ] **Step 4: 브랜드명·성적 묘사 스캔**

```bash
grep -iE "샤넬|구찌|에르메스|루이비통|롤렉스|베드|노출|섹슈얼" src/_data/types.json
```
Expected: 매치 없음. 있으면 추상화.

- [ ] **Step 5: 커밋 보류**

---

## Task 7: Phase 2d — 따뜻함 배치 (3개)

**Files:**
- Modify: `src/_data/types.json` — MUM, LOVE-R, THAN-K

**톤:** 다정 + 오지랖 킥. 따뜻함. 직설 팩폭 카테고리의 차가운 톤과 의도적 대비.

- [ ] **Step 1: Phase 0 §6.2 + §6.1 MUM 재확인**

MUM은 §6.1에 상세 박제됨. LOVE-R, THAN-K는 §6.2에서 확인.

주의: "따뜻함"이 "바보"로 읽히지 않게. 케어하는 쪽이 강자/주체인 톤.

- [ ] **Step 2: 3유형 본문 작성**

400~600자 × 3. 따뜻함 톤 가이드:
- 돌봄 행동 묘사 → 본인의 자기 돌봄 부재라는 킥 (MUM 예)
- "오지랖"은 공격적 프레임 → "챙김"으로 완화
- 킥은 "그 따뜻함이 스스로를 소진시킴" 류의 자기 인식

- [ ] **Step 3: 글자수 + JSON + 빌드 검증**

```bash
node -e "
const t = require('./src/_data/types.json');
['MUM','LOVE-R','THAN-K'].forEach(c => {
  const x = t.find(y=>y.code===c);
  const len = [...x.description].length;
  console.log(c, 'len=', len, len>=400 && len<=600 ? '✅' : '❌');
});
"
```
Expected: 3개 모두 ✅.

- [ ] **Step 4: 차가움 ↔ 따뜻함 대비 검토**

Task 4 직설 팩폭 3개와 이번 3개를 비교 독해. 톤 전환이 극명한지 확인. 만약 이번 3개도 차갑게 읽힌다면 재작성.

- [ ] **Step 5: 커밋 보류**

---

## Task 8: Phase 2e — 사색 관찰 배치 (5개) + 전체 커밋

**Files:**
- Modify: `src/_data/types.json` — THIN-K, JOKE-R, OJBK, FAKE, WOC!

**톤:** 한 발 떨어진 비꼼. 사색 관찰. 관조자의 거리감 유지.

- [ ] **Step 1: Phase 0 §6.2 + §6.1 FAKE/WOC! 재확인**

FAKE, WOC!는 §6.1 상세 박제. THIN-K, JOKE-R, OJBK는 §6.2.

- **FAKE**: 마스크 교체, 본인이 어느 게 진짜인지 모름
- **WOC!**: 겉 드라마틱 + 속 차분의 이중 레이어 (허세 아님!)
- **THIN-K**: 생각과잉, 결정 마비
- **JOKE-R**: 농담 뒤 진심 숨김
- **OJBK**: 적당주의 관조

- [ ] **Step 2: 5유형 본문 작성**

400~600자 × 5. 사색 관찰 톤 가이드:
- 관찰 주체가 타인이 아니라 본인 — "나는 왜 이럴까" 류
- 반문·되물음 문장 허용 ("~인 걸까")
- 킥은 반전적 자기 긍정 대신 "그러거나 말거나" 유보형

- [ ] **Step 3: 글자수 + JSON + 빌드 검증**

```bash
node -e "
const t = require('./src/_data/types.json');
['THIN-K','JOKE-R','OJBK','FAKE','WOC!'].forEach(c => {
  const x = t.find(y=>y.code===c);
  const len = [...x.description].length;
  console.log(c, 'len=', len, len>=400 && len<=600 ? '✅' : '❌');
});
"
```
Expected: 5개 모두 ✅.

- [ ] **Step 4: 21개 전체 description 육안 통독**

21개 본문 전체 순차 읽기. 체크포인트:
- 21개 중 400자 미만/600자 초과 0개
- 반복 관용구 ("~하는 사람이다", "본인도 안다" 등) 분포 고른지
- 각 아키타입 결의 톤 대비가 명확한지

```bash
node -e "
const t = require('./src/_data/types.json');
const codes = ['FUCK','SHIT','POOR','ATM-er','SOLO','IMSB','IMFW','ZZZZ','OH-NO','BOSS','Dior-s','SEXY','GOGO','MUM','LOVE-R','THAN-K','THIN-K','JOKE-R','OJBK','FAKE','WOC!'];
codes.forEach(c => {
  const x = t.find(y=>y.code===c);
  const len = [...x.description].length;
  console.log(c.padEnd(8), len, len>=400 && len<=600 ? '✅' : '❌');
});
"
```
Expected: 21개 모두 ✅.

- [ ] **Step 5: 전체 테스트 + 빌드**

Run: `npm test`
Expected: 기존 + validate 테스트 전부 PASS

Run: `npx @11ty/eleventy --quiet`
Expected: `_site/result/` 27 디렉토리

Run: `npm run validate`
Expected: exit 0

- [ ] **Step 6: 21개 본문 통합 커밋**

```bash
git add src/_data/types.json
git commit -m "feat: add 21 type descriptions

배치 순서: 직설 팩폭(3) → 자조 루저(6) → 허세 과시(4) → 따뜻함(3) → 사색 관찰(5).
각 400-600자, 금지사항(브랜드명/성적 묘사/특정 집단 조롱) 준수.
톤은 아키타입별 5결 유동 + 메타 톤 '자조 자각' 유지."
```

---

## Task 9: OG 카드 재생성

**Files:**
- Create: `src/img/types/{21개 코드}.jpg`

**목적:** 21개 신규 유형의 OG 카드 플레이스홀더 1200×630 JPG 생성. 기존 6개는 덮어씌우지 않음.

- [ ] **Step 1: 사전 환경 확인**

Run: `which magick && magick -version | head -1`
Expected: ImageMagick 경로 + 버전. 없으면 `brew install imagemagick` 필요.

Run: `ls /System/Library/Fonts/Supplemental/AppleSDGothicNeo.ttc 2>/dev/null || ls /Library/Fonts/AppleSDGothicNeo.ttc`
Expected: 폰트 파일 존재. macOS 기본 폰트.

- [ ] **Step 2: 스크립트 실행**

Run: `node scripts/generate-og-cards.js`
Expected: types.json의 27유형 모두 순회, 27개 JPG 파일 존재 보장. 기존 6개는 재생성되지만 플레이스홀더 수준이라 차이 없음.

- [ ] **Step 3: 생성 파일 수 확인**

Run: `ls src/img/types/*.jpg | wc -l`
Expected: `27` (파일명 규칙은 스크립트에 따름)

Run: `ls src/img/types/`
Expected: 27개 파일. thumbnailPath와 일대일 매핑되는지 확인.

- [ ] **Step 4: 빌드 + 1개 결과 페이지 실제 확인**

Run: `npx @11ty/eleventy --quiet`

Run: `node -e "console.log(require('fs').readFileSync('_site/result/fuck/index.html','utf8').match(/<meta property=\"og:image\" content=\"([^\"]+)\"/)[1])"`
Expected: `/img/types/FUCK.jpg` 유사 경로. OG 태그에 새 이미지 경로 박혀있음.

- [ ] **Step 5: 커밋**

```bash
git add src/img/types/
git commit -m "feat: regenerate OG cards for 21 new types

scripts/generate-og-cards.js로 신규 21개 + 기존 6개 플레이스홀더 JPG 생성.
최종 27/27. 디자이너 고퀄 이미지 교체는 별도 작업."
```

---

## Task 10: PRD §15 동기화 + 최종 검증

**Files:**
- Modify: `PRD.md` (§15)

**목적:** PRD §15 상태 요약을 27유형 완성 상태로 업데이트.

- [ ] **Step 1: 현재 §15 읽고 변경 범위 파악**

Run: `awk '/## 15./,/## [0-9]+\./' PRD.md | head -60`

확인할 문구:
- `### 남은 작업 (우선순위)` 1번 항목 "21유형 + 27문항 콘텐츠" → 21유형 완료
- `### 구현 완료` 섹션 — 27유형 포함 추가
- `### 개발 편의 레퍼런스` — `npm run validate` 명령 추가

- [ ] **Step 2: §15 수정**

`PRD.md` 편집:

(1) `### 남은 작업 (우선순위)` 1번 항목 삭제 (27문항은 이미 완료됨 — git log 확인):

BEFORE:
```
1. **카카오톡 공유 통합** — ...
2. **21유형 + 27문항 콘텐츠** — ...
```

AFTER (`카카오톡 공유 통합`도 완료된 상태라면 함께 정리 — 현재 `103f7b8` 커밋으로 완료):
```
1. **모바일 실기기 QA** — iOS Safari, Android Chrome, 카카오톡 인앱 브라우저.
2. **GA4/GTM 연동** + robots.txt + sitemap.xml.
3. **베타 배포 + 친구 테스트** — 10명 정도 실제 흐름 검증.
4. **디자이너 고퀄 OG 카드 교체** — 현재 플레이스홀더 27/27.
```

(작업 시점의 git log 기준으로 재조정 — 완료된 항목은 제거)

(2) `### 구현 완료` 리스트에 추가:
```
- **27유형 콘텐츠**: 원작 27유형 전부 한국어 재창작 완료 (nameKo/tagline/description/15차원 프로필)
- **프로필 검증**: scripts/validate-profiles.js — 일반 25개 쌍 L2 ≥ 0.5 보장
```

(3) `### 개발 편의 레퍼런스`에 추가:
```
- 프로필 검증: `npm run validate`
```

- [ ] **Step 3: 최종 체크리스트 실행**

```bash
# 1. 유형 수
node -e "console.log(require('./src/_data/types.json').length)"
# Expected: 27

# 2. description 작성됨
node -e "const t=require('./src/_data/types.json'); const empty=t.filter(x=>!x.description||x.description.length<100); console.log('empty or too short:', empty.map(x=>x.code))"
# Expected: [] (모두 작성됨)

# 3. 검증 스크립트
npm run validate
# Expected: exit 0

# 4. 테스트
npm test
# Expected: 전체 PASS

# 5. 빌드
npx @11ty/eleventy --quiet && ls _site/result/ | wc -l
# Expected: 27

# 6. OG 카드
ls src/img/types/*.jpg | wc -l
# Expected: 27
```

- [ ] **Step 4: 결과 페이지 1개 브라우저 확인 (선택)**

Run: `npm start` (eleventy --serve)
브라우저에서 `http://localhost:8080/result/fuck/` 같은 신규 유형 URL 열어 확인:
- 한국어 description 렌더링
- OG 카드 이미지 로드
- 공유 버튼 동작 (Kakao SDK는 로컬호스트 도메인 등록 여부에 따라 실패 가능 — 공유 트리거만 확인)

**주의:** 카카오톡 공유의 실기기 테스트는 별도 작업(스펙 §9 비목표의 "GA4/GTM 연동"과 함께 론칭 전 QA 배치).

- [ ] **Step 5: 최종 커밋**

```bash
git add PRD.md
git commit -m "docs: sync PRD status with 27-type completion

§15 상태 요약 업데이트: 27유형 콘텐츠 완료, validate 스크립트 등록, 남은 작업 재정렬."
```

- [ ] **Step 6: 전체 커밋 그래프 확인**

Run: `git log --oneline -10`
Expected: 최근 5~6개 커밋이 이 플랜의 시퀀스와 일치:
1. `feat: add profile validation script`
2. `docs: complete phase 0 research for 21-type expansion`
3. `feat: add 21 type dimension profiles and metadata`
4. `feat: add 21 type descriptions`
5. `feat: regenerate OG cards for 21 new types`
6. `docs: sync PRD status with 27-type completion`

---

## 완료 기준

모든 Task 완료 시:
- [ ] `node scripts/validate-profiles.js` → exit 0
- [ ] `npm test` → 전체 PASS
- [ ] `npx @11ty/eleventy --quiet` → `_site/result/` 27 디렉토리
- [ ] `ls src/img/types/*.jpg | wc -l` → 27
- [ ] `git log --oneline -6` → 이 플랜 6커밋 확인
- [ ] 사용자 최종 승인 (Task 3 Step 9 + 실행 전체 리뷰)

## 롤백 경로

- Task 3 검증 실패 루프 5회 초과 → 좌표 재설계, 사용자 보고
- Task 4~8 톤 리뷰 실패 → 해당 배치만 재작성, 다른 배치 영향 없음
- Task 9 OG 카드 생성 실패 (ImageMagick 없음) → 플레이스홀더 없이도 빌드는 성공, 카드 작업만 지연
- Task 10 최종 검증 실패 → 원인 파악 후 해당 Task로 역행, revert 대신 포워드 픽스
