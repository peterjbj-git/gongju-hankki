#!/usr/bin/env python3
import csv
import json
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT_DIR / "db" / "stores_master.csv"
JSON_PATH = ROOT_DIR / "data" / "stores.json"
AUTO_DESCRIPTION = "카카오맵 기준으로 수집한 공주시 신관동 식당 후보입니다."
DESCRIPTION_FALLBACK = "한 줄 평가 준비 중"
HOURS_FALLBACK = "영업시간 확인 중"
MENU_FALLBACK = "대표메뉴 확인 중"
PRICE_FALLBACK = "가격대 확인 중"


def main():
    rows = read_csv(CSV_PATH)
    stores = [row_to_store(row) for row in rows if row.get("verificationStatus", "").strip() != "제외"]
    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    JSON_PATH.write_text(json.dumps(stores, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    json.loads(JSON_PATH.read_text(encoding="utf-8"))
    print(f"{len(stores)}개 가게를 {JSON_PATH.relative_to(ROOT_DIR)}에 저장했습니다.")


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))


def row_to_store(row):
    main_menu = split_list(row.get("mainMenu", ""))
    food_keywords = split_list(row.get("foodKeywords", ""))
    mood_keywords = split_list(row.get("moodKeywords", ""))
    etc_keywords = split_list(row.get("etcKeywords", ""))
    recommend_for = split_list(row.get("recommendFor", ""))

    hours = clean_text(row.get("hours", "")) or HOURS_FALLBACK
    price_range = clean_text(row.get("priceRange", "")) or PRICE_FALLBACK
    avg_price = clean_text(row.get("avgPricePerPerson", "")) or PRICE_FALLBACK
    description = normalize_description(row.get("description", ""))

    return {
        "id": clean_text(row.get("id", "")),
        "name": clean_text(row.get("name", "")),
        "category": clean_text(row.get("category", "")),
        "type": clean_text(row.get("type", "")) or "restaurant",
        "address": clean_text(row.get("address", "")),
        "hours": hours,
        "mainMenu": main_menu or [MENU_FALLBACK],
        "priceRange": price_range,
        "avgPricePerPerson": avg_price,
        "image": clean_text(row.get("image", "")),
        "lat": to_number(row.get("lat", "")),
        "lng": to_number(row.get("lng", "")),
        "ratings": {
            "taste": to_number(row.get("taste", "")),
            "value": to_number(row.get("value", "")),
            "portion": to_number(row.get("portion", "")),
            "cleanliness": to_number(row.get("cleanliness", "")),
        },
        "ratingCount": int(to_number(row.get("ratingCount", ""))),
        "keywords": {
            "food": food_keywords,
            "mood": mood_keywords,
            "etc": etc_keywords,
        },
        "recommendFor": recommend_for,
        "description": description,
        "kakaoPlaceUrl": clean_text(row.get("kakaoPlaceUrl", "")),
        "verificationStatus": clean_text(row.get("verificationStatus", "")) or "미검수",
        "notes": clean_text(row.get("notes", "")),
        "menuSourceUrl": clean_text(row.get("menuSourceUrl", "")),
        "hoursSourceUrl": clean_text(row.get("hoursSourceUrl", "")),
        "priceSourceUrl": clean_text(row.get("priceSourceUrl", "")),
        "mapSourceUrl": clean_text(row.get("mapSourceUrl", "")),
        "lastVerifiedDate": clean_text(row.get("lastVerifiedDate", "")),
        "sourceCheckedDate": clean_text(row.get("sourceCheckedDate", "")),
    }


def split_list(value):
    text = clean_text(value)
    if not text or text in {"확인 필요", MENU_FALLBACK}:
        return []
    return [item.strip() for item in text.split(";") if item.strip()]


def normalize_description(value):
    text = clean_text(value)
    if not text or text in {"확인 필요", AUTO_DESCRIPTION}:
        return DESCRIPTION_FALLBACK
    return text


def clean_text(value):
    return str(value or "").strip()


def to_number(value):
    try:
        text = clean_text(value).replace(",", "")
        return float(text) if text else 0
    except ValueError:
        return 0


if __name__ == "__main__":
    main()
