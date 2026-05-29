#!/usr/bin/env python3
import csv
import json
import os
import sys
import time
from datetime import date
from pathlib import Path

import requests
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[1]
KAKAO_LOCAL_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
MAX_STORES = 100
SEARCH_KEYWORDS = [
    "공주시 신관동 음식점",
    "공주시 신관동 맛집",
    "공주시 신관동 한식",
    "공주시 신관동 중식",
    "공주시 신관동 일식",
    "공주시 신관동 양식",
    "공주시 신관동 분식",
    "공주시 신관동 고기집",
    "공주시 신관동 국밥",
    "공주시 신관동 돈까스",
    "공주시 신관동 치킨",
    "공주시 신관동 피자",
    "공주시 신관동 족발",
    "공주시 신관동 보쌈",
    "공주시 신관동 샤브샤브",
    "공주대 음식점",
    "공주대 맛집",
    "공주대 밥집",
    "공주대 한식",
    "공주대 분식",
]

CSV_FIELDS = [
    "id",
    "name",
    "category",
    "type",
    "address",
    "hours",
    "mainMenu",
    "priceRange",
    "avgPricePerPerson",
    "image",
    "lat",
    "lng",
    "taste",
    "value",
    "portion",
    "cleanliness",
    "foodKeywords",
    "moodKeywords",
    "etcKeywords",
    "recommendFor",
    "description",
    "kakaoPlaceUrl",
    "sourceCheckedDate",
    "verificationStatus",
    "notes",
]

EXCLUDE_WORDS = ["카페", "디저트", "베이커리", "커피"]
FOOD_HINTS = [
    "음식점",
    "한식",
    "중식",
    "일식",
    "양식",
    "분식",
    "고기",
    "국밥",
    "돈까스",
    "돈가스",
    "치킨",
    "피자",
    "족발",
    "보쌈",
    "샤브",
    "식당",
    "밥집",
    "맛집",
    "요리",
    "레스토랑",
]


def main():
    load_dotenv(ROOT_DIR / ".env")
    rest_api_key = os.getenv("KAKAO_REST_API_KEY", "").strip()
    if not rest_api_key:
        print("KAKAO_REST_API_KEY가 .env에 없습니다.", file=sys.stderr)
        return 1

    places = collect_places(rest_api_key)
    rows = [build_row(index, place) for index, place in enumerate(places[:MAX_STORES], start=1)]
    stores = [row_to_store(row) for row in rows]

    write_csv(ROOT_DIR / "db" / "stores_master.csv", rows)
    write_json(ROOT_DIR / "db" / "stores_master.json", stores)
    write_json(ROOT_DIR / "data" / "stores.json", stores)
    print(f"{len(stores)}개 식당 후보를 저장했습니다.")
    return 0


def collect_places(rest_api_key):
    collected = {}
    headers = {"Authorization": f"KakaoAK {rest_api_key}"}
    for keyword in SEARCH_KEYWORDS:
      for page in range(1, 4):
        response = requests.get(
            KAKAO_LOCAL_URL,
            headers=headers,
            params={"query": keyword, "category_group_code": "FD6", "size": 15, "page": page},
            timeout=10,
        )
        if response.status_code != 200:
            print(f"검색 실패: {keyword} page={page} status={response.status_code}", file=sys.stderr)
            print(response.text[:300], file=sys.stderr)
            break

        payload = response.json()
        for place in payload.get("documents", []):
            if not should_include(place):
                continue
            key = dedupe_key(place)
            if key not in collected:
                collected[key] = place

        if payload.get("meta", {}).get("is_end"):
            break
        time.sleep(0.08)

    return sorted(collected.values(), key=place_priority)


def should_include(place):
    place_name = place.get("place_name", "")
    category_name = place.get("category_name", "")
    address_name = place.get("address_name", "")
    road_address_name = place.get("road_address_name", "")
    text = f"{place_name} {category_name} {address_name} {road_address_name}"

    if "공주시" not in f"{address_name} {road_address_name}":
        return False
    if any(word in text for word in EXCLUDE_WORDS):
        return False
    return any(word in text for word in FOOD_HINTS)


def place_priority(place):
    address_text = f"{place.get('address_name', '')} {place.get('road_address_name', '')}"
    category_text = place.get("category_name", "")
    return (
        0 if "신관동" in address_text else 1,
        0 if "음식점" in category_text else 1,
        place.get("place_name", ""),
    )


def dedupe_key(place):
    return f"{place.get('place_name', '').strip()}|{place.get('address_name', '').strip()}"


def build_row(index, place):
    category = extract_category(place.get("category_name", ""), place.get("place_name", ""))
    address = place.get("road_address_name") or place.get("address_name", "")
    return {
        "id": f"store-{index:03d}",
        "name": place.get("place_name", ""),
        "category": category,
        "type": "restaurant",
        "address": address,
        "hours": "",
        "mainMenu": "",
        "priceRange": "",
        "avgPricePerPerson": "",
        "image": "",
        "lat": to_float(place.get("y")),
        "lng": to_float(place.get("x")),
        "taste": 0,
        "value": 0,
        "portion": 0,
        "cleanliness": 0,
        "foodKeywords": "",
        "moodKeywords": "",
        "etcKeywords": "",
        "recommendFor": "",
        "description": "카카오맵 기준으로 수집한 공주시 신관동 식당 후보입니다.",
        "kakaoPlaceUrl": place.get("place_url", ""),
        "sourceCheckedDate": date.today().isoformat(),
        "verificationStatus": "미검수",
        "notes": "영업시간, 메뉴, 가격대는 수동 검수 필요",
    }


def extract_category(category_name, place_name):
    text = f"{category_name} {place_name}"
    if "족발" in text or "보쌈" in text:
        return "족발/보쌈"
    if "돈까스" in text or "돈가스" in text:
        return "돈까스"
    if "국밥" in text:
        return "국밥"
    if "치킨" in text:
        return "치킨"
    if "피자" in text:
        return "피자"
    if any(word in text for word in ["고기", "육류", "갈비", "삼겹", "구이"]):
        return "고기"
    if "분식" in text:
        return "분식"
    if "중식" in text or "중국" in text:
        return "중식"
    if "일식" in text or "일본" in text or "초밥" in text or "스시" in text:
        return "일식"
    if "양식" in text or "파스타" in text or "스테이크" in text:
        return "양식"
    if "한식" in text or "백반" in text or "한정식" in text:
        return "한식"
    return "기타"


def row_to_store(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "type": row["type"],
        "address": row["address"],
        "hours": row["hours"],
        "mainMenu": split_list(row["mainMenu"]),
        "priceRange": row["priceRange"],
        "avgPricePerPerson": row["avgPricePerPerson"],
        "image": row["image"],
        "lat": row["lat"],
        "lng": row["lng"],
        "ratings": {
            "taste": row["taste"],
            "value": row["value"],
            "portion": row["portion"],
            "cleanliness": row["cleanliness"],
        },
        "keywords": {
            "food": split_list(row["foodKeywords"]),
            "mood": split_list(row["moodKeywords"]),
            "etc": split_list(row["etcKeywords"]),
        },
        "recommendFor": split_list(row["recommendFor"]),
        "description": row["description"],
        "kakaoPlaceUrl": row["kakaoPlaceUrl"],
        "sourceCheckedDate": row["sourceCheckedDate"],
        "verificationStatus": row["verificationStatus"],
        "notes": row["notes"],
    }


def split_list(value):
    if not value:
        return []
    return [item.strip() for item in str(value).split(";") if item.strip()]


def to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
