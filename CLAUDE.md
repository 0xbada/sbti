# SBTI

MBTI 패러디 성격 테스트 **Silly/Satirical Behavioral Type Indicator**의 한국어 독립 사이트. 서버 인터랙션 없이 정적 빌드 + 클라이언트 JS만으로 30문항 퀴즈 엔진, 15차원 채점, 27유형 결과 라우팅을 구현한다.

## 프로젝트 개요

2026년 4월 중국발 바이럴 패러디 테스트를 한국어 시장에 맞춰 재구성한 독립 밈 사이트.

### 배경 — 왜 ToolPortal과 분리했나
- ToolPortal(실수령액·주휴수당 등 계산기 포털)의 애드센스 승인을 보호하기 위해 **브랜드/톤 분리**가 필요
- SBTI 유형명(DEAD, FUCK, SHIT, DRUNK 등)은 가족친화 정책과 마찰 가능성 — 포털에 섞으면 도메인 전체 제재 위험
- 성격테스트는 검색형(목적형)이 아니라 **바이럴 공유형** 트래픽이라 SEO·모니터제이션 전략이 완전히 다름
- 밈 반감기 3~6개월 → 독립 사이트면 식었을 때 관리 중단·pivot 자유로움

### ToolPortal과 공유하는 것
- 기술 스택 (11ty + Nunjucks + Vanilla JS + Cloudflare Pages)
- GA4/GTM 설정 패턴
- 반응형 한국어 UI 감성

### ToolPortal과 다른 것
- 도메인: `sbti.funhada.xyz` (별도 CF Pages 프로젝트로 배포, 커스텀 도메인 바인딩)
- 애드센스 대신 **대체 모니터제이션** 검토 (쿠팡파트너스 / 제휴링크 / 직접 광고)
- 페이지 구조: 도구 카탈로그가 아니라 **퀴즈 엔진 + 27개 결과 라우트**

## 기술 요구사항

- **서버 불필요**: 퀴즈 진행·채점·결과 라우팅 모두 클라이언트 JS
- **정적 호스팅**: Cloudflare Pages (`wrangler.json`), push 시 자동 빌드
- **SEO**: 유형별 독립 URL 필수 (e.g. `/result/DEAD/`, `/result/MALO/`) — 검색·공유 시 크롤 가능해야 함
- **카카오톡 공유 최적화**: Open Graph 메타태그 + 유형별 썸네일 이미지 필수
- **모바일 반응형**: 트래픽 95%+ 모바일 예상

## 코딩 컨벤션

- **프레임워크**: Eleventy(11ty) + Nunjucks 템플릿, Vanilla JS
- **스타일**: 전역 디자인 토큰을 `src/_includes/base.css`에 정의, 페이지별 CSS는 `src/css/{page}.css`에 분리
- **상수 관리**: 문항·차원·유형 데이터는 `src/_data/` 아래 JSON으로 분리 (Nunjucks에서도 11ty global data로 접근)
  - `src/_data/questions.json` — 30개 필수 문항 + 히든 문항
  - `src/_data/dimensions.json` — 5모델 × 3하위차원 = 15차원 스키마
  - `src/_data/types.json` — 27유형 메타데이터 (코드, 한국어명, 한줄설명, 차원 프로필, 썸네일 경로)
- **퀴즈 엔진**: `src/js/quiz.js`에서 상태머신 구현, 답변을 localStorage에 일시 저장 후 결과 계산 시 라우팅
- **채점 로직**: `src/js/scoring.js`에 순수 함수로 분리 (입력: 답변 배열, 출력: `{typeCode, dimensions, matchRate}`). 테스트 가능성 확보
- 한국어 UI, 존댓말/반말 톤은 원작의 "팩폭 자조" 감성 유지하되 혐오·차별 표현은 완화

## 파일 구조 (목표)

```
SBTI/
├── src/
│   ├── _data/
│   │   ├── questions.json      # 30+ 문항
│   │   ├── dimensions.json     # 15차원 정의
│   │   └── types.json          # 27유형 메타
│   ├── _includes/
│   │   ├── layout.njk          # 기본 레이아웃 + OG 메타
│   │   ├── result-layout.njk   # 결과 페이지 전용 (썸네일·공유 버튼)
│   │   └── base.css
│   ├── js/
│   │   ├── quiz.js             # 문항 진행 상태머신
│   │   ├── scoring.js          # 답변 → 유형 매핑 순수함수
│   │   └── share.js            # 카카오/Open Graph 공유
│   ├── css/
│   │   ├── home.css
│   │   ├── quiz.css
│   │   └── result.css
│   ├── img/types/              # 유형별 썸네일 (OG 이미지)
│   ├── index.njk               # 랜딩 + 테스트 시작 CTA
│   ├── quiz.njk                # 퀴즈 진행 페이지
│   └── result/                 # 27개 결과 페이지 (pagination으로 자동 생성)
│       └── index.njk           # types.json을 pagination으로 순회
├── .eleventy.js
├── wrangler.json
└── package.json
```

