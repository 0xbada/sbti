# SBTI 21유형 확장 설계

**작성일:** 2026-04-23
**대상 작업:** `src/_data/types.json`의 6유형 → 27유형 확장
**범위:** MVP P0 잔여 작업 중 "21유형 콘텐츠 확장" (PRD §15 남은 작업 1번)
**상태:** 설계 확정 → 구현 대기

---

## 1. 배경

PRD §15(2026-04-23 기준) 상태:
- 현재 `types.json`: 6유형 (DEAD, MALO, MONK, CTRL, HHHH, DRUNK)
- 원작 27유형 중 21개 미작성: FUCK, SHIT, ATM-er, BOSS, GOGO, SEXY, LOVE-R, MUM, THAN-K, THIN-K, FAKE, JOKE-R, OH-NO, WOC!, OJBK, ZZZZ, POOR, SOLO, IMSB, IMFW, Dior-s
- OG 카드: 6/27 플레이스홀더만 존재
- 채점 엔진·pagination·퀴즈 UI는 이미 27유형 수용 가능 — 데이터 추가만 남음

**왜 지금:** 카카오 공유·랜딩 SEO·30문항 커버리지 모두 완료. 남은 P0 중 가장 큰 덩어리이자, 완료 없이는 사실상 론칭 불가 (27유형 약속된 상품에 6개만 매칭은 사용자 기대 위반).

**왜 스펙 먼저:** description 21개 × 400~600자 = 10,000단어 이상. 차원 프로필 좌표가 잘못 잡히면 전체 재작성. 선 좌표 + 후 본문의 2-phase로 재작성 리스크 차단.

---

## 2. 결정 로그 (브레인스토밍 합의)

| # | 질문 | 선택 | 비고 |
|---|---|---|---|
| 1 | 작업 분할 | **C. 2-phase (좌표 → 본문)** | 좌표가 잘못 잡히면 본문 재작성 — 저비용 리뷰를 먼저 |
| 2 | 톤 정책 | **B. 아키타입별 유동** | MUM 따뜻함, FUCK 직설 등 원작 결 존중. 메타 톤은 "자조 자각" 유지 |
| 3 | 네이밍 접미사 | **B - "-충" 제외** | 허용: -러/-왕/-자/신조어/밈/-뇌/-쟁이/-보 (8결). -충은 혐오 프레임 회피 |
| 4 | 프로필 배치 | **B. 직관 튜닝 + 검증 스크립트** | 351쌍 최소 거리 자동 검증. 스냅샷 회귀는 실제로 적음 (기존 테스트는 shape/behavior만) |
| 5 | rarity 분포 | **B. 중도 (rare 5개)** | Dior-s, THIN-K, FAKE, MUM, WOC! 잠정. Phase 1에서 최종 확정 |
| 6 | 원작 참조도 | **C + A 풀 리서치** | 21개 코드 전부 원작 키워드 조사. 본문은 완전 한국 재창작 |

---

## 3. 워크플로우 (3-Phase)

### Phase 0 — 원작 레퍼런스 리서치

**대상 소스 (우선순위, 2026-04-23 재조사 반영):**
1. `sbti-test.org/en/types/{code}` — 유형별 직접 URL 제공, 설명 상세
2. `sbti.dev/en/result/{slug}` — 15차원 프로필 수치 힌트 포함
3. `sbti.ai/en/types/{code}` — 별칭("The WTF Person" 등) 풍부
4. `sbtitest.io/en/personalities` — 27유형 통합 목록, 교차 검증용
5. `rednotememe.com/guides/sbti-personality-test` — 원작 맥락(2026-04-09 WeChat 바이럴) 배경 설명
6. `nano-banana.com/ko/sbti` — 한국어 번역체 참조(번역체 흡수 경계)

> 참고: PRD §4에 명시된 `sbti.global`, `sbti-test.com` 등 일부 도메인은 현재 검색 노출이 약하거나 부분 이전됨. 위 1~5번이 2026-04 기준 실질 레퍼런스. PRD §4 업데이트는 별도 작업(비목표).

**산출 스키마 (21개 코드 × 다음 구조, 설계 문서 §6에 박제):**

