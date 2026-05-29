const DATA_URL = "data/stores.json";
const REVIEW_KEY = "gongju-hankki-reviews";
const COMPARE_KEY = "gongju-hankki-compare";
const KAKAO_KEY_PLACEHOLDER = "KAKAO_JAVASCRIPT_KEY_HERE";
const KAKAO_SDK_TIMEOUT_MS = 7000;
const MAP_DEBUG_PREFIX = "[공주한끼 지도]";
const SHEET_STATES = ["collapsed", "half", "expanded"];
const AUTO_DESCRIPTION = "카카오맵 기준으로 수집한 공주시 신관동 식당 후보입니다.";
const DISPLAY_FALLBACKS = {
  menu: "대표메뉴 확인 중",
  hours: "영업시간 확인 중",
  price: "가격대 확인 중",
  description: "한 줄 평가 준비 중",
};

const ratingLabels = {
  taste: "맛",
  value: "가성비",
  portion: "양",
  cleanliness: "청결도",
};

const categoryOptions = ["전체", "한식", "중식", "일식", "양식", "분식", "고기", "치킨", "피자", "국밥", "돈까스", "족발/보쌈", "기타"];

const sortOptions = [
  { value: "default", label: "기본순" },
  { value: "taste", label: "맛 높은순" },
  { value: "value", label: "가성비 높은순" },
  { value: "portion", label: "양 높은순" },
  { value: "cleanliness", label: "청결도 높은순" },
];

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
let kakaoMap = null;
let mapMarkers = [];
let sheetState = "collapsed";
let dragStartY = 0;
let dragStartOffset = 0;
let sheetOffset = 0;
let sheetAnimationFrame = 0;
let isDraggingSheet = false;
let didDragSheet = false;
let toastTimer = 0;

const state = {
  stores: [],
  filteredStores: [],
  selectedCategory: "전체",
  selectedSort: "default",
  searchQuery: "",
};

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
  categoryFilterButton: $("#categoryFilterButton"),
  categoryFilterMenu: $("#categoryFilterMenu"),
  sortFilterButton: $("#sortFilterButton"),
  sortFilterMenu: $("#sortFilterMenu"),
  resetFilterButton: $("#resetFilterButton"),
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
  detailReviewCount: $("#detailReviewCount"),
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
  toast: $("#toast"),
};

init();

async function init() {
  try {
    const response = await fetch(DATA_URL);
    stores = await response.json();
    state.stores = stores;
    state.filteredStores = [...stores];
  } catch (error) {
    console.error(error);
    elements.storeList.innerHTML = "<p>가게 데이터를 불러오지 못했습니다. 로컬 서버로 실행해 주세요.</p>";
    return;
  }

  compareIds = loadCompareIds();
  renderFilterMenus();
  bindEvents();
  await initMap();
  applyFiltersAndSort();
  renderSearchResults("", "home");
  renderCompare();
  setSheetState("collapsed");
}

function bindEvents() {
  elements.openSearchButton.addEventListener("click", () => {
    elements.searchPanel.classList.toggle("open");
    elements.homeSearchInput.focus();
  });

  elements.sheetToggleButton.addEventListener("click", (event) => {
    if (didDragSheet) {
      event.preventDefault();
      didDragSheet = false;
      return;
    }
    toggleSheet();
  });
  elements.sheetToggleButton.addEventListener("pointerdown", startSheetDrag);
  window.addEventListener("pointermove", dragSheet);
  window.addEventListener("pointerup", endSheetDrag);
  window.addEventListener("pointercancel", endSheetDrag);
  window.addEventListener("resize", () => setSheetState(sheetState));
  window.addEventListener("click", closeFilterMenusFromOutside);
  elements.categoryFilterButton.addEventListener("click", (event) => toggleFilterMenu(event, "category"));
  elements.sortFilterButton.addEventListener("click", (event) => toggleFilterMenu(event, "sort"));
  elements.resetFilterButton.addEventListener("click", resetFilters);
  elements.openCompareButton.addEventListener("click", openCompareView);
  elements.closeCompareButton.addEventListener("click", closeCompareView);
  elements.closeDetailButton.addEventListener("click", closeDetail);
  elements.detailCompareButton.addEventListener("click", () => addToCompare(selectedStoreId));
  elements.reviewButton.addEventListener("click", openReviewModal);
  elements.closeReviewButton.addEventListener("click", closeReviewModal);
  elements.fitMapButton.addEventListener("click", () => {
    selectedStoreId = null;
    fitMapToStores(state.filteredStores);
    renderMapMarkers(state.filteredStores);
  });

  elements.homeSearchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    applyFiltersAndSort();
    renderSearchResults(state.searchQuery, "home");
  });

  elements.compareSearchInput.addEventListener("input", (event) => {
    renderSearchResults(event.target.value, "compare");
  });

  elements.reviewForm.addEventListener("submit", saveReview);
}

