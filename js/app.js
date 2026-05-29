const DATA_URL = "data/stores.json";
const REVIEW_KEY = "gongju-hankki-reviews";
const COMPARE_KEY = "gongju-hankki-compare";

const ratingLabels = {
  taste: "맛",
  value: "가성비",
  portion: "양",
  cleanliness: "청결도",
};

const keywordGroups = {
  food: {
    title: "음식 파트",
    items: ["재료가 신선해요", "특별한 메뉴가 있어요", "가성비가 좋아요", "음식이 빨리 나와요"],
  },
  mood: {
    title: "분위기 파트",
    items: ["대화하기 좋아요", "사진이 잘 나와요", "뷰가 좋아요", "혼밥하기 좋아요", "특별한 날 가기 좋아요"],
  },
  etc: {
    title: "편의시설/기타 파트",
    items: ["주차하기 편해요", "화장실이 깨끗해요", "친절해요"],
  },
};

let stores = [];
let selectedStoreId = null;
let compareIds = [];

const $ = (selector) => document.querySelector(selector);

const elements = {
  homeView: $("#homeView"),
  compareView: $("#compareView"),
  customMap: $("#customMap"),
  storeList: $("#storeList"),
  storeCountBadge: $("#storeCountBadge"),
  bottomSheet: $("#bottomSheet"),
  sheetToggleButton: $("#sheetToggleButton"),
  searchPanel: $("#searchPanel"),
  homeSearchInput: $("#homeSearchInput"),
  homeSearchResults: $("#homeSearchResults"),
  openSearchButton: $("#openSearchButton"),
  openCompareButton: $("#openCompareButton"),
  closeCompareButton: $("#closeCompareButton"),
  compareSearchInput: $("#compareSearchInput"),
  compareSearchResults: $("#compareSearchResults"),
  compareSlots: $("#compareSlots"),
  compareTable: $("#compareTable"),
  detailPanel: $("#detailPanel"),
  closeDetailButton: $("#closeDetailButton"),
  detailImage: $("#detailImage"),
  detailCategory: $("#detailCategory"),
  detailName: $("#detailName"),
  detailDescription: $("#detailDescription"),
  detailKeywords: $("#detailKeywords"),
  detailAddress: $("#detailAddress"),
  detailHours: $("#detailHours"),
  detailMenu: $("#detailMenu"),
  detailPrice: $("#detailPrice"),
  detailRatings: $("#detailRatings"),
  detailCompareButton: $("#detailCompareButton"),
  reviewButton: $("#reviewButton"),
  reviewModal: $("#reviewModal"),
  closeReviewButton: $("#closeReviewButton"),
  reviewStoreName: $("#reviewStoreName"),
  reviewForm: $("#reviewForm"),
  sliderFields: $("#sliderFields"),
  keywordFields: $("#keywordFields"),
  fitMapButton: $("#fitMapButton"),
};

init();

async function init() {
  try {
    const response = await fetch(DATA_URL);
    stores = await response.json();
  } catch (error) {
    console.error(error);
    elements.storeList.innerHTML = "<p>가게 데이터를 불러오지 못했습니다. 로컬 서버로 실행해 주세요.</p>";
    return;
  }

  compareIds = loadCompareIds();
  bindEvents();
  renderMapPins();
  renderStoreList(stores);
  renderSearchResults("", "home");
  renderCompare();
}

function bindEvents() {
  elements.openSearchButton.addEventListener("click", () => {
    elements.searchPanel.classList.toggle("open");
    elements.homeSearchInput.focus();
  });

  elements.sheetToggleButton.addEventListener("click", toggleSheet);
  elements.openCompareButton.addEventListener("click", openCompareView);
  elements.closeCompareButton.addEventListener("click", closeCompareView);
  elements.closeDetailButton.addEventListener("click", closeDetail);
  elements.detailCompareButton.addEventListener("click", () => addToCompare(selectedStoreId));
  elements.reviewButton.addEventListener("click", openReviewModal);
  elements.closeReviewButton.addEventListener("click", closeReviewModal);
  elements.fitMapButton.addEventListener("click", () => {
    selectedStoreId = null;
    renderMapPins();
  });

  elements.homeSearchInput.addEventListener("input", (event) => {
    const query = event.target.value;
    renderSearchResults(query, "home");
    renderStoreList(filterStores(query));
  });

  elements.compareSearchInput.addEventListener("input", (event) => {
    renderSearchResults(event.target.value, "compare");
  });

  elements.reviewForm.addEventListener("submit", saveReview);
}