```yaml
CODE:
  origin_intent: "3~5단어 핵심 아키타입"
  source_sites: ["sbti.global", "sbti-test.com"]
  archetype_family: "직설 팩폭|자조 루저|허세 과시|따뜻함|사색 관찰"
  key_dimensions:
    HIGH: [축 코드 1~2개]
    LOW:  [축 코드 1~2개]
  naming_hint: "-러|-왕|-자|신조어|밈|-뇌|-쟁이|-보 중 택일 후보"
  rarity_candidate: "common|rare"
  notes: "어원 모호 케이스 — 복수 해석 병기"
```

**가드레일:**
- 원작 설명 문장 저장 금지 — 키워드 3~5단어만. 저작권·번역체 유입 방지
- 원작 dimensionProfile 공개 시 high/low 경향만 메모, 구체 숫자 재활용 금지
- 어원 모호 케이스(e.g. MUM: 엄마 vs 과묵)는 복수 해석 병기 후 Phase 1에서 택일

**의도된 비효율:** Phase 1에서 좌표 잡을 때 이 메모를 **체크리스트로만** 사용. 원작 직역 아님.

### Phase 1 — 좌표 테이블 (nameKo · tagline · rarity · dimensionProfile)

**리뷰용 산출 포맷:**

```markdown
## 21유형 좌표 테이블

| # | code | nameKo | tagline | rarity | 아키타입 결 |
|---|---|---|---|---|---|
| 1 | FUCK | [제안] | [제안] | common | 직설 팩폭 |
| ... |

## 15차원 프로필 (0.0~1.0)

| code | SELF_AWARE | SELF_ESTEEM | ... | SOC_CONFL |
|---|---|---|---|---|
| FUCK | 0.3 | ... | ... |

## 검증 리포트 (validate-profiles.js 출력)
- 351쌍 L2 거리 계산
- 임계값 0.5 미만 쌍: N개
- 각 신규 유형의 최근접 유형
- 슈퍼축 분포 통계
```

**dimensionProfile 작성 원칙:**
- 0.1 단위 quantization (0.0, 0.1, ..., 1.0) — 11단계
- 기존 6유형 일관성 위해 극단 케이스(0.05/0.95)는 예외 허용
- 각 유형: 15축 중 2~4축 극단(≤0.2 또는 ≥0.8) + 나머지 중간값(0.4~0.6)
  - "뾰족한 개성 + 흐릿한 나머지" 패턴 — 유형 간 구별 강화

**검증 임계값:**
- 일반 유형 25개(HHHH·DRUNK 제외) → 25C2 = 300쌍 전부 L2 ≥ **0.5** (fail 게이트)
- HHHH·DRUNK는 `findBestMatch`에서 제외되므로(`src/js/scoring.js`) 엄격 검증 대상 아님 — 리포트에만 포함 (info only)
- 즉 27유형 전체 351쌍은 계산·리포트하되, exit 1 조건은 300쌍만

**Phase 1 종료 조건:**
1. 모든 351쌍 L2 ≥ 0.5 (검증 스크립트 exit 0)
2. 사용자가 좌표 테이블 + 검증 리포트 승인

### Phase 2 — 본문 descriptions

**작성 규격 (유형당):**
- 분량: 400~600자 한국어
- 문단 구조:
  1. 핵심 행동 묘사 (1~2문장)
  2. 한국 맥락 예시 — 회식/단톡방/연애/소비 (1~2문장)
  3. 자기 인식 상태 — 본인이 아는지/모르는지 (1문장)
  4. 킥 한 줄 — 반전 자기긍정 or 팩폭
- 존댓말/반말: **반말 기본** (기존 6유형 준수)

**아키타입별 톤 (질문 2 B 전략):**

| 결 | 화법 | 해당 유형 (잠정) |
|---|---|---|
| 직설 팩폭 | 쿨/차갑 | FUCK, SHIT, POOR |
| 자조 루저 | "네, 접니다" | ATM-er, SOLO, IMSB, IMFW, ZZZZ, OH-NO |
| 허세 과시 | 살짝 과장된 자뻑 | BOSS, SEXY, GOGO |
| 따뜻함 | 다정 + 오지랖 킥 | MUM, LOVE-R, THAN-K |
| 사색 관찰 | 한 발 떨어진 비꼼 | THIN-K, JOKE-R, OJBK, FAKE, WOC!, Dior-s |