function toggleSheet() {
  const nextState = sheetState === "collapsed" ? "half" : sheetState === "half" ? "expanded" : "collapsed";
  setSheetState(nextState);
}

function setSheetState(nextState) {
  sheetState = nextState;
  sheetOffset = getSheetOffsetForState(nextState);
  elements.bottomSheet.dataset.state = nextState;
  elements.bottomSheet.classList.toggle("dragging", isDraggingSheet);
  setSheetOffset(sheetOffset);
}

function startSheetDrag(event) {
  event.preventDefault();
  isDraggingSheet = true;
  didDragSheet = false;
  dragStartY = event.clientY;
  dragStartOffset = sheetOffset || getSheetOffsetForState(sheetState);
  elements.sheetToggleButton.setPointerCapture(event.pointerId);
  elements.bottomSheet.classList.add("dragging");
}

function dragSheet(event) {
  if (!isDraggingSheet) return;
  event.preventDefault();
  const deltaY = event.clientY - dragStartY;
  if (Math.abs(deltaY) > 6) didDragSheet = true;
  const nextOffset = clamp(dragStartOffset + deltaY, getSheetOffsetForState("expanded"), getSheetOffsetForState("collapsed"));
  requestSheetOffset(nextOffset);
}

function endSheetDrag() {
  if (!isDraggingSheet) return;
  isDraggingSheet = false;
  elements.bottomSheet.classList.remove("dragging");
  const nearestState = getNearestSheetState(sheetOffset);
  setSheetState(nearestState);
  window.setTimeout(() => {
    didDragSheet = false;
  }, 120);
}

function requestSheetOffset(nextOffset) {
  sheetOffset = nextOffset;
  if (sheetAnimationFrame) return;
  sheetAnimationFrame = window.requestAnimationFrame(() => {
    setSheetOffset(sheetOffset);
    sheetAnimationFrame = 0;
  });
}

function setSheetOffset(nextOffset) {
  elements.bottomSheet.style.setProperty("--sheet-y", `${Math.round(nextOffset)}px`);
}

function getNearestSheetState(offset) {
  return SHEET_STATES.reduce((closest, item) => {
    const currentDistance = Math.abs(getSheetOffsetForState(item) - offset);
    const closestDistance = Math.abs(getSheetOffsetForState(closest) - offset);
    return currentDistance < closestDistance ? item : closest;
  }, "collapsed");
}

function getSheetOffsetForState(nextState) {
  const sheetHeight = elements.bottomSheet.getBoundingClientRect().height || window.innerHeight * 0.84;
  if (nextState === "expanded") return 0;
  if (nextState === "half") return Math.max(0, Math.round(window.innerHeight * 0.42));
  return Math.max(0, Math.round(sheetHeight - 174));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function renderFilterMenus() {
  elements.categoryFilterMenu.innerHTML = categoryOptions.map((category) => `
    <button class="filter-menu-item" type="button" data-category="${category}">${category}</button>
  `).join("");

  elements.sortFilterMenu.innerHTML = sortOptions.map((option) => `
    <button class="filter-menu-item" type="button" data-sort="${option.value}">${option.label}</button>
  `).join("");

  elements.categoryFilterMenu.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedCategory = button.dataset.category;
      closeFilterMenus();
      applyFiltersAndSort();
    });
  });

  elements.sortFilterMenu.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedSort = button.dataset.sort;
      closeFilterMenus();
      applyFiltersAndSort();
    });
  });
}