**27개 결과 페이지는 수작업 말고 Eleventy pagination으로 자동 생성**:
```njk
---
pagination:
  data: types
  size: 1
  alias: type
permalink: "/result/{{ type.code }}/"
---
```

## 채점 알고리즘

**15차원 벡터 유클리드 최근접 매칭** (PRD §14.2 확정).

입력: 30개 답변 (각각 L/M/H 3단계 평점)
처리:
1. L/M/H → 숫자 매핑 (L=1, M=2, H=3)
2. 문항별 차원 가중치로 15차원 벡터 생성
3. 각 차원 0~1 정규화
4. 27유형 `dimensionProfile`과 유클리드 거리 계산
5. 최소 거리 유형 선택, 매칭률 < 60% → HHHH 폴백

출력: `{typeCode, dimensionScores, matchRate, subType?}`

**구현 원칙:**
- `src/js/scoring.js`에 순수 함수로 분리, 거리 함수는 `computeDistance(vec1, vec2)`로 추상화 (코사인 교체 가능)
- 유형 프로필은 `src/_data/types.json` 데이터로 관리 — 알고리즘 손대지 않고 튜닝
- 스냅샷 테스트 필수: 대표 답변 세트 10개 → 기대 유형 매핑 고정, 회귀 방지

## SEO 전략

- 유형별 결과 페이지는 **공유로 유입**되므로 OG 메타가 본질 — `og:image`는 유형별 1200×630 썸네일 고정
- 랜딩/퀴즈 페이지는 **검색 유입** 타겟 → "SBTI 테스트", "SBTI 뜻", "SBTI MBTI 차이" 롱테일 키워드 콘텐츠 포함
- 경쟁 사이트 6+곳 선점 상태 (`sbti-test.com`, `sbti.global` 등) → 차별점: **한국어 원어민 리라이팅**, **카카오 공유 최적화**, **한국 밈 레퍼런스**

## 모니터제이션

- **애드센스 사용 시 위험**: 유형명 자체가 혐오/비속어로 분류될 수 있음 — 결정 전 샘플 페이지로 심사 선제 제출 권장
- 대안: **쿠팡파트너스 위젯** (성격별 추천 상품), 네이버/카카오 애드핏, 직접 제휴
- 결과 페이지 하단에 ToolPortal 교차 노출 링크 (역방향 트래픽)

## 신규 문항·유형 추가 워크플로우

1. `src/_data/questions.json`에 문항 추가 — `{id, text, hidden?, options: [{label, text, scores, triggers?}]}`
2. `src/_data/types.json`에 유형 추가 — `{code, slug, nameKo, tagline, description, rarity, hidden, dimensionProfile}`
3. `src/img/types/{code}.jpg` OG 카드 (1200×630)
   - **자동 생성**: `node scripts/generate-og-cards.js` — types.json 읽어 placeholder JPG를 6개 유형 전부 재생성. 실제 디자인 JPG로 교체 전 임시 방패.
   - 요구사항: ImageMagick(`brew install imagemagick`) + 시스템 폰트 `AppleSDGothicNeo.ttc` (macOS 기본)
4. 빌드 검증: `npx @11ty/eleventy --quiet` — 결과 페이지 수가 types.json 배열 길이와 일치하는지 확인
5. 스코어링 회귀: `npm test` — 12개 스냅샷 테스트 통과 확인

## 법적 고려사항

- 원작은 중국 크리에이터 '아푸'의 패러디 — **문항·유형명 직접 번역은 저작권 회색지대**
- 안전한 경로: 유형명/개념은 벤치마크 수준으로 참조, **문항은 한국어 원어민이 한국 맥락에서 재작성**
- 면책 고지 필수: "엔터테인먼트 목적, 임상 심리 도구 아님" 하단 명시

## 커밋 컨벤션

ToolPortal 규칙 준용 — 기능별 분리 커밋:
1. `docs: add SBTI implementation plan`
2. `feat: scaffold Eleventy + CF Pages project`
3. `feat: add questions and dimensions data`
4. `feat: implement quiz state machine`
5. `feat: implement scoring algorithm`
6. `feat: add 27 type result pages`
7. `feat: add Kakao share integration`