**Phase 0 선행 검증 완료 (§6 참고):**
- **FAKE**: "사색 관찰" 확정 (원작: 마스크 체인저, 본인 자각형)
- **MUM**: "따뜻함" 확정 (원작: 엄마/케어테이커, 침묵 해석 폐기)
- **WOC!**: "사색 관찰" 확정 (원작: 겉 드라마틱 리액션 + 속 차분 관찰의 이중 레이어 — 허세 과시 아님)
- **Dior-s**: "사색 관찰" 재확정 (원작: 소비주의 거부, low-desire mode의 평화 — 명품 브랜드명은 표면, 본질은 관조 — 2026-04-23 구현 세션 리서치 결과)

**작성 순서 (배치):**
1. 직설 팩폭 (톤 기준점)
2. 자조 루저
3. 허세 과시
4. 따뜻함
5. 사색 관찰

각 배치 끝 자가 톤 점검: 이전 배치 대비 중복 어구·클리셰 확인.

**금지 사항:**
- 특정 직업·지역·성별 조롱
- 실명·브랜드명 직접 언급 (명품은 "명품 가방"으로 추상화)
- 정치·종교·성적 지향 언급
- 원작 설명 문장 직역 — Phase 0 메모는 키워드만 활용

**Phase 2 완료 조건:**
1. 21개 description 모두 400~600자 범위
2. `npm test` 통과
3. `npx @11ty/eleventy --quiet` 성공, `_site/result/` 27 디렉토리 생성
4. `node scripts/generate-og-cards.js` 실행, `src/img/types/` 27 JPG

---

## 4. 검증 스크립트 `scripts/validate-profiles.js`

**위치:** `scripts/validate-profiles.js` (기존 `generate-og-cards.js`와 같은 디렉토리)

**의존성:** 없음 (vanilla Node, ~80줄)

**입력:** `src/_data/types.json`, `src/_data/dimensions.json`

**출력:**
- stdout 리포트
- 충돌 발견 시 exit 1, 아니면 exit 0

**리포트 구성:**
1. 총 유형 수 + 비교 쌍 수
2. 최소 거리 top 10 쌍 (거리·충돌 여부 표시)
3. 임계값 미만 쌍 전수 + 공통 극단 축 + 조정 제안
4. 각 신규 유형의 최근접 유형
5. 슈퍼축 분포 통계 (min/max/std)

**구현 규약:**
```js
const types = require("../src/_data/types.json");
const dimensions = require("../src/_data/dimensions.json");

const axisCodes = dimensions.models.flatMap(m => m.axes.map(a => a.code));
const THRESHOLD = 0.5;

function l2(a, b) {
  return Math.sqrt(axisCodes.reduce((sum, c) =>
    sum + ((a[c] ?? 0.5) - (b[c] ?? 0.5)) ** 2, 0));
}

// 351쌍 모두 계산 → 정렬 → 리포트
// exit 1 조건은 "일반 유형끼리의 쌍 중 L2 < 0.5"만 대상
// (HHHH 또는 DRUNK가 포함된 쌍은 리포트 info, fail 제외)
const isRegular = t => !t.fallback && !t.hidden;
```

**CI 통합:**
- `package.json` scripts에 `"validate": "node scripts/validate-profiles.js"` 추가
- `npm test`와 분리 (스코어링 단위 테스트와 관심사 다름)
- types.json 수정 시 수동 실행

**미포함 (YAGNI):**
- 자동 조정 알고리즘 (제안 문구만 출력)
- HTML 리포트
- 과거 결과 저장·diff

---

## 5. 산출물 · 커밋 전략

**신규 파일:**
```
scripts/validate-profiles.js                   # 프로필 거리 검증
docs/superpowers/specs/2026-04-23-*.md         # 이 설계 문서
src/img/types/{21개 코드}.jpg                  # OG 플레이스홀더
```

**수정 파일:**
```
src/_data/types.json                           # 6 → 27
PRD.md                                         # §15 상태 동기화
package.json                                   # "validate" script 추가
```

**자동 생성 (빌드):**
```
_site/result/{21개 slug}/index.html            # Eleventy pagination
```

**커밋 시퀀스:**
1. `docs: add 21-type expansion design spec` — 이 설계 문서 (브레인스토밍 종료 직전)
2. `feat: add profile validation script` — Phase 1 착수 전
3. `feat: add 21 type dimension profiles and metadata` — Phase 1 완료
4. `feat: add 21 type descriptions` — Phase 2 본문
5. `feat: regenerate OG cards for 21 new types` — 이미지
6. `docs: sync PRD status with 27-type completion` — 문서 최종화