function toggleSheet() {
  elements.bottomSheet.classList.toggle("expanded");
}

function filterStores(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return stores;
  return stores.filter((store) => {
    const haystack = [
      store.name,
      store.category,
      store.address,
      store.mainMenu.join(" "),
      store.recommendFor.join(" "),
    ].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}

// MVP에서는 mapX/mapY 퍼센트 좌표를 사용한다. 실제 지도 API로 바꿀 때 이 함수만 교체하면 된다.
function renderMapPins() {
  elements.customMap.querySelectorAll(".map-pin").forEach((pin) => pin.remove());
  stores.forEach((store) => {
    const pin = document.createElement("button");
    pin.className = `map-pin ${store.id === selectedStoreId ? "selected" : ""}`;
    pin.type = "button";
    pin.style.left = `${store.mapX}%`;
    pin.style.top = `${store.mapY}%`;
    pin.textContent = store.type === "cafe" ? "C" : "식";
    pin.setAttribute("aria-label", `${store.name} 상세정보 열기`);
    pin.addEventListener("click", () => openDetail(store.id));
    elements.customMap.appendChild(pin);
  });
}

function renderStoreList(list) {
  elements.storeCountBadge.textContent = `${list.length}곳`;
  elements.storeList.innerHTML = list.map((store) => {
    const ratings = getMergedRatings(store);
    const keywords = getTopKeywords(store).slice(0, 4);
    return `
      <article class="store-card" data-store-id="${store.id}">
        <div class="store-card-header">
          <div>
            <h3>${store.name}</h3>
            <p class="store-meta">${store.category} · ${store.mainMenu[0]} · ${shortAddress(store.address)}</p>
          </div>
          <span class="count-badge">${store.type === "cafe" ? "카페" : "식사"}</span>
        </div>
        <div class="tag-row">${keywords.map((keyword) => `<span class="tag">${keyword}</span>`).join("")}</div>
        ${renderScoreChips(ratings)}
        <div class="card-actions">
          <button class="pill-button light detail-action" type="button">상세보기</button>
          <button class="pill-button dark compare-action" type="button">비교함 추가</button>
        </div>
      </article>
    `;
  }).join("");

  elements.storeList.querySelectorAll(".store-card").forEach((card) => {
    const storeId = card.dataset.storeId;
    card.addEventListener("click", () => openDetail(storeId));
    card.querySelector(".detail-action").addEventListener("click", (event) => {
      event.stopPropagation();
      openDetail(storeId);
    });
    card.querySelector(".compare-action").addEventListener("click", (event) => {
      event.stopPropagation();
      addToCompare(storeId);
    });
  });
}

function renderScoreChips(ratings) {
  return `
    <div class="score-row">
      ${Object.entries(ratingLabels).map(([key, label]) => `
        <div class="score-chip">
          <span>${label}</span>
          <strong>${ratings[key].toFixed(1)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSearchResults(query, mode) {
  const target = mode === "home" ? elements.homeSearchResults : elements.compareSearchResults;
  const results = filterStores(query).slice(0, 6);
  if (!query.trim()) {
    target.innerHTML = "";
    return;
  }
  target.innerHTML = results.length ? results.map((store) => `
    <button class="search-result" type="button" data-store-id="${store.id}">
      <span><strong>${store.name}</strong><br><small>${store.category} · ${store.mainMenu[0]}</small></span>
      <span>${mode === "home" ? "열기" : "선택"}</span>
    </button>
  `).join("") : `<p class="compare-muted">검색 결과가 없습니다.</p>`;

  target.querySelectorAll(".search-result").forEach((button) => {
    button.addEventListener("click", () => {
      if (mode === "home") {
        openDetail(button.dataset.storeId);
      } else {
        addToCompare(button.dataset.storeId);
        elements.compareSearchInput.value = "";
        target.innerHTML = "";
      }
    });
  });
}

function openDetail(storeId) {
  const store = findStore(storeId);
  if (!store) return;
  selectedStoreId = storeId;
  const ratings = getMergedRatings(store);
  elements.detailImage.src = store.image;
  elements.detailImage.alt = `${store.name} 대표 이미지`;
  elements.detailCategory.textContent = `${store.category} · ${store.type === "cafe" ? "카페" : "식사"}`;
  elements.detailName.textContent = store.name;
  elements.detailDescription.textContent = store.description;
  elements.detailAddress.textContent = store.address;
  elements.detailHours.textContent = store.hours;
  elements.detailMenu.textContent = store.mainMenu.join(", ");
  elements.detailPrice.textContent = store.priceRange;
  elements.detailKeywords.innerHTML = getTopKeywords(store).map((keyword) => `<span class="tag">${keyword}</span>`).join("");
  elements.detailRatings.innerHTML = Object.entries(ratingLabels).map(([key, label]) => renderRatingBar(label, ratings[key])).join("");
  elements.detailPanel.classList.remove("hidden");
  renderMapPins();
}

function closeDetail() {
  elements.detailPanel.classList.add("hidden");
}

function renderRatingBar(label, score) {
  const hiddenPercent = Math.max(0, 100 - (score / 7) * 100);
  return `
    <div class="rating-bar">
      <div class="rating-label"><span>${label}</span><strong>${score.toFixed(1)} / 7</strong></div>
      <div class="bar-track"><div class="bar-fill" style="transform: scaleX(${hiddenPercent / 100})"></div></div>
    </div>
  `;
}

function openReviewModal() {
  const store = findStore(selectedStoreId);
  if (!store) return;
  elements.reviewStoreName.textContent = store.name;
  elements.sliderFields.innerHTML = Object.entries(ratingLabels).map(([key, label]) => `
    <label class="slider-field">
      <div class="slider-head"><span>${label}</span><strong id="${key}Value">5</strong></div>
      <input name="${key}" type="range" min="1" max="7" step="1" value="5">
      <div class="ticks">${Array.from({ length: 7 }, (_, index) => `<span title="${index + 1}점"></span>`).join("")}</div>
    </label>
  `).join("");

  elements.keywordFields.innerHTML = Object.entries(keywordGroups).map(([groupKey, group]) => `
    <section class="keyword-group" data-group="${groupKey}">
      <h3>${group.title}</h3>
      <div class="keyword-options">
        ${group.items.map((item) => `<button class="keyword-button" type="button" data-keyword="${item}">${item}</button>`).join("")}
      </div>
    </section>
  `).join("");

  elements.sliderFields.querySelectorAll("input[type='range']").forEach((input) => {
    input.addEventListener("input", () => {
      $(`#${input.name}Value`).textContent = input.value;
    });
  });

  elements.keywordFields.querySelectorAll(".keyword-button").forEach((button) => {
    button.addEventListener("click", () => button.classList.toggle("active"));
  });

  elements.reviewModal.classList.remove("hidden");
}

function closeReviewModal() {
  elements.reviewModal.classList.add("hidden");
}

function saveReview(event) {
  event.preventDefault();
  if (!selectedStoreId) return;
  const formData = new FormData(elements.reviewForm);
  const ratings = {};
  Object.keys(ratingLabels).forEach((key) => {
    ratings[key] = Number(formData.get(key));
  });

  const keywords = { food: [], mood: [], etc: [] };
  elements.keywordFields.querySelectorAll(".keyword-group").forEach((group) => {
    const groupKey = group.dataset.group;
    group.querySelectorAll(".keyword-button.active").forEach((button) => {
      keywords[groupKey].push(button.dataset.keyword);
    });
  });

  const reviews = loadReviews();
  reviews[selectedStoreId] = reviews[selectedStoreId] || [];
  reviews[selectedStoreId].push({ ratings, keywords, createdAt: new Date().toISOString() });
  localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));

  closeReviewModal();
  openDetail(selectedStoreId);
  renderStoreList(filterStores(elements.homeSearchInput.value));
}

function getMergedRatings(store) {
  const reviews = loadReviews()[store.id] || [];
  if (!reviews.length) return { ...store.ratings };
  const merged = {};
  Object.keys(ratingLabels).forEach((key) => {
    const total = reviews.reduce((sum, review) => sum + review.ratings[key], store.ratings[key]);
    merged[key] = total / (reviews.length + 1);
  });
  return merged;
}

function getTopKeywords(store) {
  const counts = {};
  Object.values(store.keywords).flat().forEach((keyword) => {
    counts[keyword] = (counts[keyword] || 0) + 1;
  });
  (loadReviews()[store.id] || []).forEach((review) => {
    Object.values(review.keywords).flat().forEach((keyword) => {
      counts[keyword] = (counts[keyword] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword);
}

function openCompareView() {
  elements.homeView.classList.add("hidden");
  elements.compareView.classList.remove("hidden");
  closeDetail();
  renderCompare();
}

function closeCompareView() {
  elements.compareView.classList.add("hidden");
  elements.homeView.classList.remove("hidden");
}

function addToCompare(storeId) {
  if (!storeId || compareIds.includes(storeId)) {
    openCompareView();
    return;
  }
  if (compareIds.length >= 2) compareIds.shift();
  compareIds.push(storeId);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds));
  renderCompare();
  openCompareView();
}

function removeFromCompare(storeId) {
  compareIds = compareIds.filter((id) => id !== storeId);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds));
  renderCompare();
}

function renderCompare() {
  const selectedStores = compareIds.map(findStore).filter(Boolean);
  elements.compareSlots.innerHTML = [0, 1].map((index) => {
    const store = selectedStores[index];
    if (!store) {
      return `<div class="compare-slot"><p class="compare-muted">검색해서 비교할 가게를 선택하세요.</p></div>`;
    }
    return `
      <div class="compare-slot filled">
        <img src="${store.image}" alt="${store.name} 대표 이미지">
        <h3>${store.name}</h3>
        <p class="compare-muted">${store.category} · ${store.mainMenu[0]}</p>
        <button class="pill-button light remove-compare" type="button" data-store-id="${store.id}">선택 해제</button>
      </div>
    `;
  }).join("");

  elements.compareSlots.querySelectorAll(".remove-compare").forEach((button) => {
    button.addEventListener("click", () => removeFromCompare(button.dataset.storeId));
  });

  const rows = [
    ["대표 이미지", (store) => `<img src="${store.image}" alt="${store.name}" style="width:100%;border-radius:14px;aspect-ratio:4/3;object-fit:cover;">`],
    ["가게명", (store) => store.name],
    ["카테고리", (store) => store.category],
    ["대표 메뉴", (store) => store.mainMenu.join(", ")],
    ["가격대", (store) => store.priceRange],
    ["주소", (store) => store.address],
    ["영업시간", (store) => store.hours],
    ["맛 점수", (store) => getMergedRatings(store).taste.toFixed(1)],
    ["가성비 점수", (store) => getMergedRatings(store).value.toFixed(1)],
    ["양 점수", (store) => getMergedRatings(store).portion.toFixed(1)],
    ["청결도 점수", (store) => getMergedRatings(store).cleanliness.toFixed(1)],
    ["주요 키워드", (store) => getTopKeywords(store).slice(0, 4).join(", ")],
    ["추천 상황", (store) => store.recommendFor.join(", ")],
    ["한 줄 평가", (store) => store.description],
  ];

  elements.compareTable.innerHTML = rows.map(([label, getter]) => `
    <div class="compare-row">
      <div class="compare-label">${label}</div>
      ${[0, 1].map((index) => `<div class="compare-cell">${selectedStores[index] ? getter(selectedStores[index]) : "-"}</div>`).join("")}
    </div>
  `).join("");
}

function findStore(storeId) {
  return stores.find((store) => store.id === storeId);
}

function shortAddress(address) {
  return address.replace("충남 공주시 ", "");
}

function loadReviews() {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY)) || {};
  } catch {
    return {};
  }
}

function loadCompareIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(COMPARE_KEY)) || [];
    return ids.filter(Boolean).slice(0, 2);
  } catch {
    return [];
  }
}