function toggleFilterMenu(event, type) {
  event.stopPropagation();
  const target = type === "category" ? elements.categoryFilterMenu : elements.sortFilterMenu;
  const button = type === "category" ? elements.categoryFilterButton : elements.sortFilterButton;
  const wasOpen = !target.classList.contains("hidden");
  closeFilterMenus();
  target.classList.toggle("hidden", wasOpen);
  button.setAttribute("aria-expanded", String(!wasOpen));
}

function closeFilterMenusFromOutside(event) {
  if (event.target.closest(".filter-menu-wrap")) return;
  closeFilterMenus();
}

function closeFilterMenus() {
  elements.categoryFilterMenu.classList.add("hidden");
  elements.sortFilterMenu.classList.add("hidden");
  elements.categoryFilterButton.setAttribute("aria-expanded", "false");
  elements.sortFilterButton.setAttribute("aria-expanded", "false");
}

function applyFiltersAndSort() {
  const filtered = sortStores(filterStores(state.searchQuery, state.selectedCategory), state.selectedSort);
  state.filteredStores = filtered;
  renderStoreList(filtered);
  renderMapMarkers(filtered);
  updateFilterLabels();
  if (state.searchQuery.trim()) renderSearchResults(state.searchQuery, "home");
}

function filterStores(query = "", category = "전체") {
  const normalized = query.trim().toLowerCase();
  return state.stores.filter((store) => {
    const matchesSearch = !normalized || [
      store.name,
      store.category,
      store.address,
    ].join(" ").toLowerCase().includes(normalized);

    return matchesSearch && matchesCategory(store, category);
  });
}

function matchesCategory(store, selectedCategory) {
  if (selectedCategory === "전체") return true;
  const category = normalizeCategory(store.category, store.name);
  return category === selectedCategory;
}

function normalizeCategory(category = "", name = "") {
  const value = `${category} ${name}`;
  if (value.includes("족발") || value.includes("보쌈")) return "족발/보쌈";
  if (value.includes("돈까스") || value.includes("돈가스")) return "돈까스";
  if (value.includes("국밥")) return "국밥";
  if (value.includes("치킨")) return "치킨";
  if (value.includes("피자")) return "피자";
  if (value.includes("고기") || value.includes("삼겹") || value.includes("갈비") || value.includes("구이")) return "고기";
  if (value.includes("분식")) return "분식";
  if (value.includes("중식") || value.includes("중국")) return "중식";
  if (value.includes("일식") || value.includes("일본") || value.includes("초밥") || value.includes("스시")) return "일식";
  if (value.includes("양식") || value.includes("파스타") || value.includes("스테이크")) return "양식";
  if (value.includes("한식") || value.includes("한정식") || value.includes("백반") || value.includes("찌개")) return "한식";
  return "기타";
}

function sortStores(list, sortKey) {
  const indexed = list.map((store, index) => ({ store, index }));
  if (sortKey === "default") return indexed.map((item) => item.store);
  return indexed.sort((a, b) => {
    const aScore = Number(getMergedRatings(a.store)[sortKey] || 0);
    const bScore = Number(getMergedRatings(b.store)[sortKey] || 0);
    const aRank = aScore > 0 ? aScore : -1;
    const bRank = bScore > 0 ? bScore : -1;
    return bRank - aRank || a.index - b.index;
  }).map((item) => item.store);
}

function updateFilterLabels() {
  const selectedSort = sortOptions.find((option) => option.value === state.selectedSort);
  elements.categoryFilterButton.textContent = state.selectedCategory === "전체" ? "카테고리" : state.selectedCategory;
  elements.sortFilterButton.textContent = selectedSort && selectedSort.value !== "default" ? selectedSort.label : "정렬";

  elements.categoryFilterMenu.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.category === state.selectedCategory);
  });
  elements.sortFilterMenu.querySelectorAll("[data-sort]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.sort === state.selectedSort);
  });
}

function resetFilters() {
  state.selectedCategory = "전체";
  state.selectedSort = "default";
  state.searchQuery = "";
  elements.homeSearchInput.value = "";
  elements.homeSearchResults.innerHTML = "";
  applyFiltersAndSort();
}

