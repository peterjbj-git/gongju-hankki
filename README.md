# 공주한끼

공주한끼는 공주대 학생들이 학교 주변 음식점과 카페를 지도 기반으로 탐색하고, 맛·가성비·양·청결도 평점과 키워드 평가를 통해 자신의 상황에 맞는 가게를 빠르게 선택할 수 있도록 돕는 공주대 생활권 기반 맛집/카페 지도 웹앱입니다.

## 파일 구조

```text
gongju-hankki/
├─ index.html
├─ README.md
├─ css/
│  └─ style.css
├─ js/
│  └─ app.js
├─ data/
│  └─ stores.json
└─ db/
   └─ stores_sample.csv
```

## 실행 방법

빌드 도구 없이 동작하는 정적 웹앱입니다.

1. VS Code Live Server 같은 정적 서버로 `index.html`을 엽니다.
2. 또는 터미널에서 아래 명령을 실행한 뒤 브라우저에서 `http://localhost:8000`에 접속합니다.

```bash
python3 -m http.server 8000
```

브라우저 보안 정책 때문에 `data/stores.json`을 `fetch`로 불러올 때는 파일을 직접 더블클릭하는 방식보다 로컬 서버 실행을 권장합니다.

## GitHub Pages 배포 방법

1. 이 폴더를 GitHub 저장소에 업로드합니다.
2. GitHub 저장소의 `Settings`로 이동합니다.
3. `Pages` 메뉴에서 `Source`를 `Deploy from a branch`로 선택합니다.
4. Branch를 `main`, folder를 `/root`로 선택하고 저장합니다.
5. 배포가 끝나면 GitHub Pages URL로 앱을 공유할 수 있습니다.

## 음식점 DB 수정 방법

앱은 기본적으로 `data/stores.json` 파일을 읽어 지도 핀, 가게 리스트, 상세정보, 비교 화면을 구성합니다.

새 가게를 추가하거나 기존 가게를 수정하려면 `data/stores.json`의 항목을 수정하세요. `mapX`, `mapY`는 커스텀 지도 위 핀 위치를 뜻하는 퍼센트 좌표입니다.

```json
{
  "id": "store-010",
  "name": "새 가게",
  "category": "카페",
  "type": "cafe",
  "address": "충남 공주시 신관동 ...",
  "hours": "10:00 - 22:00",
  "mainMenu": ["아메리카노", "라떼"],
  "priceRange": "3,500원~6,000원",
  "image": "이미지 URL",
  "lat": 36.47,
  "lng": 127.14,
  "mapX": 50,
  "mapY": 50,
  "ratings": {
    "taste": 5.8,
    "value": 5.5,
    "portion": 5.0,
    "cleanliness": 6.0
  },
  "keywords": {
    "food": ["재료가 신선해요"],
    "mood": ["대화하기 좋아요"],
    "etc": ["친절해요"]
  },
  "recommendFor": ["팀플", "디저트"],
  "description": "가게에 대한 간단한 설명입니다."
}
```

## 엑셀로 관리하는 방법

엑셀에서 가게 DB를 관리하려면 CSV로 저장해서 `db/stores_sample.csv`를 수정하세요. 이후 CSV 내용을 기준으로 `data/stores.json`으로 변환하거나, 처음에는 `data/stores.json`을 직접 수정해도 됩니다.

CSV의 배열형 값은 `|`로 구분하는 방식을 권장합니다.

예: `등심돈까스|치즈돈까스|카레돈까스`

## 지도 API 교체 구조

현재 1차 MVP는 실제 지도 API 대신 `mapX`, `mapY` 퍼센트 좌표로 핀을 배치하는 커스텀 지도입니다. 나중에 Kakao Map API나 Naver Map API를 붙일 때는 `js/app.js`의 `renderMapPins()` 함수를 중심으로 실제 지도 마커 생성 로직으로 교체하면 됩니다.

## 현재 구현된 기능

- 가게 이름, 카테고리, 메뉴 검색
- 커스텀 지도 핀 표시
- 지도 핀과 가게 카드 클릭 시 상세정보 표시
- 맛·가성비·양·청결도 1~7점 슬라이더 평가
- 키워드 버튼 선택 평가
- 평가 결과 `localStorage` 저장 및 평균 점수 반영
- 가게 2개 비교하기
- 모바일 우선 바텀시트 UI
