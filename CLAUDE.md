# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**공주한끼(Gongju-Hankki)** — 공주시 음식점 추천 정보를 제공하는 정적 웹 앱. 빌드 도구 없음, 프레임워크 없음, 순수 Vanilla JS + HTML + CSS.

- **프론트엔드**: 빌드 없는 정적 웹앱 (HTML/CSS/Vanilla JS), GitHub Pages 배포
- **지도**: Kakao Maps JS SDK (CDN)
- **DB**: Supabase (온라인 평점 저장), `data/stores.json` (매장 정보 정적 파일)
- **데이터 파이프라인**: Python 3 스크립트 (`requests`, `python-dotenv`)

## Development Commands

### 로컬 개발 서버 실행

빌드 단계 없음. 브라우저에서 직접 열거나 로컬 HTTP 서버를 사용:

```bash
# Python 내장 서버 (권장)
python -m http.server 8080
# 브라우저에서 http://localhost:8080 접속

# 또는 Node.js
npx serve .
```

> `file://` 프로토콜로 직접 열면 fetch()가 CORS 오류를 발생시키므로 반드시 HTTP 서버 사용.

### 데이터 파이프라인 (Python 스크립트)

```bash
# 의존성 설치
pip install -r requirements.txt

# 1. Kakao Local API로 매장 데이터 수집 (KAKAO_REST_API_KEY 필요)
python scripts/build_store_db_from_kakao.py

# 2. db/stores_master.csv → data/stores.json 변환 (브라우저가 읽는 파일)
python scripts/convert_csv_to_json.py
```

`.env` 파일에 `KAKAO_REST_API_KEY=<키>` 설정 필요 (`.gitignore`에 포함됨).

## Architecture

### 파일 구조

```
index.html            # 앱 셸 전체 (뷰, 모달, 패널 HTML 포함)
css/style.css         # 모든 스타일
js/
  config.js           # Supabase URL + anon key (공개 키)
  app.js              # 모든 앱 로직 (~52KB, ~1400줄)
data/stores.json      # 브라우저가 fetch()로 읽는 런타임 매장 데이터
db/
  stores_master.csv   # 사람이 편집하는 마스터 DB
  stores_master.json  # CSV의 JSON 백업
scripts/
  build_store_db_from_kakao.py  # Kakao API → CSV/JSON 수집
  convert_csv_to_json.py        # CSV → data/stores.json 변환
```

### 데이터 흐름

```
Kakao Local API
    ↓ (build_store_db_from_kakao.py)
db/stores_master.csv  ←→  사람이 직접 편집 (검수, 메뉴, 영업시간 등)
    ↓ (convert_csv_to_json.py)
data/stores.json  →  브라우저 fetch()  →  앱 런타임
    +
Supabase ratings 테이블  →  온라인 평점 (실시간)
```

### `js/app.js` 구조

단일 파일에 모든 로직이 있음. 주요 영역:

- **전역 상태**: `stores`, `filteredStores`, `kakaoMap`, `supabaseClient`, `sheetState` 등 모듈 레벨 변수
- **`init()`**: 앱 진입점 — JSON fetch → Supabase 연결 → 평점 로드 → 이벤트 바인딩 → 지도 초기화
- **바텀시트**: `collapsed / half / expanded` 3단계 상태, 포인터 드래그로 제어
- **`applyFiltersAndSort()`**: 카테고리·정렬·검색어 필터를 한 번에 적용
- **Supabase 연동**: `loadOnlineRatings()`, `submitRating()` — 오프라인 시 토스트로 대체(graceful degradation)
- **지도**: Kakao SDK 7초 타임아웃, 실패 시 폴백 UI 표시

### Supabase `ratings` 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `store_id` | text | 매장 ID |
| `taste/value/portion/cleanliness` | int (1–7) | 평점 슬라이더 |
| `food_keywords/mood_keywords/etc_keywords` | text[] | 키워드 |
| `device_id` | text | localStorage UUID (중복 방지) |

유니크 제약: `(store_id, device_id)` — 기기당 매장 1회 평점.

### 매장 데이터 스키마 (`data/stores.json`)

`verificationStatus` 값: `"미검수"` | `"검수필요"` | `"검수완료"` | `"제외"`  
`"제외"` 상태의 매장은 `convert_csv_to_json.py`가 자동으로 제외함.

## Key Constraints

- **빌드 없음**: npm, webpack, TypeScript 없음. 스크립트는 `index.html` 하단에 `<script>` 태그로 직접 로드.
- **`app.js` 단일 파일**: 새 기능은 이 파일에 추가. 모듈 분리 시 `index.html`의 `<script>` 태그도 함께 수정.
- **API 키**: `js/config.js`의 Supabase anon key와 `index.html`의 Kakao SDK appkey는 공개 키라 소스에 포함되어 있음. `.env`의 `KAKAO_REST_API_KEY`는 서버사이드 전용이므로 절대 커밋하지 말 것.
- **매장 데이터 수정 절차**: CSV 편집 후 `convert_csv_to_json.py` 실행 → `data/stores.json` 생성 → 커밋.