function isUnevaluated(ratings) {
  return Object.keys(ratingLabels).every((key) => Number(ratings[key] || 0) === 0);
}

function formatScore(score) {
  return Number(score || 0) > 0 ? Number(score).toFixed(1) : "미평가";
}

async function initMap() {
  const sdkStatus = getKakaoSdkStatus();
  logMapDebug("SDK script 상태", sdkStatus);

  if (!sdkStatus.scriptFound) {
    logMapError("index.html에서 카카오맵 SDK script를 찾지 못했습니다.");
    renderMapFallback("카카오맵 SDK script가 없습니다. index.html 설정을 확인해 주세요.");
    return false;
  }

  if (!sdkStatus.hasAppKeyParam) {
    logMapError("카카오맵 SDK URL에 appkey 파라미터가 없습니다.", sdkStatus.safeSrc);
    renderMapFallback("카카오맵 SDK URL에 appkey 파라미터가 없습니다. script 주소를 확인해 주세요.");
    return false;
  }

  if (sdkStatus.isPlaceholderKey) {
    logMapDebug("카카오맵 JavaScript 키가 placeholder 상태입니다.");
    renderMapFallback("카카오맵 JavaScript 키를 설정하면 실제 지도와 마커가 표시됩니다.");
    return false;
  }

  const sdkReady = await waitForKakaoSdk(KAKAO_SDK_TIMEOUT_MS);
  if (!sdkReady) {
    logMapError("카카오맵 SDK를 불러오지 못했습니다.", {
      ...getKakaoSdkStatus(),
      kakaoExists: Boolean(window.kakao),
      kakaoMapsExists: Boolean(window.kakao && window.kakao.maps),
      protocol: window.location.protocol,
      host: window.location.host,
      href: window.location.href,
    });
    renderMapFallback("카카오맵 SDK를 불러오지 못했습니다. 네트워크와 도메인 등록 상태를 확인해 주세요.");
    return false;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    const timeoutId = window.setTimeout(() => {
      logMapError("kakao.maps.load() 콜백 대기 시간이 초과되었습니다.");
      renderMapFallback("카카오맵 로딩 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
      finish(false);
    }, 5000);

    window.kakao.maps.load(() => {
      window.clearTimeout(timeoutId);
      try {
        logMapDebug("kakao.maps.load() 완료. 지도 초기화를 시작합니다.");
        const center = getMapCenter(state.filteredStores);
        kakaoMap = new window.kakao.maps.Map(elements.customMap, {
          center,
          level: 4,
        });
        fitMapToStores(state.filteredStores);
        logMapDebug("카카오맵 초기화 완료", {
          markerSourceCount: stores.filter(hasStoreCoordinate).length,
        });
        finish(true);
      } catch (error) {
        logMapError("카카오맵 초기화 중 오류가 발생했습니다.", error);
        renderMapFallback("카카오맵을 초기화하지 못했습니다. API 키와 도메인 설정을 확인해 주세요.");
        finish(false);
      }
    });
  });
}

function renderMapMarkers(list = state.filteredStores) {
  if (!kakaoMap || !window.kakao || !window.kakao.maps) return;

  mapMarkers.forEach((marker) => marker.setMap(null));
  mapMarkers = list
    .filter(hasStoreCoordinate)
    .map((store) => {
      const marker = new window.kakao.maps.Marker({
        map: kakaoMap,
        position: new window.kakao.maps.LatLng(Number(store.lat), Number(store.lng)),
        title: store.name,
        zIndex: store.id === selectedStoreId ? 2 : 1,
      });
      window.kakao.maps.event.addListener(marker, "click", () => openDetail(store.id));
      return marker;
    });
}

function focusStoreOnMap(storeId) {
  const store = findStore(storeId);
  if (!kakaoMap || !window.kakao || !window.kakao.maps || !hasStoreCoordinate(store)) return;
  const position = new window.kakao.maps.LatLng(Number(store.lat), Number(store.lng));
  kakaoMap.panTo(position);
}

function fitMapToStores(list = state.filteredStores) {
  if (!kakaoMap || !window.kakao || !window.kakao.maps) return;
  const coordinateStores = list.filter(hasStoreCoordinate);
  if (!coordinateStores.length) return;

  const bounds = new window.kakao.maps.LatLngBounds();
  coordinateStores.forEach((store) => {
    bounds.extend(new window.kakao.maps.LatLng(Number(store.lat), Number(store.lng)));
  });
  kakaoMap.setBounds(bounds);
}

