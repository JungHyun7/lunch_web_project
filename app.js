// ==========================================================================
// Default Constants & Initial Data
// ==========================================================================
const DEFAULT_RESTAURANTS = [];

const SECTOR_COLORS = [
  "#4a3328", "#c26d47", "#8c5d3b", "#b45309", "#6b4423",
  "#d97706", "#a16207", "#5c3d2e", "#9a3412", "#78350f"
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
function loadState() {
  // 1. Load Restaurant List
  const savedList = localStorage.getItem(STORAGE_KEY_LIST);
  if (savedList) {
    try {
      restaurants = JSON.parse(savedList);
    } catch (e) {
      restaurants = [...DEFAULT_RESTAURANTS];
    }
  } else {
    restaurants = [...DEFAULT_RESTAURANTS];
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

function saveRestaurantList() {
  localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(restaurants));
}

function saveWeeklyWinners() {
  localStorage.setItem(STORAGE_KEY_WINNERS, JSON.stringify(weeklyWinners));
}

function saveMonthlyHistory() {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(monthlyHistory));
}

// ==========================================================================
// Advanced Candidate Filtering Logic
// ==========================================================================
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

  // 3. Main Dish Uniqueness Condition (대표메뉴 동일 주간 중복 방지)
  const usedMainDishes = Object.values(weeklyWinners)
    .filter(val => val && val.type !== "holiday" && val.mainDish && val.mainDish.trim() !== "" && val.mainDish !== "없음")
    .map(val => val.mainDish.trim());

  candidates = candidates.filter(item => {
    if (!item.mainDish || item.mainDish.trim() === "" || item.mainDish === "없음") return true;
    return !usedMainDishes.includes(item.mainDish.trim());
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
function renderUI() {
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
      valEl.textContent = "🏖️ 휴무일";
      if (subEl) subEl.textContent = "공휴일/쉬는날";
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
      <button class="tag-remove" title="식당 삭제" data-id="${item.id || item.name}">&times;</button>
    `;

    // Click on tag to toggle selection
    tag.addEventListener("click", (e) => {
      if (e.target.classList.contains("tag-remove")) return;
      toggleRestaurantSelection(item.id || item.name);
    });

    const checkbox = tag.querySelector(".tag-checkbox");
    checkbox.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleRestaurantSelection(item.id || item.name);
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

    const record = monthlyHistory[dateStr];
    let contentHtml = "";

    if (record) {
      if (record.type === "holiday") {
        contentHtml = `<div class="cal-holiday-tag">🏖️ 휴무일</div>`;
      } else {
        const catClass = `cat-${record.category || '기타'}`;
        contentHtml = `
          <div class="cal-entry-box">
            <span class="cat-badge ${catClass}">${record.category || '기타'}</span>
            <div class="cal-restaurant-name">${record.restaurantName}</div>
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
  const candidates = getAvailableCandidates();
  const count = candidates.length;
  candidatesCountBadge.textContent = `남은 후보: ${count}곳`;

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
    ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Sector Text & Category Badge
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px 'Noto Sans KR', sans-serif";
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

function triggerPointerTick(isBoost = false) {
  const wheelPointer = document.querySelector(".wheel-pointer");
  if (!wheelPointer) return;
  wheelPointer.classList.remove("tick-wobble", "boost-wobble");
  void wheelPointer.offsetWidth;
  wheelPointer.classList.add(isBoost ? "boost-wobble" : "tick-wobble");
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

  const extraRounds = Math.PI * 2 * (6 + Math.floor(Math.random() * 4));

  if (isSpinning) {
    comboCount++;
    currentTargetAngle = currentAngle + deltaAngle + extraRounds + (Math.PI * 2 * comboCount * 2);
    triggerPointerTick(true);
    updateSpinBtnText(`🔥 연타 콤보 x${comboCount}! (새 식당 추첨!)`);
    return;
  }

  isSpinning = true;
  comboCount = 1;
  if (wheelWrapper) wheelWrapper.classList.add("is-spinning-active");
  updateSpinBtnText("🔥 룰렛 돌리기! (연타 가능!)");

  currentTargetAngle = currentAngle + deltaAngle + extraRounds;
  let lastSectorIndex = -1;

  function animate() {
    const distanceRemaining = currentTargetAngle - currentAngle;

    if (distanceRemaining > 0.003) {
      const speed = Math.max(distanceRemaining * 0.045, 0.0015);
      currentAngle += speed;

      const normalizedAngle = ((currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const currentSectorUnderPointer = Math.floor(
        ((3 * Math.PI / 2 - normalizedAngle + Math.PI * 2 * 10) % (Math.PI * 2)) / sliceAngle
      );

      if (currentSectorUnderPointer !== lastSectorIndex) {
        lastSectorIndex = currentSectorUnderPointer;
        triggerPointerTick();
      }

      drawWheel();
      animationFrameId = requestAnimationFrame(animate);
    } else {
      currentAngle = currentTargetAngle;
      drawWheel();

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
  if (confirm("이번 주 당첨 기록을 초기화하시겠습니까? (월간 달력 기록은 유지됩니다)")) {
    weeklyWinners = { Mon: null, Tue: null, Wed: null, Thu: null, Fri: null };
    saveWeeklyWinners();
    renderUI();
  }
}

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
}

function openManualModalForDate(dateStr) {
  selectedManualDay = dateStr; // ISO date string "YYYY-MM-DD"
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
}

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
  manualModal.classList.add("hidden");
  selectedManualDay = null;
}

function saveManualEntry() {
  if (!selectedManualDay) return;

  const isHoliday = holidayCheckbox.checked;
  const isWeekDayKey = DAYS.includes(selectedManualDay);
  const { weekDates } = getWeekDates();
  
  const targetIsoDate = isWeekDayKey ? weekDates[selectedManualDay].isoDateStr : selectedManualDay;

  if (isHoliday) {
    if (isWeekDayKey) {
      weeklyWinners[selectedManualDay] = { type: "holiday" };
      saveWeeklyWinners();
    }
    monthlyHistory[targetIsoDate] = { type: "holiday" };
    saveMonthlyHistory();
  } else {
    const inputName = manualRestaurantInput.value.trim();
    if (!inputName) return;

    // Find matched restaurant details if exists
    const matched = restaurants.find(r => r.name === inputName);
    const entryData = {
      type: "manual",
      name: inputName,
      restaurantName: inputName,
      category: matched ? matched.category : "기타",
      price: matched ? matched.price : 0,
      mainDish: matched ? matched.mainDish : ""
    };

    if (isWeekDayKey) {
      weeklyWinners[selectedManualDay] = entryData;
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
  const targetIsoDate = isWeekDayKey ? weekDates[selectedManualDay].isoDateStr : selectedManualDay;

  if (isWeekDayKey) {
    weeklyWinners[selectedManualDay] = null;
    saveWeeklyWinners();
  }
  delete monthlyHistory[targetIsoDate];
  saveMonthlyHistory();

  renderUI();
  closeManualModal();
}

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
// Event Listeners Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  renderUI();

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
  });

  winnerModal.addEventListener("click", (e) => {
    if (e.target === winnerModal) winnerModal.classList.add("hidden");
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
});