**롤백 경로:**
- Phase 1 검증 실패 (L2 < 0.5 쌍 존재) → 해당 쌍 한쪽만 재튜닝, 전체 재작성 아님
- Phase 2 톤 리뷰 실패 → 해당 배치만 재작성, 좌표 유지

---

## 6. Phase 0 리서치 결과

> 구현 세션에서 WebFetch로 나머지 18개 코드 리서치 후 §3 Phase 0 스키마대로 채움. 완료 전 Phase 1 착수 금지.
> 아래 3개(FAKE, MUM, WOC!)는 2026-04-23 브레인스토밍 중 톤 분류 검증을 위해 선행 조사된 결과.

### 6.1 선행 조사 완료 (2026-04-23)

```yaml
FAKE:
  origin_intent: "마스크 체인저, 페르소나 교체, 소셜 카멜레온"
  source_sites: ["sbti-test.org", "sbti.ai", "rednotememe.com"]
  archetype_family: "사색 관찰"
  key_dimensions:
    HIGH: [SOC_AGREE, SOC_CONFL]  # 갈등 회피, 관계 유연
    LOW:  [SELF_CONTROL, SELF_ESTEEM]  # 고집 낮음, 내면 공허감
  naming_hint: "-쟁이(가면쟁이) | 신조어(페르소나러) 중 택일"
  rarity_candidate: rare
  notes: |
    원작 키 모티프: "late at night the masks peel off, nothing inside"
    → 한국 재해석: "상황별 자동전환, 본인도 어느 게 진짜인지 모름"
    한국 맥락 예시 후보: 상사 앞/친구 앞/SNS에서 각기 다른 나.
    금지: 원작의 "empty inside" 문학적 표현 직역.

MUM:
  origin_intent: "케어테이커, 모두의 엄마, 돌봄으로 사랑 표현"
  source_sites: ["sbti-test.org"]
  archetype_family: "따뜻함"
  key_dimensions:
    HIGH: [EMO_EMPATHY, SOC_AGREE, ACT_DILIG]
    LOW:  [SELF_ESTEEM]  # 본인은 뒷전
  naming_hint: "-러(엄마러?) | 신조어(모두의엄마) — 확정 단계에서 2~3후보 비교"
  rarity_candidate: rare
  notes: |
    원작 키 모티프: "carries snacks, remembers allergies, '잘 들어갔어?' 자정 문자"
    → 한국 재해석: 단톡방·회식·여행 준비에서 항상 디테일 챙기는 사람.
    어원 재확인: "엄마" 해석 확정, "mum's the word(침묵)" 해석 폐기.
    주의: "오지랖"으로 공격적 해석 시 원작 의도(돌봄) 훼손 — 킥은 "자기 돌봄 부재"로.

WOC!:
  origin_intent: "드라마틱 리액터, 겉 과장 + 속 차분 이중 레이어"
  source_sites: ["sbti.ai", "sbti-test.org", "sbti.dev"]
  archetype_family: "사색 관찰"  # 허세 과시 아님
  key_dimensions:
    HIGH: [EMO_EXPR, EMO_STAB, SELF_ESTEEM]  # 표현 강함 + 내면 안정
    LOW:  [EMO_EMPATHY]  # 과몰입 공감은 낮음 (의외 포인트)
  naming_hint: "-왕(탄식왕) | 신조어(오마갓러) — 확정 단계에서 결정"
  rarity_candidate: rare
  notes: |
    원작 키 모티프: "holy crap / no way" 과장 + "yes, that tracks" 속 차분.
    "dramatic outburst is final comment, not start of intervention"
    → 한국 재해석: "와 대박" 연발하지만 실은 이미 예상했고, 더 이상 캐묻지 않음.
    한국 맥락 예시 후보: 친구 썰 듣고 "헐?!?" 하지만 속으로 "그럴 줄 알았어".
    주의: 과시·자뻑으로 오독하지 말 것 — 드라마틱 표현은 스킨이고 코어는 관조자.
```

### 6.2 나머지 18개 (2026-04-23 구현 세션 작성)