function getMapCenter(list = state.filteredStores) {
  const coordinateStores = list.filter(hasStoreCoordinate);
  if (!coordinateStores.length) {
    return new window.kakao.maps.LatLng(36.4712, 127.1393);
  }
  const totals = coordinateStores.reduce((acc, store) => ({
    lat: acc.lat + Number(store.lat),
    lng: acc.lng + Number(store.lng),
  }), { lat: 0, lng: 0 });
  return new window.kakao.maps.LatLng(totals.lat / coordinateStores.length, totals.lng / coordinateStores.length);
}

function hasStoreCoordinate(store) {
  return store && Number.isFinite(Number(store.lat)) && Number.isFinite(Number(store.lng));
}

function waitForKakaoSdk(timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === "function") {
        resolve(true);
        return;
      }

      if (window.__kakaoSdkLoadError) {
        logMapError("카카오맵 SDK script onerror가 발생했습니다.");
        resolve(false);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      window.setTimeout(check, 100);
    };

    check();
  });
}

function getKakaoSdkStatus() {
  const script = document.querySelector("#kakaoMapsSdk") || Array.from(document.scripts).find((item) => (
    item.src.includes("dapi.kakao.com/v2/maps/sdk.js")
  ));
  const src = script ? script.src : "";
  const status = {
    scriptFound: Boolean(script),
    safeSrc: redactKakaoAppKey(src),
    hasAppKeyParam: false,
    isPlaceholderKey: false,
    autoloadFalse: false,
    loadedFlag: Boolean(window.__kakaoSdkLoaded),
    loadErrorFlag: Boolean(window.__kakaoSdkLoadError),
  };

  if (!src) return status;

  try {
    const url = new URL(src, window.location.href);
    const appKey = url.searchParams.get("appkey") || "";
    status.hasAppKeyParam = url.searchParams.has("appkey");
    status.isPlaceholderKey = appKey === KAKAO_KEY_PLACEHOLDER;
    status.autoloadFalse = url.searchParams.get("autoload") === "false";
  } catch (error) {
    logMapError("카카오맵 SDK script URL을 해석하지 못했습니다.", error);
  }

  return status;
}

function redactKakaoAppKey(src) {
  if (!src) return "";
  try {
    const url = new URL(src, window.location.href);
    if (url.searchParams.has("appkey")) {
      const appKey = url.searchParams.get("appkey") || "";
      const redacted = appKey === KAKAO_KEY_PLACEHOLDER
        ? KAKAO_KEY_PLACEHOLDER
        : `${appKey.slice(0, 4)}...${appKey.slice(-4)}`;
      url.searchParams.set("appkey", redacted);
    }
    return url.toString();
  } catch {
    return src.replace(/appkey=([^&]+)/, "appkey=REDACTED");
  }
}

function logMapDebug(message, data) {
  if (data === undefined) {
    console.info(MAP_DEBUG_PREFIX, message);
    return;
  }
  console.info(MAP_DEBUG_PREFIX, message, data);
}

function logMapError(message, data) {
  if (data === undefined) {
    console.error(MAP_DEBUG_PREFIX, message);
    return;
  }
  console.error(MAP_DEBUG_PREFIX, message, data);
}

function renderMapFallback(message) {
  kakaoMap = null;
  mapMarkers = [];
  elements.customMap.innerHTML = `
    <div class="map-fallback" role="status">
      <strong>지도를 표시할 수 없습니다</strong>
      <p>${message}</p>
    </div>
  `;
}

