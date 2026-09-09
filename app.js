// ==========================================================================
// Default Constants & Initial Data
// ==========================================================================
const DEFAULT_RESTAURANTS = [
  { id: "r1", name: "구내식당", category: "한식", price: 7500, mainDish: "오늘의 백반", selected: true },
  { id: "r2", name: "한옥집 김치찌개", category: "한식", price: 9500, mainDish: "돼지 김치찌개", selected: true },
  { id: "r3", name: "원조 순대국밥", category: "한식", price: 10000, mainDish: "순대국", selected: true },
  { id: "r4", name: "남산 돈까스", category: "양식", price: 11000, mainDish: "왕돈까스", selected: true },
  { id: "r5", name: "홍콩반점", category: "중식", price: 9000, mainDish: "짜장면 / 짬뽕", selected: true },
  { id: "r6", name: "미소야 라멘", category: "일식", price: 11500, mainDish: "돈카츠 라멘", selected: true },
  { id: "r7", name: "전주 비빔밥", category: "한식", price: 10500, mainDish: "돌솥 비빔밥", selected: true },
  { id: "r8", name: "포메인 쌀국수", category: "아시안", price: 12500, mainDish: "소고기 쌀국수", selected: true },
  { id: "r9", name: "버거킹", category: "양식", price: 8900, mainDish: "와퍼 세트", selected: true },
  { id: "r10", name: "스시야 모듬초밥", category: "일식", price: 14000, mainDish: "모듬초밥 (10p)", selected: true }
];