**소스 상태:** `sbti-test.org/en/types/{slug}` 주 소스(풍부), `rednotememe.com/guides/sbti-personality-test` 단일 페이지로 전 유형 교차검증. `sbti.ai`=403, `sbti.dev`=연결거부 — 2차 소스 대체.

```yaml
FUCK:
  origin_intent: "반사적 욕, 생존 본능 에너지"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "직설 팩폭"
  key_dimensions:
    HIGH: [EMO_EXPR, SOC_EXT]
    LOW:  [SELF_CONTROL, EMO_EMPATHY]
  naming_hint: "-러(욕쟁이러) | 신조어(풀자) — 草者 중의적 방지"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "FUCK YEAH / FUCK OFF" 양극 감정 표현, 草者(풀남) 시각 말장난.
    → 한국 재해석: "존나 / 아 씨" 반사 욕이 기본 반응, 나쁜 의도 아님. 반응이 빠름.
    한국 맥락 예시: 단톡방 드립에 바로 "ㅋㅋ 미쳤네", 회식에서 분위기 띄움.
    금지: 실제 비속어 남발, 폭력성 암시.

SHIT:
  origin_intent: "냉소 리얼리스트, 입은 욕 손은 엑셀"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "직설 팩폭"
  key_dimensions:
    HIGH: [SELF_AWARE, SELF_ESTEEM, ACT_DRIVE]
    LOW:  [ATT_OPTIM, SOC_EXT, EMO_EMPATHY]
  naming_hint: "-러(씨부리러) | 신조어(입털이) | -뇌(염세뇌) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "이 프로젝트 진짜 ㅈ같네. 손: 조용히 엑셀 열기."
    → 한국 재해석: 불평하면서 결국 다 해내는 사람. 말과 행동의 이중성.
    FUCK과 대비: FUCK은 반사적/즉흥, SHIT은 의도적/성과지향.
    금지: 진짜 무기력/우울로 해석 — 이 타입은 묵묵히 하는 쪽.

ATM-er:
  origin_intent: "일방적 제공자, 호구성 베풂"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "자조 루저"
  key_dimensions:
    HIGH: [EMO_EMPATHY, ACT_DILIG, SOC_AGREE]
    LOW:  [SELF_ESTEEM, SELF_CONTROL]
  naming_hint: "-러(퍼주러/계산러) | 신조어(송금러) | -보(호구보) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "送钱者 — 항상 계산서를 집는 사람, 부자 아님."
    → 한국 재해석: 회식비 선결제, 더치페이 어색해서 다 내버림. 속은 지침.
    한국 맥락 예시: 생일선물·경조사 기억 체크, "내가 살게" 습관.
    금지: 바보/멍청이 조롱으로 기울기 — 자각은 있음, 멈추지 못할 뿐.

BOSS:
  origin_intent: "자연 리더, 즉결 판단자"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "허세 과시"
  key_dimensions:
    HIGH: [SELF_ESTEEM, ACT_DRIVE, SOC_CONFL]
    LOW:  [SOC_EXT, EMO_EXPR]
  naming_hint: "-왕(결정왕) | 신조어(리더러) | -자(지휘자) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "리더십 공백 시 주도, 방치 흐름보다 과한 추진 선호."
    → 한국 재해석: 회의 정체 시 "자, 결론내죠" 자기가 정리. 선두 취향.
    허세 자기인식: 본인도 "내가 나섰다"는 걸 알고 쿨한 척.
    금지: 독재/갑질 톤 — 한국 '꼰대' 프레임 회피, '자진 중재자' 결.

GOGO:
  origin_intent: "즉행 모멘텀, 생각 전에 몸부터"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "허세 과시"
  key_dimensions:
    HIGH: [ACT_DRIVE, ACT_RISK, SOC_EXT]
    LOW:  [SELF_AWARE, ATT_REAL]
  naming_hint: "-러(돌진러) | 신조어(질주러) | -왕(실행왕) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "행동 충동이 숙고 충동을 앞섬, 다른 사람 숙고 끝나기 전 이미 떠남."
    → 한국 재해석: "일단 ㄱㄱ", 계획보다 실행. 실수도 빠르게 반복.
    BOSS와 구분: BOSS는 판단 후 지시, GOGO는 판단 스킵하고 몸.
    금지: 무능/경솔 조롱 — '에너지 과잉'의 건강한 척 프레임 유지.

SEXY:
  origin_intent: "매력 어필, 관심 욕구, 존재감 과다"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "허세 과시"
  key_dimensions:
    HIGH: [SELF_ESTEEM, SOC_EXT, EMO_EXPR]
    LOW:  [SOC_AGREE, EMO_EMPATHY]
  naming_hint: "-러(매력러) | 신조어(끼부자) | -쟁이(매력쟁이) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "방에 들어가면 시선 집중, 아우라 기반 매력."
    숨은 취약: "아무도 안 볼 때 나는 여전히 가치 있는가?"라는 내면 질문.
    → 한국 재해석: SNS 셀카·인스타 스토리 자주, 인정 욕구 높음. 본인도 앎.
    금지: 성적 묘사/외모 평가 — 한국 맥락에서 '매력 어필', '끼'까지만.

LOVE-R:
  origin_intent: "감정 과몰입, 이상주의 로맨티스트"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "따뜻함"
  key_dimensions:
    HIGH: [EMO_EXPR, ATT_OPTIM, EMO_EMPATHY]
    LOW:  [SELF_AWARE, EMO_STAB]
  naming_hint: "-러(사랑러) | 신조어(연애뇌) | -뇌(로맨뇌) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "일상도 순간 영화 장면, 불꽃 아닌 안정은 힘들어함."
    → 한국 재해석: 카톡 '♥' 남발, 기념일 계산, 드라마 대사 실생활 인용.
    MUM과 구분: MUM은 돌봄(실용), LOVE-R는 감정 몰입(판타지).
    금지: 여성 전유물화, 나이대 조롱 — 연령·성별 중립으로 유지.

THAN-K:
  origin_intent: "감사 과잉, 양심적 오버싱커"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "따뜻함"
  key_dimensions:
    HIGH: [EMO_EMPATHY, SOC_AGREE, SELF_AWARE]
    LOW:  [EMO_EXPR, SELF_ESTEEM]
  naming_hint: "-러(감사러) | 신조어(고마워러) | -보(양심보) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "작은 호의도 평생 빚처럼 가슴에 남아 과한 답례."
    → 한국 재해석: 커피 한 잔 받으면 다음날 선물로 갚음. '과잉 답례' 부담.
    LOVE-R와 구분: LOVE-R는 감정 분출, THAN-K는 부채감 내면화.
    금지: 소심/약자 조롱 — '타인 생각 잘함'의 건강한 결 유지.

THIN-K:
  origin_intent: "분석 마비, 완벽주의 계산러"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "사색 관찰"
  key_dimensions:
    HIGH: [SELF_AWARE, ATT_REAL, ATT_CYNIC]
    LOW:  [ACT_DRIVE, SOC_EXT, ACT_RISK]
  naming_hint: "-러(생각러) | 신조어(뇌피셜러) | -뇌(고민뇌) 중 택"
  rarity_candidate: rare
  notes: |
    원작 키 모티프: "100초 생각, 실행을 생각으로 대체."
    "한 번만 더 생각했으면 피할 수 있었을 실수의 공포."
    → 한국 재해석: 결제 전 리뷰 2시간, 스크린샷 폴더 가득. 결정 피로.
    JOKE-R/OJBK와 구분: THIN-K는 결정 전 단계, JOKE-R는 결정 후 회고, OJBK는 결정 자체 포기.
    금지: 지능 낮음/바보 조롱 — 오히려 영리함이 독이 된 케이스.

JOKE-R:
  origin_intent: "유머 방패, 농담 뒤 진심 숨김"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "사색 관찰"
  key_dimensions:
    HIGH: [EMO_EMPATHY, EMO_EXPR, ATT_CYNIC]
    LOW:  [SELF_ESTEEM, SELF_AWARE]
  naming_hint: "-러(드립러) | 신조어(광대러) | -쟁이(농담쟁이) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "유머가 생존 장비, 분위기 무마용. 가장 깊이 숨는 타입."
    "자신이 펀치라인이 된 순간의 자각 — 슬픈 광대."
    → 한국 재해석: 분위기 무거우면 드립 던짐, 본인 얘긴 못함. '괜찮아?' 받으면 드립으로 탈출.
    금지: 광대=바보 프레임 — 감정 지능 높은 쪽. 'ㅋㅋ' 남발 속 진심 차단.

OH-NO:
  origin_intent: "불안한 재앙 예측자, 최악 상정"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "자조 루저"
  key_dimensions:
    HIGH: [SELF_AWARE, ATT_CYNIC, ACT_DILIG]
    LOW:  [EMO_STAB, ATT_OPTIM, SOC_EXT]
  naming_hint: "-러(걱정러) | 신조어(망했어러) | -뇌(불안뇌) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "컵이 기울기 전에 이미 쏟아진 장면, 합선, 소방훈련 상상."
    "재난 감지 최적화된 신경계 — 위기 때 쓸모, 평소엔 진 빠짐."
    → 한국 재해석: 여행 전 최악 시나리오 n개, 약속 30분 전 도착. '우찌살지' 입버릇.
    IMSB/IMFW와 구분: OH-NO는 외부 재난 걱정, IMSB는 자기 탓, IMFW는 무능감.
    금지: 불안장애 의학 표현 — '습관적 상상' 수준까지만.

OJBK:
  origin_intent: "초연한 철학 황제, 사소 무관심"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "사색 관찰"
  key_dimensions:
    HIGH: [EMO_STAB, ATT_REAL]
    LOW:  [ACT_DRIVE, EMO_EXPR, ATT_OPTIM]
  naming_hint: "-러(오키러) | 신조어(아무거나러) | -보(무심보) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "점심 쌀/면, 황제의 평정으로 '아무거나'. 초연한 무관심."
    → 한국 재해석: 단톡방 투표 '아무거나 괜찮아' 담당. 짜증 아님, 진심 OK.
    THIN-K와 구분: THIN-K는 고민으로 마비, OJBK는 고민 자체 불필요.
    금지: 무기력/우울 — 오히려 선택 피로 면역된 고수.

ZZZZ:
  origin_intent: "회피 잠수러, 데드라인형 폭발력"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "자조 루저"
  key_dimensions:
    HIGH: [SELF_AWARE]
    LOW:  [ACT_DRIVE, ACT_DILIG, SOC_EXT, ATT_OPTIM]
  naming_hint: "-러(잠수러) | 신조어(읽씹러) | -보(미루보) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "읽지 않은 메시지 99개 무시, 진짜 마감에만 등장."
    "선제 동기 아닌 막판 압박에 최적화."
    → 한국 재해석: 카톡 '1' 안 지움, 과제 마감 3시간 전 등장. 결과는 오히려 괜찮음.
    금지: 나태/무책임 조롱 — '압박 연비 높음'의 역설 강조.

POOR:
  origin_intent: "레이저 집중 미니멀리스트"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "직설 팩폭"
  key_dimensions:
    HIGH: [SELF_AWARE, ACT_DRIVE, ACT_DILIG]
    LOW:  [EMO_EXPR, SOC_EXT, ATT_OPTIM]
  naming_hint: "-러(긴축러) | 신조어(짠돌이) | -뇌(절약뇌) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프(sbti-test.org): "단일 목표에 자원 집중, 자원 부족 아닌 의도적 압축."
    원작 키 모티프(rednotememe): "구조적으로 돈 없음, 자조하되 패배 아님."
    → 한국 재해석: 두 해석 융합 — "짠내 + 목표 집중". 소비 vs 저축 중 한쪽 극단.
    SHIT/FUCK와 구분: POOR는 자원 관련, SHIT/FUCK는 태도.
    금지: 저소득층/빈곤 조롱 — '자발적 미니멀'과 '짠내' 유머 영역까지만.

SOLO:
  origin_intent: "보호적 고립자, 거리=안전"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "자조 루저"
  key_dimensions:
    HIGH: [SELF_CONTROL, SELF_AWARE]
    LOW:  [SOC_EXT, EMO_EMPATHY, ACT_DRIVE]
  naming_hint: "-러(혼자러) | 신조어(나홀로러) | -보(솔로보) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "거리가 실망보다 관리하기 쉬움, 보호 메커니즘."
    → 한국 재해석: 단체 사진 찍어주는 포지션, '둘러싸여 있어도 외부인' 감각.
    금지: '연애 불가/외톨이' 조롱 — '선택적 고립'의 주체성 유지.

IMSB:
  origin_intent: "자책 무한루프, 내부 검열관"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "자조 루저"
  key_dimensions:
    HIGH: [EMO_EMPATHY, SELF_AWARE]
    LOW:  [SELF_ESTEEM, EMO_STAB, ATT_OPTIM]
  naming_hint: "-러(자책러) | 신조어(내탓러) | -뇌(자책뇌) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "타인 실수엔 너그럽고 본인 실수는 잔인하게 복기."
    "작은 실패를 큰 증거로 만드는 루프."
    → 한국 재해석: 단톡방 오타 하나도 '다들 이상하게 봤을 듯', 대화 끝나고 복기.
    OH-NO와 구분: OH-NO는 외부 재난, IMSB는 자기 검열.
    금지: 자살·자해 암시 — '한심하다' 수준까지만.

IMFW:
  origin_intent: "취약 투명, 진심 무방비 내향"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "자조 루저"
  key_dimensions:
    HIGH: [EMO_EMPATHY, SOC_AGREE]
    LOW:  [SELF_ESTEEM, ACT_DRIVE, EMO_STAB]
  naming_hint: "-러(무쓸모러) | 신조어(투명러) | -보(순두부보) 중 택"
  rarity_candidate: common
  notes: |
    원작 키 모티프: "진심 한 조각에 전적 신뢰 넘기는 역설."
    "낮은 베이스 + 급등 감정 투자."
    → 한국 재해석: 누가 조금만 챙겨주면 '감동해서' 올인, 상처도 깊음.
    IMSB와 구분: IMSB는 자기 검열, IMFW는 과잉 신뢰/취약.
    금지: '민폐/쓸모없음' 직격 — 취약성을 존엄 있게.

Dior-s:
  origin_intent: "소비주의 거부, 저욕망 평화"
  source_sites: ["sbti-test.org", "rednotememe.com"]
  archetype_family: "사색 관찰"
  key_dimensions:
    HIGH: [SELF_AWARE, ACT_DILIG, ATT_CYNIC]
    LOW:  [SOC_EXT, EMO_EXPR, ATT_OPTIM]
  naming_hint: "-러(저욕망러) | 신조어(디올러/됐어러) | -뇌(탈소비뇌) 중 택"
  rarity_candidate: rare
  notes: |
    원작 키 모티프(sbti-test.org): "소비 야망 거부, 저욕망 모드의 평화, 자기계발 허슬 opt-out."
    원작 키 모티프(rednotememe): "바닥 Loser, 반등 대기, 결국 글로업 기대."
    → 두 해석 합의: "Dior 브랜드명은 함정. '됐어(die)'+'s' 말장난 — 소비 거부/바닥 자기인정의 사색 관찰 결."
    §3 톤표 이동: 기존 '허세 과시' → '사색 관찰' (2026-04-23 리서치에서 재분류, OJBK와 한 쌍).
    금지: 명품 브랜드명 언급 — 'Dior'는 코드일 뿐, 본문에선 '명품', '브랜드 과시' 수준 추상화 혹은 언급 회피.
```