function renderStoreList(list) {
  elements.storeCountBadge.textContent = `${list.length}곳`;
  if (!list.length) {
    elements.storeList.innerHTML = `<p class="empty-state">조건에 맞는 가게가 없습니다.</p>`;
    return;
  }

  elements.storeList.innerHTML = list.map((store) => {
    const ratings = getMergedRatings(store);
    const keywords = getTopKeywords(store).slice(0, 4);
    const menuText = getDisplayMenu(store);
    const priceText = getDisplayPrice(store);
    const reviewCount = getReviewCount(store);
    return `
      <article class="store-card" data-store-id="${store.id}">
        <div class="store-card-header">
          <div>
            <h3>${store.name}</h3>
            <p class="store-meta">${store.category} · ${menuText} · ${shortAddress(store.address)}</p>
            <p class="store-meta">${priceText}</p>
            <p class="review-count compact">총 평가 ${reviewCount}개</p>
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
    card.addEventListener("click", () => {
      openDetail(storeId);
      focusStoreOnMap(storeId);
    });
    card.querySelector(".detail-action").addEventListener("click", (event) => {
      event.stopPropagation();
      openDetail(storeId);
      focusStoreOnMap(storeId);
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
        <div class="score-chip ${Number(ratings[key] || 0) === 0 ? "unevaluated" : ""}">
          <span>${label}</span>
          <strong>${formatScore(ratings[key])}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSearchResults(query, mode) {
  const target = mode === "home" ? elements.homeSearchResults : elements.compareSearchResults;
  const results = (mode === "home" ? state.filteredStores : filterStores(query, "전체")).slice(0, 6);
  if (!query.trim()) {
    target.innerHTML = "";
    return;
  }
  target.innerHTML = results.length ? results.map((store) => `
    <button class="search-result" type="button" data-store-id="${store.id}">
      <span><strong>${store.name}</strong><br><small>${store.category} · ${getDisplayMenu(store)}</small></span>
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
  if (store.image) {
    elements.detailImage.src = store.image;
    elements.detailImage.classList.remove("hidden-image");
  } else {
    elements.detailImage.removeAttribute("src");
    elements.detailImage.classList.add("hidden-image");
  }
  elements.detailImage.alt = `${store.name} 대표 이미지`;
  elements.detailCategory.textContent = `${store.category} · ${store.type === "cafe" ? "카페" : "식사"}`;
  elements.detailName.textContent = store.name;
  elements.detailDescription.textContent = getDisplayDescription(store);
  elements.detailReviewCount.textContent = `총 평가 ${getReviewCount(store)}개`;
  elements.detailAddress.textContent = store.address;
  elements.detailHours.textContent = getDisplayHours(store);
  elements.detailMenu.textContent = getDisplayMenu(store, ", ");
  elements.detailPrice.textContent = getDisplayPrice(store);
  elements.detailKeywords.innerHTML = getTopKeywords(store).map((keyword) => `<span class="tag">${keyword}</span>`).join("");
  elements.detailRatings.innerHTML = Object.entries(ratingLabels).map(([key, label]) => renderRatingBar(label, ratings[key])).join("");
  elements.detailPanel.classList.remove("hidden");
  focusStoreOnMap(storeId);
  renderMapMarkers(state.filteredStores);
}

function closeDetail() {
  elements.detailPanel.classList.add("hidden");
}

function renderRatingBar(label, score) {
  if (Number(score || 0) === 0) {
    return `
      <div class="rating-bar unevaluated">
        <div class="rating-label"><span>${label}</span><strong>미평가</strong></div>
        <div class="bar-track"><div class="bar-fill" style="transform: scaleX(1)"></div></div>
      </div>
    `;
  }
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
      <input class="rating-slider" name="${key}" type="range" min="1" max="7" step="1" value="5" aria-label="${label} 점수">
      <div class="range-ticks">${Array.from({ length: 7 }, (_, index) => `<span>${index + 1}</span>`).join("")}</div>
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
    updateSliderTrack(input);
    input.addEventListener("input", () => {
      $(`#${input.name}Value`).textContent = input.value;
      updateSliderTrack(input);
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
  applyFiltersAndSort();
  showToast("평가가 저장되었습니다.");
}

function showToast(message) {
  if (!elements.toast) return;
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
    elements.toast.classList.add("hidden");
  }, 2000);
}

function updateSliderTrack(input) {
  const percent = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
  input.style.setProperty("--value-percent", `${percent}%`);
}

function getMergedRatings(store) {
  const reviews = loadReviews()[store.id] || [];
  if (!reviews.length) return { ...store.ratings };
  const merged = {};
  Object.keys(ratingLabels).forEach((key) => {
    const baseScore = Number(store.ratings[key] || 0);
    const reviewTotal = reviews.reduce((sum, review) => sum + Number(review.ratings[key] || 0), 0);
    merged[key] = baseScore > 0 ? (reviewTotal + baseScore) / (reviews.length + 1) : reviewTotal / reviews.length;
  });
  return merged;
}

function getReviewCount(store) {
  const baseCount = Number(store.ratingCount || 0);
  const localCount = (loadReviews()[store.id] || []).length;
  return baseCount + localCount;
}

function getDisplayMenu(store, separator = "; ") {
  const menu = Array.isArray(store.mainMenu) ? store.mainMenu.filter(Boolean) : [];
  if (!menu.length) return DISPLAY_FALLBACKS.menu;
  if (menu.length === 1 && isUnknownValue(menu[0])) return DISPLAY_FALLBACKS.menu;
  return menu.join(separator);
}

function getDisplayHours(store) {
  return isUnknownValue(store.hours) ? DISPLAY_FALLBACKS.hours : store.hours;
}

function getDisplayPrice(store) {
  const priceRange = store.priceRange;
  const avgPrice = store.avgPricePerPerson;
  if (isUnknownValue(priceRange) || isUnknownValue(avgPrice)) return DISPLAY_FALLBACKS.price;
  return priceRange;
}

function getDisplayDescription(store) {
  const description = store.description || "";
  if (isUnknownValue(description) || description === AUTO_DESCRIPTION) return DISPLAY_FALLBACKS.description;
  return description;
}

function isUnknownValue(value) {
  const text = String(value || "").trim();
  return !text || text === "확인 필요";
}

function getTopKeywords(store) {
  const counts = {};
  Object.values(store.keywords || {}).flat().forEach((keyword) => {
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
    const menuText = getDisplayMenu(store);
    return `
      <div class="compare-slot filled">
        ${store.image ? `<img src="${store.image}" alt="${store.name} 대표 이미지">` : `<div class="image-placeholder">이미지 없음</div>`}
        <h3>${store.name}</h3>
        <p class="compare-muted">${store.category} · ${menuText}</p>
        <button class="pill-button light remove-compare" type="button" data-store-id="${store.id}">선택 해제</button>
      </div>
    `;
  }).join("");

  elements.compareSlots.querySelectorAll(".remove-compare").forEach((button) => {
    button.addEventListener("click", () => removeFromCompare(button.dataset.storeId));
  });

  const rows = [
    ["대표 이미지", (store) => store.image ? `<img src="${store.image}" alt="${store.name}" style="width:100%;border-radius:14px;aspect-ratio:4/3;object-fit:cover;">` : "이미지 없음"],
    ["가게명", (store) => store.name],
    ["카테고리", (store) => store.category],
    ["대표 메뉴", (store) => getDisplayMenu(store, ", ")],
    ["가격대", (store) => getDisplayPrice(store)],
    ["주소", (store) => store.address],
    ["영업시간", (store) => getDisplayHours(store)],
    ["맛 점수", (store) => formatScore(getMergedRatings(store).taste)],
    ["가성비 점수", (store) => formatScore(getMergedRatings(store).value)],
    ["양 점수", (store) => formatScore(getMergedRatings(store).portion)],
    ["청결도 점수", (store) => formatScore(getMergedRatings(store).cleanliness)],
    ["주요 키워드", (store) => getTopKeywords(store).slice(0, 4).join(", ")],
    ["추천 상황", (store) => store.recommendFor && store.recommendFor.length ? store.recommendFor.join(", ") : "-"],
    ["한 줄 평가", (store) => getDisplayDescription(store)],
  ];

  elements.compareTable.innerHTML = rows.map(([label, getter]) => `
    <div class="compare-row">
      <div class="compare-label">${label}</div>
      ${[0, 1].map((index) => `<div class="compare-cell">${selectedStores[index] ? getter(selectedStores[index]) : "-"}</div>`).join("")}
    </div>
  `).join("");
}

function findStore(storeId) {
  return state.stores.find((store) => store.id === storeId);
}

function shortAddress(address) {
  return (address || "").replace("충남 공주시 ", "");
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
