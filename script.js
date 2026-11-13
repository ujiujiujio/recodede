const calendar = document.getElementById("calendar");
{
    const loadingScreen = document.getElementById("loadingScreen");

    if (loadingScreen) {
        loadingScreen.hidden = false;
        const startedAt = performance.now();

        const hideLoadingScreen = () => {
            loadingScreen.hidden = true;
        };

        const finishLoading = () => {
            const remaining = Math.max(0, 700 - (performance.now() - startedAt));
            setTimeout(hideLoadingScreen, remaining);
        };

        if (document.readyState === "complete") {
            finishLoading();
        } else {
            window.addEventListener("load", finishLoading, { once: true });
        }

        setTimeout(hideLoadingScreen, 2500);
    }
}
const memo = document.getElementById("memo");
const message = document.getElementById("message");
const popup = document.getElementById("savePopup");
const historyTrack = document.getElementById("historyTrack");
const charCount = document.getElementById("charCount");
const clock = document.getElementById("clock");
const weather = document.getElementById("weather");
const calendarMonth = document.getElementById("calendarMonth");
const storageKey = "emotionHistory";
const initialDate = new Date();

let visibleMonth = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
let selectedDate = null;
let selectedEmotion = null;
let popupTimer;
let records = [];

try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) records = saved;
} catch {
    message.textContent = "保存済みの記録を読み込めませんでした。";
}

function dateKey(year, month, day) {
    return [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

function formatDate(key) {
    const [year, month, day] = key.split("-").map(Number);
    return `${year}年${month}月${day}日`;
}

function makeElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

function renderCalendar() {
    calendar.replaceChildren();
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const now = new Date();
    const today = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    calendarMonth.textContent = `${year}年 ${month + 1}月`;

    for (const weekday of ["日", "月", "火", "水", "木", "金", "土"]) {
        calendar.append(makeElement("div", "calendar-weekday", weekday));
    }

    for (let i = 0; i < visibleMonth.getDay(); i++) {
        const blank = document.createElement("div");
        blank.setAttribute("aria-hidden", "true");
        calendar.append(blank);
    }

    const recordsByDate = new Map(records.map(record => [record.date, record]));
    for (let day = 1; day <= daysInMonth; day++) {
        const key = dateKey(year, month, day);
        const cell = makeElement("button", "day");
        cell.type = "button";
        cell.setAttribute("aria-label", formatDate(key));
        cell.setAttribute("aria-pressed", String(key === selectedDate));
        cell.classList.toggle("today", key === today);
        cell.classList.toggle("selected", key === selectedDate);
        if (key === today) cell.setAttribute("aria-current", "date");
        cell.append(makeElement("span", "day-number", day));
        const record = key === selectedDate ? selectedEmotion : recordsByDate.get(key);
        if (record?.image) {
            const icon = makeElement("img", "day-icon");
            icon.src = record.image;
            icon.alt = record.emotion || "感情";
            cell.append(icon);
        }
        cell.addEventListener("click", () => {
            if (selectedDate !== key) {
                selectDate(key);
                calendar.querySelector(".selected").focus();
            }
        });
        calendar.append(cell);
    }
}

function selectDate(key) {
    selectedDate = key;
    selectedEmotion = records.find(record => record.date === key) || null;
    memo.value = selectedEmotion?.memo || "";
    updateCharCount();
    message.textContent = key ? `${formatDate(key)}の記録` : "日にちを選んで感情を記録してください。";
    renderCalendar();
}

function changeMonth(offset) {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    selectDate(null);
}

document.getElementById("previousMonth").addEventListener("click", () => changeMonth(-1));
document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
document.getElementById("currentMonth").addEventListener("click", () => {
    const now = new Date();
    visibleMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    selectDate(null);
});

function updateCharCount() {
    charCount.textContent = `${memo.value.length} / 50`;
}

memo.addEventListener("input", updateCharCount);

for (const icon of document.querySelectorAll(".emotion-list img")) {
    icon.addEventListener("click", () => {
        if (!selectedDate) {
            message.textContent = "先に日にちを選択してください。";
            return;
        }
        selectedEmotion = { image: icon.getAttribute("src"), emotion: icon.alt };
        renderCalendar();
        calendar.querySelector(".selected img").classList.add("pop");
        message.textContent = "感情を選択しました！";
    });
}

function saveRecords(nextRecords) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(nextRecords));
        records = nextRecords;
        return true;
    } catch {
        message.textContent = "記録を保存できませんでした。";
        return false;
    }
}

document.getElementById("saveButton").addEventListener("click", () => {
    if (!selectedDate || !selectedEmotion?.image) {
        message.textContent = selectedDate ? "感情を選択してください。" : "日にちを選択してください。";
        return;
    }
    const record = {
        date: selectedDate,
        image: selectedEmotion.image,
        emotion: selectedEmotion.emotion,
        memo: memo.value
    };
    if (!saveRecords([record, ...records.filter(item => item.date !== selectedDate)])) return;
    selectedEmotion = record;
    renderHistory();
    popup.style.display = "block";
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => { popup.style.display = "none"; }, 1800);
    message.textContent = "保存しました！";
});

function renderHistory() {
    historyTrack.replaceChildren();
    if (!records.length) {
        historyTrack.append(makeElement("div", "history-card", "まだ記録がありません"));
        return;
    }

    for (const record of records) {
        const card = makeElement("div", "history-card");
        const dateLabel = record.date ? formatDate(record.date) : `年月不明・${record.day}日`;
        if (record.image) {
            const icon = document.createElement("img");
            icon.src = record.image;
            icon.alt = record.emotion || "感情";
            card.append(icon);
        }
        const remove = makeElement("button", "delete-btn", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", `${dateLabel}の記録を削除`);
        remove.addEventListener("click", () => {
            if (!saveRecords(records.filter(item => item !== record))) return;
            if (record.date === selectedDate) selectDate(null);
            else renderCalendar();
            renderHistory();
        });
        card.append(
            makeElement("div", "history-date", dateLabel),
            makeElement("div", "history-comment", record.memo || "コメントなし"),
            remove
        );
        historyTrack.append(card);
    }
    const spacer = makeElement("div", "history-space");
    spacer.setAttribute("aria-hidden", "true");
    historyTrack.append(spacer);
}

const clockFormat = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});

function updateClock() {
    const now = new Date();
    clock.textContent = clockFormat.format(now);
    clock.dateTime = clock.textContent;
}

function weatherLabel(code) {
    if (code === 0) return "快晴";
    if (code === 1) return "晴れ";
    if (code === 2 || code === 3) return "曇り";
    if (code === 45 || code === 48) return "霧";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "雪";
    if ([95, 96, 99].includes(code)) return "雷雨";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "雨";
    return "天気不明";
}

async function updateWeather() {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=35.4437&longitude=139.6380&current=temperature_2m,weather_code";
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error("Weather request failed");
        const { current } = await response.json();
        if (!Number.isFinite(current?.temperature_2m)) throw new Error("Temperature missing");
        weather.textContent = `福岡 ${weatherLabel(current.weather_code)} ${Math.round(current.temperature_2m)}℃`;
    } catch {
        weather.textContent = "福岡の天気を取得できません";
    }
}

renderCalendar();
renderHistory();
updateClock();
setInterval(updateClock, 1000);
updateWeather();
setInterval(updateWeather, 15 * 60 * 1000);