---

## 7. Phase 1 좌표 테이블 (구현 세션 시 채움)

> 구현 세션에서 §3 Phase 1 포맷으로 좌표 + 검증 리포트 작성 후 사용자 리뷰 게이트.

*공란 — 구현 세션에서 작성*

---

## 8. 작업 후 확인 체크리스트

- [ ] `node scripts/validate-profiles.js` → exit 0
- [ ] `npm test` → 기존 테스트 전부 통과
- [ ] `npx @11ty/eleventy --quiet` → `_site/result/` 27 디렉토리 생성
- [ ] `ls src/img/types/*.jpg | wc -l` → 27
- [ ] 카카오톡 공유 테스트: 신규 유형 1개 OG 카드 실제 공유 (모바일 실기기)
- [ ] PRD §15 상태 동기화 커밋
- [ ] description 톤 일관성 육안 검토 (21개 통독)

---

## 9. 스코프 외 (명시적 비목표)

- 30 → 40문항 확장 (별도 작업)
- 히든 문항 추가 (§14.6, 별도 작업)
- OG 카드 디자이너 교체 (플레이스홀더 유지)
- GA4/GTM 연동 (별도 작업)
- 랜딩 SEO 추가 콘텐츠 (완료됨)

---

## 10. 다음 세션 입력 (구현 착수 시)

```
설계 문서: docs/superpowers/specs/2026-04-23-sbti-21-types-expansion-design.md
Phase 0부터 시작. 21개 코드 리서치 → 문서 §6 채우기 → 사용자 리뷰 → Phase 1.
```
