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
├─ scripts/
│  ├─ build_store_db_from_kakao.py
│  └─ convert_csv_to_json.py
├─ requirements.txt
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

## 카카오 REST API 키 설정

카카오 Local API로 식당 DB 초안을 만들려면 REST API 키가 필요합니다.

1. [카카오 개발자](https://developers.kakao.com/)에 로그인합니다.
2. `내 애플리케이션`에서 앱을 선택합니다.
3. `앱 키` 메뉴에서 `REST API 키`를 복사합니다.
4. 프로젝트 루트에 `.env` 파일을 만들고 아래처럼 작성합니다.

```env
KAKAO_REST_API_KEY=실제_REST_API_키
```

`.env`는 `.gitignore`에 포함되어 있으므로 GitHub에 올리지 않습니다.

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

`db/stores_master.csv`는 사람이 엑셀이나 스프레드시트처럼 수정하는 원본 DB입니다. Kakao Local API로 자동 생성한 뒤 사람이 영업시간, 메뉴, 가격대, 1인 평균 가격 등을 검수해 채우는 파일입니다. 배열 데이터는 세미콜론으로 구분합니다.

```text
김치찌개;제육볶음
```

`db/stores_master.json`은 현재 DB의 JSON 백업입니다.

`db/stores_sample.csv`는 새 데이터를 입력할 때 참고하는 CSV 양식 예시입니다.

`data/stores.json`은 앱이 실제로 읽는 런타임 데이터입니다. 지도 마커는 각 가게의 `lat`, `lng` 값을 사용합니다. 사람이 CSV를 수정한 뒤에는 `scripts/convert_csv_to_json.py`로 JSON을 다시 생성합니다.

자동 수집 데이터는 미검수 상태입니다. `verificationStatus`는 `미검수`로 저장되며, `hours`, `mainMenu`, `priceRange`, `avgPricePerPerson`는 수동 검수가 필요합니다.

평점 `0`은 실제 낮은 점수가 아니라 아직 평가가 없는 상태입니다. 앱에서는 `미평가`로 표시됩니다.

검수 상태값:

- `미검수`: 자동 수집 직후 아직 사람이 확인하지 않은 상태
- `검수필요`: 일부 정보가 부족하거나 출처 확인이 필요한 상태
- `검수완료`: 사람이 메뉴, 영업시간, 가격대, 지도 출처를 확인한 상태
- `제외`: 카페, 폐업 의심, 중복, 신관동 외 지역 등 앱 DB에서 제외할 항목

메뉴, 영업시간, 가격대는 네이버지도, 카카오맵, 구글맵 등에서 사람이 확인한 뒤 `menuSourceUrl`, `hoursSourceUrl`, `priceSourceUrl`, `mapSourceUrl`에 출처를 남깁니다. 정확하지 않은 정보는 임의로 채우지 말고 빈칸 또는 `확인 필요`로 둡니다.

## Kakao Local API로 DB 자동 생성

처음 실행하거나 DB를 다시 만들 때 아래 명령을 사용합니다.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 scripts/build_store_db_from_kakao.py
```

스크립트는 `KAKAO_REST_API_KEY`를 사용해 공주시 신관동과 공주대 주변 식당 후보를 수집합니다. 카페, 디저트, 베이커리, 커피 성격의 장소는 제외하고 최대 100개까지 저장합니다.

생성 또는 갱신되는 파일:

- `db/stores_master.csv`
- `db/stores_master.json`
- `data/stores.json`

## CSV 수정 후 JSON 반영

CSV를 수정한 뒤에는 아래 명령으로 `data/stores.json`에 반영해야 앱에 적용됩니다. 이 변환 스크립트는 카카오 API를 호출하지 않고 `db/stores_master.csv`만 읽습니다.

```bash
python3 scripts/convert_csv_to_json.py
```

`verificationStatus`가 `제외`인 가게는 앱 DB인 `data/stores.json`에 포함되지 않습니다. 자동 생성 스크립트를 다시 실행하면 CSV 수동 수정분이 덮어써질 수 있으므로, 수동 검수 후에는 `convert_csv_to_json.py`만 실행하는 것을 권장합니다. CSV 필드는 아래 순서를 사용합니다.

```text
id,name,category,type,address,hours,mainMenu,priceRange,avgPricePerPerson,description,verificationStatus,lastVerifiedDate,menuSourceUrl,hoursSourceUrl,priceSourceUrl,mapSourceUrl,notes,lat,lng,taste,value,portion,cleanliness,ratingCount,foodKeywords,moodKeywords,etcKeywords,recommendFor,image,kakaoPlaceUrl,sourceCheckedDate
```

변환 시 매핑 규칙:

- `mainMenu`, `recommendFor`는 세미콜론 문자열을 배열로 변환합니다.
- `foodKeywords`, `moodKeywords`, `etcKeywords`는 `keywords.food`, `keywords.mood`, `keywords.etc` 배열로 변환합니다.
- `taste`, `value`, `portion`, `cleanliness`는 `ratings` 객체의 숫자 값으로 변환합니다.
- `ratingCount`는 숫자로 변환하고 빈 값은 `0`으로 처리합니다.
- `lat`, `lng`는 숫자로 저장합니다.
- `hours`, `mainMenu`, `priceRange`, `avgPricePerPerson`, `description`이 비어 있거나 `확인 필요`이면 앱 표시용 문구로 변환합니다.

## 필터와 정렬 사용 방법

검색 버튼을 눌러 검색 패널을 열면 카테고리와 정렬 버튼이 함께 표시됩니다.

- `카테고리`: 전체, 한식, 중식, 일식, 양식, 분식, 고기, 치킨, 피자, 국밥, 돈까스, 족발/보쌈, 기타 중 하나를 선택합니다.
- `정렬`: 기본순, 맛 높은순, 가성비 높은순, 양 높은순, 청결도 높은순 중 하나를 선택합니다.
- 검색어, 카테고리, 정렬은 동시에 적용됩니다.
- `초기화`를 누르면 검색어와 필터/정렬이 모두 기본값으로 돌아갑니다.
- 미평가 가게는 높은순 정렬에서 뒤로 배치됩니다.

## 현재 구현된 기능

- 카카오맵 기반 가게 마커 표시
- 카카오맵 API 키 누락 또는 로딩 실패 시 fallback 안내 UI
- 가게 이름, 카테고리, 메뉴 검색
- 카테고리 필터와 평점 기준 정렬
- 가게 리스트 바텀시트
- 지도 마커와 가게 카드 클릭 시 상세정보 표시
- 맛·가성비·양·청결도 1~7점 슬라이더 평가
- 키워드 버튼 선택 평가
- 평가 결과 `localStorage` 저장 및 평균 점수 반영
- 가게 2개 비교하기
- GitHub Pages 정적 배포 구조
