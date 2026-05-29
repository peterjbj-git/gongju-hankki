# 공주한끼

공주한끼는 공주대 학생들이 학교 주변 음식점과 카페를 카카오맵 기반으로 탐색하고, 맛·가성비·양·청결도 평점과 키워드 평가를 통해 자신의 상황에 맞는 가게를 빠르게 선택할 수 있도록 돕는 정적 웹앱입니다.

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
   ├─ stores_master.csv
   ├─ stores_master.json
   └─ stores_sample.csv
```

## 실행 방법

빌드 도구 없이 동작하는 GitHub Pages용 정적 웹앱입니다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`에 접속합니다. `data/stores.json`을 `fetch`로 불러오기 때문에 파일을 직접 더블클릭하는 방식보다 로컬 서버 실행을 권장합니다.

## 카카오맵 JavaScript 키 설정

1. [카카오 개발자](https://developers.kakao.com/)에 로그인합니다.
2. `내 애플리케이션`에서 앱을 만들거나 기존 앱을 선택합니다.
3. `앱 키` 메뉴에서 `JavaScript 키`를 복사합니다.
4. `index.html`의 아래 placeholder를 실제 JavaScript 키로 교체합니다.

```html
KAKAO_JAVASCRIPT_KEY_HERE
```

현재 저장소에는 실제 키를 커밋하지 않기 위해 placeholder만 들어 있습니다. 키가 placeholder인 상태에서는 앱이 깨지지 않고 지도 영역에 안내 메시지가 표시됩니다.

## JavaScript SDK 도메인 등록

카카오맵 JavaScript SDK는 실행 도메인이 카카오 개발자 사이트에 등록되어 있어야 동작합니다.

1. 카카오 개발자 `내 애플리케이션`에서 앱을 선택합니다.
2. `플랫폼` 메뉴로 이동합니다.
3. `Web 플랫폼 등록` 또는 `사이트 도메인`에 로컬/배포 주소를 추가합니다.

예시:

```text
http://localhost:8000
http://127.0.0.1:8000
https://hyun9oo.github.io
```

GitHub Pages에 배포한 뒤에는 실제 Pages 주소도 반드시 사이트 도메인에 등록해야 합니다.

## GitHub Pages 배포 방법

1. 이 폴더를 GitHub 저장소에 업로드합니다.
2. GitHub 저장소의 `Settings`로 이동합니다.
3. `Pages` 메뉴에서 `Source`를 `Deploy from a branch`로 선택합니다.
4. Branch를 `main`, folder를 `/root`로 선택하고 저장합니다.
5. 배포가 끝나면 GitHub Pages URL을 카카오 개발자 사이트의 Web 플랫폼 사이트 도메인에 등록합니다.

## DB 역할

`db/stores_master.csv`는 사람이 엑셀이나 스프레드시트처럼 수정하는 원본 DB입니다. 배열 데이터는 세미콜론으로 구분합니다.

```text
김치찌개;제육볶음
```

`db/stores_master.json`은 현재 샘플 데이터의 JSON 백업입니다.

`db/stores_sample.csv`는 새 데이터를 입력할 때 참고하는 CSV 양식 예시입니다.

`data/stores.json`은 앱이 실제로 읽는 런타임 데이터입니다. 지도 마커는 각 가게의 `lat`, `lng` 값을 사용합니다.

## CSV 수정 후 JSON 반영

CSV를 수정한 뒤에는 같은 필드 구조로 `data/stores.json`에 반영해야 앱에 적용됩니다. CSV 필드는 아래 순서를 사용합니다.

```text
id,name,category,type,address,hours,mainMenu,priceRange,image,lat,lng,taste,value,portion,cleanliness,foodKeywords,moodKeywords,etcKeywords,recommendFor,description
```

변환 시 매핑 규칙:

- `mainMenu`, `recommendFor`는 세미콜론 문자열을 배열로 변환합니다.
- `foodKeywords`, `moodKeywords`, `etcKeywords`는 `keywords.food`, `keywords.mood`, `keywords.etc` 배열로 변환합니다.
- `taste`, `value`, `portion`, `cleanliness`는 `ratings` 객체의 숫자 값으로 변환합니다.
- `lat`, `lng`는 숫자로 저장합니다.

## 현재 구현된 기능

- 카카오맵 기반 가게 마커 표시
- 카카오맵 API 키 누락 또는 로딩 실패 시 fallback 안내 UI
- 가게 이름, 카테고리, 메뉴 검색
- 가게 리스트 바텀시트
- 지도 마커와 가게 카드 클릭 시 상세정보 표시
- 맛·가성비·양·청결도 1~7점 슬라이더 평가
- 키워드 버튼 선택 평가
- 평가 결과 `localStorage` 저장 및 평균 점수 반영
- 가게 2개 비교하기
- GitHub Pages 정적 배포 구조