const SECTOR_COLORS = [
  "#ffd84d", // Neobrutalist Yellow
  "#8cbcff", // Neobrutalist Blue
  "#ff9fca", // Neobrutalist Pink
  "#a9e76c", // Neobrutalist Green
  "#b99cff", // Neobrutalist Purple
  "#ff9d57"  // Neobrutalist Orange
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// ==========================================================================
// Application State Management
// ==========================================================================
let restaurants = [];
let weeklyWinners = { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null };
let monthlyHistory = {}; // { "YYYY-MM-DD": { type: "winner"|"holiday"|"manual", restaurantName, category, price, mainDish } }

let priceFilter = "all"; // "all" | "under12k" | "over12k"
let currentAngle = 0;
let isSpinning = false;
let currentCalendarDate = new Date();
let selectedManualDay = null; // Day key or Date string for manual modal

// LocalStorage Keys
const STORAGE_KEY_LIST = "roulette_restaurant_list_v2";
const STORAGE_KEY_WINNERS = "roulette_weekly_winners_v2";
const STORAGE_KEY_HISTORY = "roulette_monthly_history_v2";
const STORAGE_KEY_WEEK = "roulette_saved_week_key";

// ==========================================================================
// DOM Element References
// ==========================================================================
const wheelCanvas = document.getElementById("wheelCanvas");
const ctx = wheelCanvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const resetWeekBtn = document.getElementById("resetWeekBtn");
const resetDefaultBtn = document.getElementById("resetDefaultBtn");
const candidatesCountBadge = document.getElementById("candidatesCountBadge");
const currentWeekInfo = document.getElementById("currentWeekInfo");

// Filter Buttons
const filterBtns = document.querySelectorAll(".filter-btn");

// Restaurant Form References
const addRestaurantForm = document.getElementById("addRestaurantForm");
const restaurantInput = document.getElementById("restaurantInput");
const categorySelect = document.getElementById("categorySelect");
const priceInput = document.getElementById("priceInput");
const mainDishInput = document.getElementById("mainDishInput");
const restaurantListEl = document.getElementById("restaurantList");

// Winner Modal References
const winnerModal = document.getElementById("winnerModal");
const winnerNameEl = document.getElementById("winnerName");
const winnerMetaEl = document.getElementById("winnerMeta");
const closeModalBtn = document.getElementById("closeModalBtn");

// Manual Modal References
const manualModal = document.getElementById("manualModal");
const manualModalTitle = document.getElementById("manualModalTitle");
const manualEntryForm = document.getElementById("manualEntryForm");
const holidayCheckbox = document.getElementById("holidayCheckbox");
const manualInputFields = document.getElementById("manualInputFields");
const manualRestaurantInput = document.getElementById("manualRestaurantInput");
const manualQuickTags = document.getElementById("manualQuickTags");
const clearManualBtn = document.getElementById("clearManualBtn");
const closeManualModalBtn = document.getElementById("closeManualModalBtn");

// Calendar References
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonthTitle = document.getElementById("calendarMonthTitle");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const todayMonthBtn = document.getElementById("todayMonthBtn");

const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas.getContext("2d");

// ==========================================================================
// Helper Functions
// ==========================================================================
function getWeekKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo}`;
}

function getWeekDates() {
  const now = new Date();
  const currentDay = now.getDay(); // 0:Sun, 1:Mon, ..., 6:Sat
  const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMon);

  const weekDates = {};
  const dayNames = ["월", "화", "수", "목", "금"];

  DAYS.forEach((dayKey, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const isoDateStr = `${year}-${month}-${date}`;
    weekDates[dayKey] = {
      fullDateStr: `${year}.${month}.${date}`,
      shortDateStr: `${month}.${date}`,
      isoDateStr,
      dayName: `${dayNames[index]}`
    };
  });

  return { monday, weekDates };
}

function getTodayDayKey() {
  const dayIndex = new Date().getDay();
  if (dayIndex >= 1 && dayIndex <= 5) {
    return DAYS[dayIndex - 1];
  }
  return "Mon";
}

function formatPrice(num) {
  return (num || 0).toLocaleString() + "원";
}

// ==========================================================================
// State Storage & Load Operations
// ==========================================================================
let isFirebaseLoaded = false;

function loadState() {
  // 1. Load Restaurant List
  const savedList = localStorage.getItem(STORAGE_KEY_LIST);
  if (savedList !== null) {
    try {
      restaurants = JSON.parse(savedList);
    } catch (e) {
      restaurants = [];
    }
  } else {
    restaurants = [];
  }

  // 2. Load History
  const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
  if (savedHistory) {
    try {
      monthlyHistory = JSON.parse(savedHistory);
    } catch (e) {
      monthlyHistory = {};
    }
  }

  // 3. Load Week & Winners
  const currentWeek = getWeekKey();
  const savedWeek = localStorage.getItem(STORAGE_KEY_WEEK);

  if (savedWeek !== currentWeek) {
    weeklyWinners = { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null };
    localStorage.setItem(STORAGE_KEY_WEEK, currentWeek);
    saveWeeklyWinners();
  } else {
    const savedWinners = localStorage.getItem(STORAGE_KEY_WINNERS);
    if (savedWinners) {
      try {
        weeklyWinners = JSON.parse(savedWinners);
      } catch (e) {
        weeklyWinners = { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null };
      }
    }
  }

  const { weekDates } = getWeekDates();
  currentWeekInfo.textContent = `${weekDates["Mon"].fullDateStr} ~ ${weekDates["Fri"].shortDateStr}`;
}

// ==========================================================================
// Native Firebase Realtime DB Synchronization Engine (Zero External SDK)
// ==========================================================================
const DEFAULT_FIREBASE_URL = "https://lunch-41413-default-rtdb.asia-southeast1.firebasedatabase.app";
let isDbOnline = false;
let eventSourceInstance = null;
const STORAGE_KEY_FIREBASE_CFG = "roulette_firebase_config_v1";

function getCleanDbUrl() {
  let url = localStorage.getItem(STORAGE_KEY_FIREBASE_CFG) || DEFAULT_FIREBASE_URL;
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    url = DEFAULT_FIREBASE_URL;
  }
  return url.trim().replace(/\/+$/, "");
}

function applyFirebaseData(data) {
  isFirebaseLoaded = true;
  if (!data || typeof data !== "object") return;

  // 1. Restaurants processing (with empty marker handling)
  if (data.restaurants) {
    if (Array.isArray(data.restaurants) && data.restaurants[0] === "__EMPTY_MARKER__") {
      restaurants = [];
    } else if (Array.isArray(data.restaurants)) {
      restaurants = data.restaurants;
    } else {
      restaurants = [];
    }
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(restaurants));
  } else if (data.hasSynced) {
    restaurants = [];
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(restaurants));
  } else if (localStorage.getItem(STORAGE_KEY_LIST) === null) {
    restaurants = [...DEFAULT_RESTAURANTS];
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(restaurants));
    syncToFirebase();
  }

  // 2. Weekly winners processing
  if (data.weeklyWinners) {
    weeklyWinners = data.weeklyWinners;
    localStorage.setItem(STORAGE_KEY_WINNERS, JSON.stringify(weeklyWinners));
  } else if (data.hasSynced) {
    weeklyWinners = { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null };
    localStorage.setItem(STORAGE_KEY_WINNERS, JSON.stringify(weeklyWinners));
  }

  // 3. Monthly history processing
  if (data.monthlyHistory) {
    monthlyHistory = data.monthlyHistory;
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(monthlyHistory));
  } else if (data.hasSynced) {
    monthlyHistory = {};
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(monthlyHistory));
  }

  renderUI();
}

function initFirebase() {
  if (typeof fetch === "undefined") return;
  const dbStatusBadge = document.getElementById("dbStatusBadge");
  const dbStatusText = document.getElementById("dbStatusText");

  const baseUrl = getCleanDbUrl();
  const jsonUrlWithCacheBust = `${baseUrl}/lunch_app.json?t=${Date.now()}`;
  const jsonUrlRaw = `${baseUrl}/lunch_app.json`;

  fetch(jsonUrlWithCacheBust)
    .then(response => {
      if (!response.ok) throw new Error("HTTP error " + response.status);
      return response.json();
    })
    .then(data => {
      if (data) {
        applyFirebaseData(data);
      } else {
        isFirebaseLoaded = true;
        if (localStorage.getItem(STORAGE_KEY_LIST) === null) {
          restaurants = [...DEFAULT_RESTAURANTS];
          localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(restaurants));
        }
        syncToFirebase();
      }

      isDbOnline = true;
      if (dbStatusBadge) {
        dbStatusBadge.className = "db-status-badge online";
        dbStatusText.textContent = "실시간 DB 연결됨";
      }

      setupEventSource(jsonUrlRaw);
    })
    .catch(err => {
      console.warn("Firebase REST fetch fallback to local:", err);
      isDbOnline = false;
      isFirebaseLoaded = true;
      if (localStorage.getItem(STORAGE_KEY_LIST) === null && restaurants.length === 0) {
        restaurants = [...DEFAULT_RESTAURANTS];
        localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(restaurants));
        renderUI();
      }
      if (dbStatusBadge) {
        dbStatusBadge.className = "db-status-badge offline";
        dbStatusText.textContent = "로컬 모드";
      }
    });
}

function setupEventSource(jsonUrl) {
  try {
    if (typeof EventSource !== "undefined") {
      if (eventSourceInstance) eventSourceInstance.close();
      eventSourceInstance = new EventSource(jsonUrl);
      eventSourceInstance.addEventListener("put", (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.data) {
            applyFirebaseData(parsed.data);
          }
        } catch (err) {
          // ignore stream parse errors
        }
      });
    }
  } catch (e) {
    console.warn("EventSource setup warning:", e);
  }
}

function syncToFirebase() {
  if (typeof fetch === "undefined") return;
  if (!isFirebaseLoaded) return; // Prevent overwriting DB before initial fetch completes

  const baseUrl = getCleanDbUrl();
  const jsonUrl = `${baseUrl}/lunch_app.json`;

  const payload = {
    restaurants: (restaurants && restaurants.length > 0) ? restaurants : ["__EMPTY_MARKER__"],
    weeklyWinners: weeklyWinners || { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null },
    monthlyHistory: monthlyHistory || {},
    hasSynced: true,
    updatedAt: Date.now()
  };

  fetch(jsonUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(() => {
      isDbOnline = true;
      const dbStatusBadge = document.getElementById("dbStatusBadge");
      const dbStatusText = document.getElementById("dbStatusText");
      if (dbStatusBadge) {
        dbStatusBadge.className = "db-status-badge online";
        dbStatusText.textContent = "실시간 DB 연결됨";
      }
    })
    .catch(err => {
      console.warn("Sync to Firebase failed:", err);
    });
}



function openDbModal() {
  const dbModal = document.getElementById("dbModal");
  const dbConfigInput = document.getElementById("dbConfigInput");
  const savedCfg = localStorage.getItem(STORAGE_KEY_FIREBASE_CFG) || DEFAULT_FIREBASE_URL;

  if (dbModal) {
    if (dbConfigInput) dbConfigInput.value = savedCfg;
    dbModal.classList.remove("hidden");
    dbModal.style.setProperty("display", "flex", "important");
    dbModal.style.setProperty("opacity", "1", "important");
    dbModal.style.setProperty("pointer-events", "auto", "important");
  }
}

function hideDbModal() {
  const dbModal = document.getElementById("dbModal");
  if (dbModal) {
    dbModal.classList.add("hidden");
    dbModal.style.setProperty("display", "none", "important");
    dbModal.style.setProperty("opacity", "0", "important");
    dbModal.style.setProperty("pointer-events", "none", "important");
  }
}

window.openDbModal = openDbModal;
window.hideDbModal = hideDbModal;

function saveRestaurantList() {
  localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(restaurants));
  syncToFirebase();
}

function saveWeeklyWinners() {
  localStorage.setItem(STORAGE_KEY_WINNERS, JSON.stringify(weeklyWinners));
  syncToFirebase();
}

function saveMonthlyHistory() {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(monthlyHistory));
  syncToFirebase();
}


// ==========================================================================
// Advanced Candidate Filtering Logic & Smart Similar Dish Prevention
// ==========================================================================
const SIMILAR_DISH_KEYWORDS = [
  "제육", "김치찌개", "돈까스", "돈카츠", "짜장", "짬뽕", "순대국", "초밥",
  "스시", "쌀국수", "비빔밥", "부대찌개", "된장찌개", "칼국수", "우동",
  "라멘", "카레", "국밥", "찌개", "덮밥", "파스타", "냉면", "마라탕",
  "갈치조림", "생선구이", "조림", "보쌈", "삼계탕", "아구찜", "뷔페", "백반", "보리밥", "육개장", "짜글이", "두루치기"
];

function extractDishKeywords(dishText) {
  if (!dishText || dishText.trim() === "" || dishText === "없음") return [];
  const clean = dishText.trim();
  const found = [];
  
  SIMILAR_DISH_KEYWORDS.forEach(kw => {
    if (clean.includes(kw)) {
      found.push(kw);
    }
  });

  if (found.length === 0) {
    found.push(clean);
  }

  return found;
}

function getAvailableCandidates() {
  // 0. Filter out restaurants that are unselected (체크 해제된 식당 제외)
  let candidates = restaurants.filter(item => item.selected !== false);

  // 1. Filter out restaurants already won or assigned this week
  const usedWinnerNames = Object.values(weeklyWinners)
    .filter(val => val && val.type !== "holiday")
    .map(val => (typeof val === 'string' ? val : val.name));

  candidates = candidates.filter(item => !usedWinnerNames.includes(item.name));

  // 2. Price Filter Condition (12,000원 기준)
  if (priceFilter === "under12k") {
    candidates = candidates.filter(item => item.price <= 12000);
  } else if (priceFilter === "over12k") {
    candidates = candidates.filter(item => item.price > 12000);
  }

  // 3. Main Dish Uniqueness & Smart Similar Dish Group Prevention Logic
  const usedWinnerDishes = Object.values(weeklyWinners)
    .filter(val => val && val.type !== "holiday" && val.mainDish && val.mainDish.trim() !== "" && val.mainDish !== "없음")
    .map(val => val.mainDish.trim());

  const usedDishKeywords = [];
  usedWinnerDishes.forEach(dish => {
    const kws = extractDishKeywords(dish);
    kws.forEach(k => usedDishKeywords.push(k));
  });

  candidates = candidates.filter(item => {
    if (!item.mainDish || item.mainDish.trim() === "" || item.mainDish === "없음") return true;
    const itemKws = extractDishKeywords(item.mainDish);
    const isConflict = itemKws.some(kw => usedDishKeywords.includes(kw));
    return !isConflict;
  });

  // 4. Non-Korean Category 2 Consecutive Days Prevention (비한식 2일 연속 금지)
  // Find recent previous day winner category
  let lastNonEmptyDayKey = null;
  for (let i = DAYS.length - 1; i >= 0; i--) {
    const dayKey = DAYS[i];
    if (weeklyWinners[dayKey] && weeklyWinners[dayKey].type !== "holiday") {
      lastNonEmptyDayKey = dayKey;
      break;
    }
  }

  if (lastNonEmptyDayKey) {
    const prevWinner = weeklyWinners[lastNonEmptyDayKey];
    const prevCategory = prevWinner ? prevWinner.category : null;

    // If previous winner category is NOT "한식", restrict same category consecutively
    if (prevCategory && prevCategory !== "한식") {
      candidates = candidates.filter(item => item.category !== prevCategory);
    }
  }

  return candidates;
}

// ==========================================================================
// UI Rendering Functions
// ==========================================================================
function syncWeeklyToMonthly() {
  const { weekDates } = getWeekDates();
  if (!weekDates) return;

  let hasChanged = false;

  DAYS.forEach(dayKey => {
    const winner = weeklyWinners[dayKey];
    if (weekDates[dayKey]) {
      const targetIsoDate = weekDates[dayKey].isoDateStr;
      
      if (!winner) {
        if (monthlyHistory[targetIsoDate]) {
          delete monthlyHistory[targetIsoDate];
          hasChanged = true;
        }
      } else if (winner.type === "holiday") {
        if (!monthlyHistory[targetIsoDate] || monthlyHistory[targetIsoDate].type !== "holiday") {
          monthlyHistory[targetIsoDate] = { type: "holiday" };
          hasChanged = true;
        }
      } else {
        const name = typeof winner === 'string' ? winner : (winner.restaurantName || winner.name || "식당");
        const category = typeof winner === 'object' ? (winner.category || "기타") : "기타";
        const price = typeof winner === 'object' ? (winner.price || 0) : 0;
        const mainDish = typeof winner === 'object' ? (winner.mainDish || "") : "";

        const currentRec = monthlyHistory[targetIsoDate];
        if (!currentRec || currentRec.restaurantName !== name || currentRec.name !== name || currentRec.category !== category) {
          monthlyHistory[targetIsoDate] = {
            type: winner.type || "winner",
            restaurantName: name,
            name: name,
            category: category,
            price: price,
            mainDish: mainDish
          };
          hasChanged = true;
        }
      }
    }
  });

  if (hasChanged) {
    saveMonthlyHistory();
  }
}

function renderUI() {
  syncWeeklyToMonthly();
  renderWeeklyGrid();
  renderRestaurantTags();
  renderCalendar();
  drawWheel();
}

function renderWeeklyGrid() {
  const todayKey = getTodayDayKey();
  const { weekDates } = getWeekDates();

  DAYS.forEach(day => {
    const valEl = document.getElementById(`day-${day}`);
    const subEl = document.getElementById(`sub-${day}`);
    const labelEl = document.getElementById(`label-${day}`);
    const parentBox = valEl.closest(".day-box");
    const winnerData = weeklyWinners[day];
    const dateInfo = weekDates[day];

    if (labelEl && dateInfo) {
      labelEl.innerHTML = `${dateInfo.dayName} <span class="day-date">(${dateInfo.shortDateStr})</span>`;
    }

    parentBox.classList.remove("has-winner", "is-today", "is-holiday");

    if (day === todayKey) {
      parentBox.classList.add("is-today");
    }

    if (!winnerData) {
      valEl.textContent = "미정";
      if (subEl) subEl.textContent = "";
    } else if (winnerData.type === "holiday") {
      valEl.textContent = "🏖️ 휴무";
      if (subEl) subEl.textContent = "쉬는 날";
      parentBox.classList.add("is-holiday");
    } else {
      const name = typeof winnerData === 'string' ? winnerData : winnerData.name;
      const cat = typeof winnerData === 'object' ? winnerData.category : "";
      const price = typeof winnerData === 'object' ? winnerData.price : 0;
      
      valEl.textContent = name;
      if (subEl) subEl.textContent = `${cat ? '['+cat+'] ' : ''}${price ? formatPrice(price) : ''}`;
      parentBox.classList.add("has-winner");
    }
  });
}

function renderRestaurantTags() {
  restaurantListEl.innerHTML = "";
  const usedWinnerNames = Object.values(weeklyWinners)
    .filter(val => val && val.type !== "holiday")
    .map(val => (typeof val === 'string' ? val : val.name));

  restaurants.forEach((item) => {
    const isUsed = usedWinnerNames.includes(item.name);
    const isSelected = item.selected !== false;
    
    const tag = document.createElement("div");
    tag.className = `tag-item ${isUsed ? 'used' : ''} ${!isSelected ? 'unselected' : ''}`;
    
    const catClass = `cat-${item.category || '기타'}`;
    const mainDishText = item.mainDish && item.mainDish !== '없음' ? ` (${item.mainDish})` : '';

    tag.innerHTML = `
      <input type="checkbox" class="tag-checkbox" ${isSelected ? 'checked' : ''} />
      <span class="cat-badge ${catClass}">${item.category || '기타'}</span>
      <strong>${item.name}</strong>${mainDishText}
      <span class="tag-price">${formatPrice(item.price)}</span>
      <button class="tag-edit" title="식당 수정" data-id="${item.id || item.name}">✏️</button>
      <button class="tag-remove" title="식당 삭제" data-id="${item.id || item.name}">&times;</button>
    `;

    // Click on tag to toggle selection
    tag.addEventListener("click", (e) => {
      if (e.target.classList.contains("tag-remove") || e.target.classList.contains("tag-edit")) return;
      toggleRestaurantSelection(item.id || item.name);
    });

    const checkbox = tag.querySelector(".tag-checkbox");
    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleRestaurantSelection(item.id || item.name);
    });

    tag.querySelector(".tag-edit").addEventListener("click", (e) => {
      e.stopPropagation();
      openEditRestaurantModal(item.id || item.name);
    });

    tag.querySelector(".tag-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      removeRestaurant(item.id || item.name);
    });

    restaurantListEl.appendChild(tag);
  });
}

function toggleRestaurantSelection(idOrName) {
  const target = restaurants.find(r => r.id === idOrName || r.name === idOrName);
  if (target) {
    target.selected = target.selected === false ? true : false;
    saveRestaurantList();
    renderUI();
  }
}

function setAllRestaurantsSelection(selectBool) {
  restaurants.forEach(r => {
    r.selected = selectBool;
  });
  saveRestaurantList();
  renderUI();
}

// ==========================================================================
// Monthly Calendar Rendering Engine
// ==========================================================================
function renderCalendar() {
  if (!calendarGrid) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth(); // 0-indexed

  calendarMonthTitle.textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1).getDay(); // Day of week for 1st day (0:Sun)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  calendarGrid.innerHTML = "";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { weekDates } = getWeekDates();
  const currentWeekMap = {};
  if (weekDates) {
    DAYS.forEach(dayKey => {
      if (weekDates[dayKey]) {
        currentWeekMap[weekDates[dayKey].isoDateStr] = weeklyWinners[dayKey];
      }
    });
  }

  // 1. Previous Month Leading Days
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const cell = document.createElement("div");
    cell.className = "cal-day-cell other-month";
    cell.innerHTML = `<div class="cal-day-header"><span class="cal-day-num">${dayNum}</span></div>`;
    calendarGrid.appendChild(cell);
  }

  // 2. Current Month Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay();

    const cell = document.createElement("div");
    cell.className = "cal-day-cell";
    if (dayOfWeek === 0) cell.classList.add("sun");
    if (dayOfWeek === 6) cell.classList.add("sat");
    if (dateStr === todayStr) cell.classList.add("today");

    let record = monthlyHistory[dateStr];
    if (currentWeekMap[dateStr] !== undefined) {
      const w = currentWeekMap[dateStr];
      if (!w) {
        record = null;
      } else if (w.type === "holiday") {
        record = { type: "holiday" };
      } else {
        const rName = typeof w === 'string' ? w : (w.restaurantName || w.name || '식당');
        const rCat = typeof w === 'object' ? (w.category || '기타') : '기타';
        const rPrice = typeof w === 'object' ? (w.price || 0) : 0;
        const rDish = typeof w === 'object' ? (w.mainDish || '') : '';
        record = {
          type: w.type || "winner",
          restaurantName: rName,
          name: rName,
          category: rCat,
          price: rPrice,
          mainDish: rDish
        };
      }
    }

    let contentHtml = "";

    if (record) {
      if (record.type === "holiday") {
        contentHtml = `<div class="cal-holiday-tag">🏖️ 휴무</div>`;
      } else {
        const catClass = `cat-${record.category || '기타'}`;
        const restName = record.restaurantName || record.name || '식당';
        contentHtml = `
          <div class="cal-entry-box">
            <span class="cat-badge ${catClass}">${record.category || '기타'}</span>
            <div class="cal-restaurant-name">${restName}</div>
          </div>
        `;
      }
    }

    cell.innerHTML = `
      <div class="cal-day-header">
        <span class="cal-day-num">${d}</span>
      </div>
      ${contentHtml}
    `;

    cell.addEventListener("click", () => {
      openManualModalForDate(dateStr);
    });

    calendarGrid.appendChild(cell);
  }

  // 3. Next Month Trailing Days
  const totalCells = firstDay + daysInMonth;
  const nextDays = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= nextDays; i++) {
    const cell = document.createElement("div");
    cell.className = "cal-day-cell other-month";
    cell.innerHTML = `<div class="cal-day-header"><span class="cal-day-num">${i}</span></div>`;
    calendarGrid.appendChild(cell);
  }
}

// ==========================================================================
// Canvas Wheel Rendering & Physics Engine
// ==========================================================================
function drawWheel() {
  if (!wheelCanvas || !ctx) return;
  const candidates = getAvailableCandidates();
  const count = candidates.length;
  if (candidatesCountBadge) candidatesCountBadge.textContent = `남은 후보: ${count}곳`;

  ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

  const centerX = wheelCanvas.width / 2;
  const centerY = wheelCanvas.height / 2;
  const radius = wheelCanvas.width / 2 - 10;

  if (count === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 16px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("조건을 만족하는 후보 없음", centerX, centerY - 10);
    ctx.font = "12px 'Noto Sans KR', sans-serif";
    ctx.fillText("(필터 변경 또는 주간 리셋 필요)", centerX, centerY + 14);
    ctx.restore();

    spinBtn.disabled = true;
    return;
  }

  spinBtn.disabled = false;
  const sliceAngle = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const startAngle = currentAngle + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const item = candidates[i];

    // Sector Fill
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = SECTOR_COLORS[i % SECTOR_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Sector Text & Category Badge
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#171717";
    ctx.font = "700 15px 'Space Grotesk', 'Noto Sans KR', sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(item.name, radius - 24, 4);
    ctx.restore();
  }
}

// Wheel Physics & Dynamic Random Selection
let currentTargetAngle = 0;
let animationFrameId = null;
let comboCount = 0;
let currentChosenWinner = null;
let spinStartTime = null;
let spinDuration = 4200; // 4.2 seconds for realistic dramatic slow down
let spinStartAngle = 0;
let audioCtx = null;

function playTickSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(580, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch (e) {
    // audio play ignored if muted/blocked
  }
}

let pointerTickTimeout = null;

function resetPointer() {
  const wheelPointer = document.querySelector(".wheel-pointer");
  if (wheelPointer) {
    if (pointerTickTimeout) clearTimeout(pointerTickTimeout);
    wheelPointer.style.transform = "translateX(-50%) rotate(0deg)";
  }
}

function triggerPointerTick(isBoost = false) {
  const wheelPointer = document.querySelector(".wheel-pointer");
  if (!wheelPointer) return;

  if (pointerTickTimeout) clearTimeout(pointerTickTimeout);

  const angle = isBoost ? 18 : 10;
  wheelPointer.style.transform = `translateX(-50%) rotate(${angle}deg)`;

  pointerTickTimeout = setTimeout(() => {
    wheelPointer.style.transform = "translateX(-50%) rotate(0deg)";
  }, 60);

  playTickSound();
}

function spinWheel() {
  const candidates = getAvailableCandidates();
  if (candidates.length === 0) {
    alert("남은 식당 후보가 없습니다! 필터 옵션을 해제하거나 '이번 주 리셋'을 눌러주세요.");
    return;
  }

  const wheelWrapper = document.querySelector(".wheel-wrapper");
  const totalSlices = candidates.length;
  const sliceAngle = (Math.PI * 2) / totalSlices;

  // 1. Select a FRESH random winning candidate
  const winningIndex = Math.floor(Math.random() * totalSlices);
  currentChosenWinner = candidates[winningIndex];

  // 2. Normalize currentAngle [0, 2*PI)
  currentAngle = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  // 3. Calculate target angle so sector center lands at top pointer (3*PI/2)
  const targetSectorCenter = winningIndex * sliceAngle + sliceAngle / 2;
  let desiredFinalAngle = (3 * Math.PI / 2 - targetSectorCenter) % (Math.PI * 2);
  if (desiredFinalAngle < 0) desiredFinalAngle += Math.PI * 2;

  let deltaAngle = desiredFinalAngle - currentAngle;
  if (deltaAngle <= 0) deltaAngle += Math.PI * 2;

  // 속도감 극대화: 10~15 바퀴 회전
  const extraRounds = Math.PI * 2 * (10 + Math.floor(Math.random() * 5));

  if (isSpinning) {
    comboCount++;
    spinDuration = Math.max(1600, 3200 - comboCount * 300);
    spinStartAngle = currentAngle;
    currentTargetAngle = currentAngle + deltaAngle + extraRounds + (Math.PI * 2 * comboCount * 2);
    spinStartTime = performance.now(); // 시간 기점 리셋으로 연타 회전 계속 유효하게 만듦!

    triggerPointerTick(true);
    updateSpinBtnText(`⚡ 연타 가속 x${comboCount}!`);
    return;
  }

  isSpinning = true;
  comboCount = 1;
  spinDuration = 3200; // 빠른 스피드감
  if (wheelWrapper) wheelWrapper.classList.add("is-spinning-active");
  updateSpinBtnText("🔥 룰렛 회전 중! (연타 가능)");

  spinStartAngle = currentAngle;
  currentTargetAngle = currentAngle + deltaAngle + extraRounds;
  spinStartTime = performance.now();
  let lastSectorIndex = -1;

  // Fast & Sharp Ease Out Quart for dramatic high-speed feel
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(now) {
    const elapsed = now - spinStartTime;
    const progress = Math.min(elapsed / spinDuration, 1);
    const easedProgress = easeOutQuart(progress);

    currentAngle = spinStartAngle + (currentTargetAngle - spinStartAngle) * easedProgress;

    const normalizedAngle = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const currentSectorUnderPointer = Math.floor(
      ((3 * Math.PI / 2 - normalizedAngle + Math.PI * 2 * 10) % (Math.PI * 2)) / sliceAngle
    );

    if (currentSectorUnderPointer !== lastSectorIndex) {
      lastSectorIndex = currentSectorUnderPointer;
      triggerPointerTick();
    }

    drawWheel();

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      currentAngle = currentTargetAngle;
      drawWheel();
      resetPointer();

      isSpinning = false;
      comboCount = 0;
      updateSpinBtnText("🎲 룰렛 돌리기!");
      if (wheelWrapper) wheelWrapper.classList.remove("is-spinning-active");

      onSpinComplete(currentChosenWinner);
    }
  }

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(animate);
}

function updateSpinBtnText(text) {
  if (spinBtn) spinBtn.textContent = text;
}

function onSpinComplete(winnerObject) {
  const { weekDates } = getWeekDates();
  let targetDay = getTodayDayKey();

  if (weeklyWinners[targetDay]) {
    const emptyDay = DAYS.find(day => !weeklyWinners[day]);
    if (emptyDay) targetDay = emptyDay;
  }

  // Store winner in weekly state
  weeklyWinners[targetDay] = {
    type: "winner",
    name: winnerObject.name,
    category: winnerObject.category,
    price: winnerObject.price,
    mainDish: winnerObject.mainDish
  };
  saveWeeklyWinners();

  // Store winner in monthly calendar history
  const targetIsoDate = weekDates[targetDay].isoDateStr;
  monthlyHistory[targetIsoDate] = {
    type: "winner",
    restaurantName: winnerObject.name,
    category: winnerObject.category,
    price: winnerObject.price,
    mainDish: winnerObject.mainDish
  };
  saveMonthlyHistory();

  // Normalize currentAngle
  currentAngle = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  // Render Modal
  winnerNameEl.textContent = winnerObject.name;
  winnerMetaEl.innerHTML = `
    <span class="cat-badge cat-${winnerObject.category}">${winnerObject.category}</span>
    <span style="font-weight:700;">${formatPrice(winnerObject.price)}</span>
    ${winnerObject.mainDish && winnerObject.mainDish !== '없음' ? `<span style="color:var(--text-muted);">| 대표: ${winnerObject.mainDish}</span>` : ''}
  `;
  winnerModal.classList.remove("hidden");
  winnerModal.style.setProperty("display", "flex", "important");
  winnerModal.style.setProperty("opacity", "1", "important");
  winnerModal.style.setProperty("pointer-events", "auto", "important");
  
  triggerConfetti();
  renderUI();
}

// ==========================================================================
// Restaurant Item Management
// ==========================================================================
function addRestaurant(name, category, price, mainDish) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  if (restaurants.some(r => r.name === trimmedName)) {
    alert("이미 존재해는 식당 이름입니다.");
    return;
  }

  const newRestaurant = {
    id: "r_" + Date.now(),
    name: trimmedName,
    category: category || "한식",
    price: parseInt(price) || 10000,
    mainDish: (mainDish || "").trim() || "없음",
    selected: true
  };

  restaurants.push(newRestaurant);
  saveRestaurantList();
  renderUI();

  restaurantInput.value = "";
  priceInput.value = "";
  mainDishInput.value = "";
}

function removeRestaurant(idOrName) {
  restaurants = restaurants.filter(r => r.id !== idOrName && r.name !== idOrName);
  saveRestaurantList();
  renderUI();
}

function resetToDefault() {
  if (confirm("식당 목록을 기본 세트로 초기화하시겠습니까?")) {
    restaurants = [...DEFAULT_RESTAURANTS];
    saveRestaurantList();
    renderUI();
  }
}

function resetWeek() {
  if (confirm("이번 주 당첨 기록을 초기화하시겠습니까? (이번 주 월간 달력 기록도 함께 연동되어 초기화됩니다)")) {
    const { weekDates } = getWeekDates();
    DAYS.forEach(dayKey => {
      weeklyWinners[dayKey] = null;
      if (weekDates[dayKey]) {
        delete monthlyHistory[weekDates[dayKey].isoDateStr];
      }
    });
    saveWeeklyWinners();
    saveMonthlyHistory();
    renderUI();
  }
}

window.resetToDefault = resetToDefault;
window.resetWeek = resetWeek;

// ==========================================================================
// Manual Modal & Holiday Operations
// ==========================================================================
function openManualModalForDay(dayKey) {
  selectedManualDay = dayKey;
  const { weekDates } = getWeekDates();
  const dateInfo = weekDates[dayKey];

  manualModalTitle.textContent = `${dateInfo.dayName}요일 (${dateInfo.shortDateStr}) 수동 입력 및 휴무일 설정`;
  
  const currentWinner = weeklyWinners[dayKey];
  if (currentWinner && currentWinner.type === "holiday") {
    holidayCheckbox.checked = true;
    manualInputFields.style.display = "none";
    manualRestaurantInput.value = "";
  } else {
    holidayCheckbox.checked = false;
    manualInputFields.style.display = "block";
    manualRestaurantInput.value = currentWinner ? (typeof currentWinner === 'string' ? currentWinner : currentWinner.name) : "";
  }

  renderQuickTags();
  manualModal.classList.remove("hidden");
  manualModal.style.setProperty("display", "flex", "important");
  manualModal.style.setProperty("opacity", "1", "important");
  manualModal.style.setProperty("pointer-events", "auto", "important");
}

function openManualModalForDate(dateStr) {
  selectedManualDay = dateStr;
  manualModalTitle.textContent = `${dateStr} 식당 입력 및 휴무일 설정`;

  const record = monthlyHistory[dateStr];
  if (record && record.type === "holiday") {
    holidayCheckbox.checked = true;
    manualInputFields.style.display = "none";
    manualRestaurantInput.value = "";
  } else {
    holidayCheckbox.checked = false;
    manualInputFields.style.display = "block";
    manualRestaurantInput.value = record ? record.restaurantName : "";
  }

  renderQuickTags();
  manualModal.classList.remove("hidden");
  manualModal.style.setProperty("display", "flex", "important");
  manualModal.style.setProperty("opacity", "1", "important");
  manualModal.style.setProperty("pointer-events", "auto", "important");
}

window.openManualModalForDay = openManualModalForDay;
window.openManualModalForDate = openManualModalForDate;

function openEditRestaurantModal(idOrName) {
  const target = restaurants.find(r => r.id === idOrName || r.name === idOrName);
  if (!target) return;

  const idInput = document.getElementById("editRestaurantId");
  const nameInput = document.getElementById("editRestaurantName");
  const catSelect = document.getElementById("editCategorySelect");
  const priceInput = document.getElementById("editPriceInput");
  const dishInput = document.getElementById("editMainDishInput");

  if (idInput) idInput.value = target.id || target.name;
  if (nameInput) nameInput.value = target.name;
  if (catSelect) catSelect.value = target.category || "한식";
  if (priceInput) priceInput.value = target.price || 10000;
  if (dishInput) dishInput.value = target.mainDish === "없음" ? "" : (target.mainDish || "");

  const modal = document.getElementById("editRestaurantModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
    modal.style.setProperty("opacity", "1", "important");
    modal.style.setProperty("pointer-events", "auto", "important");
  }
}

function closeEditRestaurantModal() {
  const modal = document.getElementById("editRestaurantModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
    modal.style.setProperty("opacity", "0", "important");
    modal.style.setProperty("pointer-events", "none", "important");
  }
}

function saveEditRestaurant(e) {
  if (e) e.preventDefault();
  const id = document.getElementById("editRestaurantId").value;
  const name = document.getElementById("editRestaurantName").value.trim();
  const category = document.getElementById("editCategorySelect").value;
  const price = parseInt(document.getElementById("editPriceInput").value) || 10000;
  const mainDish = document.getElementById("editMainDishInput").value.trim() || "없음";

  if (!name) return;

  const index = restaurants.findIndex(r => r.id === id || r.name === id);
  if (index !== -1) {
    const oldName = restaurants[index].name;

    restaurants[index].name = name;
    restaurants[index].category = category;
    restaurants[index].price = price;
    restaurants[index].mainDish = mainDish;

    // 1. Sync updated restaurant details to weeklyWinners automatically
    DAYS.forEach(dayKey => {
      const winner = weeklyWinners[dayKey];
      if (winner && winner.type !== "holiday" && (winner.name === oldName || winner.restaurantName === oldName)) {
        weeklyWinners[dayKey].name = name;
        weeklyWinners[dayKey].restaurantName = name;
        weeklyWinners[dayKey].category = category;
        weeklyWinners[dayKey].price = price;
        weeklyWinners[dayKey].mainDish = mainDish;
      }
    });

    // 2. Sync updated restaurant details to monthlyHistory automatically
    Object.keys(monthlyHistory).forEach(dateStr => {
      const rec = monthlyHistory[dateStr];
      if (rec && rec.type !== "holiday" && (rec.restaurantName === oldName || rec.name === oldName)) {
        monthlyHistory[dateStr].restaurantName = name;
        monthlyHistory[dateStr].name = name;
        monthlyHistory[dateStr].category = category;
        monthlyHistory[dateStr].price = price;
        monthlyHistory[dateStr].mainDish = mainDish;
      }
    });

    saveRestaurantList();
    saveWeeklyWinners();
    saveMonthlyHistory();
    renderUI();
    closeEditRestaurantModal();
  }
}

window.openEditRestaurantModal = openEditRestaurantModal;
window.closeEditRestaurantModal = closeEditRestaurantModal;

function renderQuickTags() {
  manualQuickTags.innerHTML = "";
  restaurants.forEach(item => {
    const chip = document.createElement("span");
    chip.className = "quick-tag-chip";
    chip.textContent = item.name;
    chip.addEventListener("click", () => {
      manualRestaurantInput.value = item.name;
    });
    manualQuickTags.appendChild(chip);
  });
}

function closeManualModal() {
  const modal = document.getElementById("manualModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
    modal.style.setProperty("opacity", "0", "important");
    modal.style.setProperty("pointer-events", "none", "important");
  }
  selectedManualDay = null;
}

function closeWinnerModal() {
  const modal = document.getElementById("winnerModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
    modal.style.setProperty("opacity", "0", "important");
    modal.style.setProperty("pointer-events", "none", "important");
  }
}

function openGuideModal() {
  const modal = document.getElementById("guideModal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
    modal.style.setProperty("opacity", "1", "important");
    modal.style.setProperty("pointer-events", "auto", "important");
  }
}

function closeGuideModal() {
  const modal = document.getElementById("guideModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
    modal.style.setProperty("opacity", "0", "important");
    modal.style.setProperty("pointer-events", "none", "important");
  }
}

window.openGuideModal = openGuideModal;
window.closeGuideModal = closeGuideModal;
window.closeManualModal = closeManualModal;
window.closeWinnerModal = closeWinnerModal;

function saveManualEntry() {
  if (!selectedManualDay) return;

  const isHoliday = holidayCheckbox.checked;
  const isWeekDayKey = DAYS.includes(selectedManualDay);
  const { weekDates } = getWeekDates();
  
  let targetIsoDate = isWeekDayKey ? weekDates[selectedManualDay].isoDateStr : selectedManualDay;
  let targetWeekDayKey = isWeekDayKey ? selectedManualDay : null;

  // If selected date matches any day in current week, sync both ways
  if (!targetWeekDayKey) {
    targetWeekDayKey = DAYS.find(d => weekDates[d] && weekDates[d].isoDateStr === selectedManualDay);
  }

  if (isHoliday) {
    const holidayData = { type: "holiday" };
    if (targetWeekDayKey) {
      weeklyWinners[targetWeekDayKey] = holidayData;
      saveWeeklyWinners();
    }
    monthlyHistory[targetIsoDate] = holidayData;
    saveMonthlyHistory();
  } else {
    const inputName = manualRestaurantInput.value.trim();
    if (!inputName) return;

    const matched = restaurants.find(r => r.name === inputName);
    const entryData = {
      type: "manual",
      name: inputName,
      restaurantName: inputName,
      category: matched ? matched.category : "기타",
      price: matched ? matched.price : 0,
      mainDish: matched ? matched.mainDish : ""
    };

    if (targetWeekDayKey) {
      weeklyWinners[targetWeekDayKey] = entryData;
      saveWeeklyWinners();
    }
    monthlyHistory[targetIsoDate] = entryData;
    saveMonthlyHistory();
  }

  renderUI();
  closeManualModal();
}

function clearManualEntry() {
  if (!selectedManualDay) return;

  const isWeekDayKey = DAYS.includes(selectedManualDay);
  const { weekDates } = getWeekDates();
  
  let targetIsoDate = isWeekDayKey ? weekDates[selectedManualDay].isoDateStr : selectedManualDay;
  let targetWeekDayKey = isWeekDayKey ? selectedManualDay : null;

  if (!targetWeekDayKey) {
    targetWeekDayKey = DAYS.find(d => weekDates[d] && weekDates[d].isoDateStr === selectedManualDay);
  }

  if (targetWeekDayKey) {
    weeklyWinners[targetWeekDayKey] = null;
    saveWeeklyWinners();
  }
  delete monthlyHistory[targetIsoDate];
  saveMonthlyHistory();

  renderUI();
  closeManualModal();
}
window.clearManualEntry = clearManualEntry;

// ==========================================================================
// Confetti Animation Engine
// ==========================================================================
let confettiParticles = [];
let confettiAnimationId = null;

function triggerConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const colors = ["#8b5cf6", "#06b6d4", "#f43f5e", "#f59e0b", "#10b981", "#ffffff"];
  confettiParticles = [];

  for (let i = 0; i < 100; i++) {
    confettiParticles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 + 50,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  animateConfetti();
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let activeParticles = 0;

  confettiParticles.forEach(p => {
    if (p.opacity <= 0) return;
    activeParticles++;

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.3;
    p.opacity -= 0.012;
    p.rotation += p.rotationSpeed;

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.globalAlpha = Math.max(p.opacity, 0);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    confettiCtx.restore();
  });

  if (activeParticles > 0) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  } else {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ==========================================================================
// Theme Management Engine (Light / Dark Mode)
// ==========================================================================
const STORAGE_KEY_THEME = "roulette_theme_v1";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");
  if (theme === "dark") {
    if (themeIcon) themeIcon.textContent = "☀️";
    if (themeText) themeText.textContent = "라이트 모드";
  } else {
    if (themeIcon) themeIcon.textContent = "🌙";
    if (themeText) themeText.textContent = "다크 모드";
  }
  localStorage.setItem(STORAGE_KEY_THEME, theme);
  if (typeof drawWheel === "function") drawWheel();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const nextTheme = current === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
}

function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || "light";
  applyTheme(savedTheme);
}

// ==========================================================================
// Event Listeners Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadState();
  initFirebase();
  renderUI();

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  spinBtn.addEventListener("click", spinWheel);

  // Price Filter Toggle Event
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      priceFilter = btn.getAttribute("data-filter");
      drawWheel();
    });
  });

  // Select / Deselect All Restaurant Tags
  const selectAllBtn = document.getElementById("selectAllBtn");
  const deselectAllBtn = document.getElementById("deselectAllBtn");

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => setAllRestaurantsSelection(true));
  }
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener("click", () => setAllRestaurantsSelection(false));
  }

  // Expanded Add Restaurant Form Submit
  addRestaurantForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addRestaurant(
      restaurantInput.value,
      categorySelect.value,
      priceInput.value,
      mainDishInput.value
    );
  });

  resetDefaultBtn.addEventListener("click", resetToDefault);
  resetWeekBtn.addEventListener("click", resetWeek);

  closeModalBtn.addEventListener("click", () => {
    winnerModal.classList.add("hidden");
    winnerModal.style.setProperty("display", "none", "important");
  });

  winnerModal.addEventListener("click", (e) => {
    if (e.target === winnerModal) {
      winnerModal.classList.add("hidden");
      winnerModal.style.setProperty("display", "none", "important");
    }
  });

  // Weekly Grid Day Box Click Event
  document.querySelectorAll(".day-box.clickable").forEach(box => {
    box.addEventListener("click", () => {
      const dayKey = box.getAttribute("data-day");
      openManualModalForDay(dayKey);
    });
  });

  // Holiday Checkbox Change Event
  holidayCheckbox.addEventListener("change", () => {
    if (holidayCheckbox.checked) {
      manualInputFields.style.display = "none";
    } else {
      manualInputFields.style.display = "block";
    }
  });

  manualEntryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveManualEntry();
  });

  clearManualBtn.addEventListener("click", clearManualEntry);
  closeManualModalBtn.addEventListener("click", closeManualModal);

  manualModal.addEventListener("click", (e) => {
    if (e.target === manualModal) closeManualModal();
  });

  const editRestaurantForm = document.getElementById("editRestaurantForm");
  if (editRestaurantForm) {
    editRestaurantForm.addEventListener("submit", saveEditRestaurant);
  }

  const editRestaurantModal = document.getElementById("editRestaurantModal");
  if (editRestaurantModal) {
    editRestaurantModal.addEventListener("click", (e) => {
      if (e.target === editRestaurantModal) closeEditRestaurantModal();
    });
  }

  // Calendar Controls
  prevMonthBtn.addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  todayMonthBtn.addEventListener("click", () => {
    currentCalendarDate = new Date();
    renderCalendar();
  });

  window.addEventListener("resize", () => {
    drawWheel();
  });

  // DB Settings Modal Handlers
  const dbModal = document.getElementById("dbModal");
  const openDbSettingsBtn = document.getElementById("openDbSettingsBtn");
  const dbStatusBadge = document.getElementById("dbStatusBadge");
  const closeDbModalBtn = document.getElementById("closeDbModalBtn");
  const dbConfigForm = document.getElementById("dbConfigForm");
  const dbConfigInput = document.getElementById("dbConfigInput");
  const disconnectDbBtn = document.getElementById("disconnectDbBtn");

  if (openDbSettingsBtn) {
    openDbSettingsBtn.addEventListener("click", openDbModal);
  }

  if (dbStatusBadge) {
    dbStatusBadge.addEventListener("click", openDbModal);
  }

  if (closeDbModalBtn) {
    closeDbModalBtn.addEventListener("click", hideDbModal);
  }

  if (dbModal) {
    dbModal.addEventListener("click", (e) => {
      if (e.target === dbModal) hideDbModal();
    });
  }

  if (dbConfigForm) {
    dbConfigForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = dbConfigInput.value.trim();
      if (!val) return;

      localStorage.setItem(STORAGE_KEY_FIREBASE_CFG, val);
      hideDbModal();

      initFirebase();
      setTimeout(() => {
        syncToFirebase();
      }, 500);
    });
  }

  if (disconnectDbBtn) {
    disconnectDbBtn.addEventListener("click", () => {
      if (confirm("실시간 DB 연동을 해제하고 로컬 모드로 전환하시겠습니까?")) {
        localStorage.removeItem(STORAGE_KEY_FIREBASE_CFG);
        isDbOnline = false;
        if (typeof eventSourceInstance !== "undefined" && eventSourceInstance) {
          eventSourceInstance.close();
          eventSourceInstance = null;
        }

        const dbStatusBadge = document.getElementById("dbStatusBadge");
        const dbStatusText = document.getElementById("dbStatusText");
        if (dbStatusBadge) {
          dbStatusBadge.className = "db-status-badge offline";
          dbStatusText.textContent = "로컬 모드";
        }
        hideDbModal();
      }
    });
  }

  const guideModal = document.getElementById("guideModal");
  if (guideModal) {
    guideModal.addEventListener("click", (e) => {
      if (e.target === guideModal) closeGuideModal();
    });
  }

  // Global keydown for Escape key closing modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeGuideModal();
      closeManualModal();
      closeWinnerModal();
      closeEditRestaurantModal();
      hideDbModal();
    }
  });
});

