// Supabase配置
const SUPABASE_URL = 'https://ncywmtlhjhzgvvjjshwo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeXdtdGxoamh6Z3Z2ampzaHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2MDc5NDIsImV4cCI6MjA1ODE4Mzk0Mn0.RaBRSXov-5lY8i61mxBWRbl2yYgvTt4jwUgeQ0-Ec0g';

// 创建Supabase客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 弹幕功能
const danmakuContainer = document.getElementById('danmakuContainer');
const danmakuColors = ['#fff', '#ff69b4', '#7fffd4', '#ffd700', '#90ee90', '#87cefa'];
let lastDanmakuTime = 0;
let danmakuQueue = []; // 存储所有弹幕
let lastFetchTime = 0;
const FETCH_INTERVAL = 5000; // 每5秒从服务器获取新弹幕

// 从Supabase获取弹幕
async function fetchDanmaku() {
    try {
        const { data, error } = await supabase
            .from('danmaku')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        // 更新弹幕队列，保留现有的弹幕
        const newDanmaku = data.filter(d => !danmakuQueue.some(existing => existing.id === d.id));
        danmakuQueue.push(...newDanmaku);
        
        // 如果队列太长，删除旧的弹幕
        if (danmakuQueue.length > 200) {
            danmakuQueue = danmakuQueue.slice(-200);
        }
    } catch (error) {
        console.error('获取弹幕失败:', error);
    }
}

// 订阅实时弹幕更新
const danmakuSubscription = supabase
    .channel('danmaku_channel')
    .on('postgres_changes', 
        {
            event: 'INSERT',
            schema: 'public',
            table: 'danmaku'
        },
        (payload) => {
            const newDanmaku = payload.new;
            if (!danmakuQueue.some(d => d.id === newDanmaku.id)) {
                danmakuQueue.push(newDanmaku);
                createDanmaku(newDanmaku.text, newDanmaku.color);
            }
        }
    )
    .subscribe();

// 发送弹幕到Supabase
async function saveDanmaku(text, color) {
    try {
        const { data, error } = await supabase
            .from('danmaku')
            .insert([
                {
                    text,
                    color,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('发送弹幕失败:', error);
    }
}

function createDanmaku(text, color, isSystem = false) {
    const now = Date.now();
    if (!isSystem && now - lastDanmakuTime < 1000) {
        return; // 限制发送频率
    }
    lastDanmakuTime = now;

    const danmaku = document.createElement('div');
    danmaku.className = 'danmaku';
    danmaku.textContent = text;
    danmaku.style.color = color;
    
    // 随机垂直位置，但确保不会重叠
    const height = 30; // 弹幕高度
    const maxTop = danmakuContainer.offsetHeight - height;
    const availablePositions = Array.from({ length: Math.floor(maxTop / height) }, (_, i) => i * height);
    const usedPositions = Array.from(danmakuContainer.getElementsByClassName('danmaku')).map(d => parseInt(d.style.top));
    const availableSlots = availablePositions.filter(pos => !usedPositions.includes(pos));
    
    let top;
    if (availableSlots.length > 0) {
        top = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    } else {
        // 如果所有位置都被占用，随机选择一个位置
        top = Math.floor(Math.random() * maxTop);
    }
    danmaku.style.top = `${top}px`;
    
    // 根据文本长度调整动画时间
    const duration = Math.max(15, 10 + text.length * 0.5); // 最少15秒
    danmaku.style.animationDuration = `${duration}s`;
    
    danmakuContainer.appendChild(danmaku);
    
    // 动画结束后移除弹幕
    danmaku.addEventListener('animationend', () => {
        danmaku.remove();
    });
}

// 轮播弹幕队列
function playDanmakuQueue() {
    if (danmakuQueue.length === 0) return;
    
    // 随机选择一条弹幕播放
    const index = Math.floor(Math.random() * danmakuQueue.length);
    const danmaku = danmakuQueue[index];
    createDanmaku(danmaku.text, danmaku.color);
}

async function sendDanmaku() {
    const input = document.getElementById('danmakuText');
    const text = input.value.trim();
    
    if (text) {
        const color = danmakuColors[Math.floor(Math.random() * danmakuColors.length)];
        createDanmaku(text, color);
        await saveDanmaku(text, color);
        input.value = '';
    }
}

// 添加回车发送功能
document.getElementById('danmakuText').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendDanmaku();
    }
});

// 系统弹幕
async function sendSystemDanmaku() {
    const messages = [
        '马上就要下班啦！',
        '努力工作，开心生活！',
        '记得喝水哦～',
        '工资快到账啦！',
        '周末加油！'
    ];
    
    // 随机选择一条消息
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const color = danmakuColors[Math.floor(Math.random() * danmakuColors.length)];
    createDanmaku(randomMessage, color, true);
    await saveDanmaku(randomMessage, color);
}

// 初始化时获取弹幕
fetchDanmaku();

// 定期获取新弹幕（作为备份，以防实时订阅失败）
setInterval(async () => {
    const now = Date.now();
    if (now - lastFetchTime >= FETCH_INTERVAL) {
        await fetchDanmaku();
        lastFetchTime = now;
    }
}, FETCH_INTERVAL);

// 定期播放弹幕队列
setInterval(() => {
    playDanmakuQueue();
}, 2000); // 每2秒播放一条弹幕

// 每隔30-60秒随机发送一条系统弹幕
setInterval(() => {
    if (Math.random() < 0.3) { // 30%的概率发送
        sendSystemDanmaku();
    }
}, 30000);

const CURRENCY_CONFIG = {
    USD: {
        locale: 'en-US',
        symbol: '$',
        timezone: 'America/New_York',
        language: 'en',
        holidays: [
            { name: 'New Year', date: new Date(2025, 0, 1) },
            { name: 'Martin Luther King Jr. Day', date: new Date(2025, 0, 20) },
            { name: 'Presidents Day', date: new Date(2025, 1, 17) },
            { name: 'Memorial Day', date: new Date(2025, 4, 26) },
            { name: 'Independence Day', date: new Date(2025, 6, 4) },
            { name: 'Labor Day', date: new Date(2025, 8, 1) },
            { name: 'Thanksgiving', date: new Date(2025, 10, 27) },
            { name: 'Christmas', date: new Date(2025, 11, 25) }
        ],
        labels: {
            title: 'Work Time Countdown',
            workingDays: 'Working Days',
            workHours: 'Work Hours',
            startTime: 'Start Time',
            endTime: 'End Time',
            payday: 'Payday',
            dailyIncome: 'Daily Income',
            currency: 'Currency',
            amount: 'Amount',
            startCounting: 'Start Counting',
            editSettings: 'Edit Settings',
            timeUntilFreedom: 'Time Until Freedom',
            nextPayday: 'Next Payday',
            nextHoliday: 'Next Holiday',
            workdaysLeft: 'Workdays Left',
            earnedToday: 'Earned Today',
            footer: 'Keep grinding... or maybe it\'s time to quiet quit? ',
            weekend: 'Weekend! ',
            beforeWork: 'Not Started Yet ',
            afterWork: 'Done for Today! ',
            noHoliday: 'No Upcoming Holiday',
            danmakuPlaceholder: 'Send a comment...',
            sendDanmaku: 'Send'
        }
    },
    CNY: {
        locale: 'zh-CN',
        symbol: '¥',
        timezone: 'Asia/Shanghai',
        language: 'zh',
        holidays: [
            { name: '春节', date: new Date(2025, 0, 29) },
            { name: '元宵节', date: new Date(2025, 1, 12) },
            { name: '清明节', date: new Date(2025, 3, 5) },
            { name: '劳动节', date: new Date(2025, 4, 1) },
            { name: '端午节', date: new Date(2025, 5, 31) },
            { name: '中秋节', date: new Date(2025, 8, 29) },
            { name: '国庆节', date: new Date(2025, 9, 1) },
            { name: '元旦', date: new Date(2025, 11, 31) }
        ],
        labels: {
            title: '下班倒计时',
            workingDays: '工作日',
            workHours: '工作时间',
            startTime: '上班时间',
            endTime: '下班时间',
            payday: '发薪日',
            dailyIncome: '日收入',
            currency: '货币',
            amount: '金额',
            startCounting: '开始计时',
            editSettings: '修改设置',
            timeUntilFreedom: '距离下班',
            nextPayday: '下次发薪',
            nextHoliday: '下个节日',
            workdaysLeft: '剩余工作日',
            earnedToday: '今日收入',
            footer: '继续加油... 或者该摆烂了？',
            weekend: '周末愉快！',
            beforeWork: '还没开始上班 ',
            afterWork: '下班啦！',
            noHoliday: '无节假日',
            danmakuPlaceholder: '发送弹幕...',
            sendDanmaku: '发送'
        }
    },
    EUR: {
        locale: 'de-DE',
        symbol: '',
        timezone: 'Europe/Paris',
        language: 'de',
        holidays: [
            { name: 'Neujahr', date: new Date(2025, 0, 1) },
            { name: 'Ostermontag', date: new Date(2025, 3, 21) },
            { name: 'Tag der Arbeit', date: new Date(2025, 4, 1) },
            { name: 'Europatag', date: new Date(2025, 4, 9) },
            { name: 'Weihnachten', date: new Date(2025, 11, 25) },
            { name: 'Stefanitag', date: new Date(2025, 11, 26) }
        ],
        labels: {
            title: 'Arbeitszeit-Countdown',
            workingDays: 'Arbeitstage',
            workHours: 'Arbeitszeit',
            startTime: 'Startzeit',
            endTime: 'Endzeit',
            payday: 'Zahltag',
            dailyIncome: 'Tageseinkommen',
            currency: 'Währung',
            amount: 'Betrag',
            startCounting: 'Start',
            editSettings: 'Einstellungen',
            timeUntilFreedom: 'Zeit bis Feierabend',
            nextPayday: 'Nächster Zahltag',
            nextHoliday: 'Nächster Feiertag',
            workdaysLeft: 'Verbleibende Arbeitstage',
            earnedToday: 'Heute verdient',
            footer: 'Weitermachen... oder Zeit zum Aufgeben? ',
            weekend: 'Wochenende! ',
            beforeWork: 'Noch nicht begonnen ',
            afterWork: 'Feierabend! ',
            noHoliday: 'Keine Feiertage',
            danmakuPlaceholder: 'Kommentar senden...',
            sendDanmaku: 'Senden'
        }
    },
    GBP: {
        locale: 'en-GB',
        symbol: '',
        timezone: 'Europe/London',
        language: 'en',
        holidays: [
            { name: 'New Year', date: new Date(2025, 0, 1) },
            { name: 'Good Friday', date: new Date(2025, 3, 18) },
            { name: 'Easter Monday', date: new Date(2025, 3, 21) },
            { name: 'Early May Bank Holiday', date: new Date(2025, 4, 5) },
            { name: 'Spring Bank Holiday', date: new Date(2025, 4, 26) },
            { name: 'Summer Bank Holiday', date: new Date(2025, 7, 25) },
            { name: 'Christmas', date: new Date(2025, 11, 25) },
            { name: 'Boxing Day', date: new Date(2025, 11, 26) }
        ],
        labels: {
            title: 'Work Time Countdown',
            workingDays: 'Working Days',
            workHours: 'Work Hours',
            startTime: 'Start Time',
            endTime: 'End Time',
            payday: 'Payday',
            dailyIncome: 'Daily Income',
            currency: 'Currency',
            amount: 'Amount',
            startCounting: 'Start Counting',
            editSettings: 'Edit Settings',
            timeUntilFreedom: 'Time Until Freedom',
            nextPayday: 'Next Payday',
            nextHoliday: 'Next Holiday',
            workdaysLeft: 'Workdays Left',
            earnedToday: 'Earned Today',
            footer: 'Keep grinding... or maybe it\'s time to quiet quit? ',
            weekend: 'Weekend! ',
            beforeWork: 'Not Started Yet ',
            afterWork: 'Done for Today! ',
            noHoliday: 'No Upcoming Holiday',
            danmakuPlaceholder: 'Send a comment...',
            sendDanmaku: 'Send'
        }
    },
    JPY: {
        locale: 'ja-JP',
        symbol: '¥',
        timezone: 'Asia/Tokyo',
        language: 'ja',
        holidays: [
            { name: '元日', date: new Date(2025, 0, 1) },
            { name: '成人の日', date: new Date(2025, 0, 13) },
            { name: '建国記念の日', date: new Date(2025, 1, 11) },
            { name: '天皇誕生日', date: new Date(2025, 1, 23) },
            { name: '昭和の日', date: new Date(2025, 3, 29) },
            { name: 'ゴールデンウィーク', date: new Date(2025, 4, 3) },
            { name: 'お盆', date: new Date(2025, 7, 15) },
            { name: '敬老の日', date: new Date(2025, 8, 15) }
        ],
        labels: {
            title: '勤務時間カウントダウン',
            workingDays: '勤務日',
            workHours: '勤務時間',
            startTime: '始業時間',
            endTime: '終業時間',
            payday: '給料日',
            dailyIncome: '日給',
            currency: '通貨',
            amount: '金額',
            startCounting: 'スタート',
            editSettings: '設定',
            timeUntilFreedom: '退勤までの時間',
            nextPayday: '次の給料日',
            nextHoliday: '次の祝日',
            workdaysLeft: '残りの勤務日',
            earnedToday: '本日の収入',
            footer: '頑張って働きましょう',
            weekend: '週末です！',
            beforeWork: 'まだ始まっていません ',
            afterWork: '仕事終わり！',
            noHoliday: '祝日なし',
            danmakuPlaceholder: 'コメントを入力...',
            sendDanmaku: '送信'
        }
    }
};

// Default settings
let settings = {
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
    payday: 10,
    dailyIncome: 100,
    currency: 'USD'
};

// Animation variables
let lastUpdateTime = Date.now();
let lastMoneyRain = Date.now();
let moneyRainInterval = 2000;
let baseTime = new Date("2025-03-21T21:16:41+08:00");
let startTimestamp = Date.now();
let currentEarnings = 0;
let lastEarningUpdate = Date.now();

// Get current time in the selected timezone
function getCurrentTime() {
    const now = new Date(baseTime.getTime() + (Date.now() - startTimestamp));
    const timezone = CURRENCY_CONFIG[settings.currency].timezone;
    return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
}

// Format number with 3 decimal places
function formatNumber(amount) {
    // 移除小数点后多余的0
    return amount.toFixed(2).replace(/\.?0+$/, '');
}

// Format currency with 3 decimal places
function formatCurrency(amount) {
    const config = CURRENCY_CONFIG[settings.currency];
    return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: settings.currency,
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    }).format(amount);
}

// Format time component with leading zeros
function formatTimeComponent(component) {
    return component.toString().padStart(2, '0');
}

// Format time as HH:MM:SS
function formatTime(hours, minutes, seconds) {
    return `${formatTimeComponent(hours)}:${formatTimeComponent(minutes)}:${formatTimeComponent(seconds)}`;
}

// Check if current time is within working hours
function isWorkingHours(time) {
    const dayOfWeek = time.getDay();
    if (!settings.workingDays.includes(dayOfWeek)) {
        return false;
    }

    const currentHour = time.getHours();
    const currentMinute = time.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = settings.startTime.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = settings.endTime.split(':').map(Number);
    const endTimeMinutes = endHour * 60 + endMinute;

    return currentTime >= startTimeMinutes && currentTime < endTimeMinutes;
}

// Update interface language
function updateInterfaceLanguage() {
    const config = CURRENCY_CONFIG[settings.currency];
    const labels = config.labels;
    
    // Update setup page
    document.getElementById('setupTitle').textContent = labels.title;
    document.getElementById('workingDaysLabel').textContent = labels.workingDays;
    document.getElementById('workHoursLabel').textContent = labels.workHours;
    document.getElementById('startTimeLabel').textContent = labels.startTime;
    document.getElementById('endTimeLabel').textContent = labels.endTime;
    document.getElementById('paydayLabel').textContent = labels.payday;
    document.getElementById('dailyIncomeLabel').textContent = labels.dailyIncome;
    document.getElementById('currencyLabel').textContent = labels.currency;
    document.getElementById('amountLabel').textContent = labels.amount;
    document.getElementById('saveSettings').textContent = labels.startCounting;
    
    // Update dashboard
    document.getElementById('timeUntilFreedomLabel').textContent = labels.timeUntilFreedom;
    document.getElementById('nextPaydayLabel').textContent = labels.nextPayday;
    document.getElementById('nextHolidayLabel').textContent = labels.nextHoliday;
    document.getElementById('workdaysLeftLabel').textContent = labels.workdaysLeft;
    document.getElementById('earnedTodayLabel').textContent = labels.earnedToday;
    document.getElementById('editSettings').textContent = labels.editSettings;
    document.getElementById('footerMessage').textContent = labels.footer;
    
    // Update danmaku elements
    document.getElementById('danmakuText').placeholder = labels.danmakuPlaceholder;
    document.getElementById('sendDanmakuBtn').textContent = labels.sendDanmaku;
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('workSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        showDashboard();
    }
}

// Apply settings to form
function applySettings() {
    document.querySelectorAll('.day-btn').forEach(btn => {
        const day = parseInt(btn.dataset.day);
        if (settings.workingDays.includes(day)) {
            btn.classList.add('selected', 'bg-blue-500', 'text-white');
        } else {
            btn.classList.remove('selected', 'bg-blue-500', 'text-white');
        }
    });

    document.getElementById('startTime').value = settings.startTime;
    document.getElementById('endTime').value = settings.endTime;
    document.getElementById('payday').value = settings.payday;
    document.getElementById('dailyIncome').value = settings.dailyIncome;
    document.getElementById('currency').value = settings.currency;
}

// Save settings to localStorage
function saveSettings() {
    settings.workingDays = Array.from(document.querySelectorAll('.day-btn.selected'))
        .map(btn => parseInt(btn.dataset.day));
    settings.startTime = document.getElementById('startTime').value;
    settings.endTime = document.getElementById('endTime').value;
    settings.payday = parseInt(document.getElementById('payday').value);
    settings.dailyIncome = parseFloat(document.getElementById('dailyIncome').value);
    settings.currency = document.getElementById('currency').value;

    localStorage.setItem('workSettings', JSON.stringify(settings));
    showDashboard();
}

let dashboardInterval = null;

// Show dashboard and hide setup
function showDashboard() {
    document.getElementById('setup').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Reset time tracking when showing dashboard
    baseTime = new Date("2025-03-21T21:16:41+08:00");
    startTimestamp = Date.now();
    currentEarnings = 0;
    lastEarningUpdate = Date.now();
    
    // Update interface language
    updateInterfaceLanguage();
    
    // Initialize display values
    updateDisplays();
    
    // Clear existing interval if any
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
    }
    
    // Start real-time updates
    requestAnimationFrame(updateDisplays);
}

// Show setup and hide dashboard
function showSetup() {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('setup').classList.remove('hidden');
    
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
        dashboardInterval = null;
    }
    
    // Update interface language
    updateInterfaceLanguage();
    
    applySettings();
}

// Create money rain element
function createMoneyRain() {
    const moneyRain = document.createElement('div');
    moneyRain.className = 'money-rain';
    moneyRain.textContent = CURRENCY_CONFIG[settings.currency].symbol;
    document.querySelector('.earnings-display').parentElement.appendChild(moneyRain);
    
    setTimeout(() => {
        moneyRain.remove();
    }, 2000);
}

// Update all displays
function updateDisplays(timestamp) {
    const now = getCurrentTime();
    const currentTime = Date.now();
    const config = CURRENCY_CONFIG[settings.currency];
    
    // Check if it's working hours
    const isWorking = isWorkingHours(now);
    const dayOfWeek = now.getDay();
    const isWorkingDay = settings.workingDays.includes(dayOfWeek);
    
    // Calculate earnings
    const { earned, isFullDay } = calculateTodayEarnings();
    
    // Update earnings based on time and day
    if (isWorkingDay) {
        if (isWorking) {
            // During work hours - show real-time earnings
            if (earned > currentEarnings) {
                const step = (earned - currentEarnings) * (10 / 1000);
                currentEarnings += Math.min(step, earned - currentEarnings);
            }
        } else {
            // After work hours - show full day's earnings if earned, otherwise 0
            currentEarnings = isFullDay ? settings.dailyIncome : 0;
        }
    } else {
        // Non-working day - show 0
        currentEarnings = 0;
    }
    
    // Update earnings display without currency symbol
    document.getElementById('todayEarnings').innerHTML = `
        <span class="golden-text">${formatNumber(currentEarnings)}</span>`;
    
    // Update countdown display with localized messages
    const timeUntilEnd = getTimeUntilEndOfWork();
    document.getElementById('timeUntilEndOfWork').textContent = timeUntilEnd.text;
    
    // Update other displays
    const workdaysLeft = getWorkdaysUntilWeekend();
    document.getElementById('workdaysLeft').textContent = workdaysLeft;
    
    document.getElementById('daysUntilPayday').textContent = getDaysUntilPayday();
    
    const holiday = getDaysUntilHoliday();
    document.getElementById('nextHoliday').textContent = `${holiday.name}: ${holiday.days}`;
    
    // Create money rain animation only during working hours on working days
    if (isWorking && isWorkingDay && currentTime - lastMoneyRain >= moneyRainInterval) {
        createMoneyRain();
        lastMoneyRain = currentTime;
    }
    
    // Continue animation frame
    requestAnimationFrame(updateDisplays);
}

// Calculate today's earnings based on work hours in local timezone
function calculateTodayEarnings() {
    const now = getCurrentTime();
    const dayOfWeek = now.getDay();
    
    // Return 0 if it's not a working day
    if (!settings.workingDays.includes(dayOfWeek)) {
        return { earned: 0, isFullDay: false };
    }
    
    const [startHour, startMinute] = settings.startTime.split(':').map(Number);
    const [endHour, endMinute] = settings.endTime.split(':').map(Number);
    
    const startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    // If current time is before start time
    if (now < startTime) {
        return { earned: 0, isFullDay: false };
    }
    
    // If current time is after end time
    if (now >= endTime) {
        return { earned: settings.dailyIncome, isFullDay: true };
    }
    
    const workingMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    const dailyRate = settings.dailyIncome / workingMinutes / 60; // per second
    
    const elapsedSeconds = (now - startTime) / 1000;
    return {
        earned: (dailyRate * elapsedSeconds),
        isFullDay: false
    };
}

// Calculate workdays until weekend
function getWorkdaysUntilWeekend() {
    const now = getCurrentTime();
    const dayOfWeek = now.getDay();
    
    // If it's not a working day or after work hours, return 0
    if (!settings.workingDays.includes(dayOfWeek) || !isWorkingHours(now)) {
        return 0;
    }
    
    // Count remaining working days until weekend (including today only if we're in working hours)
    let workdaysLeft = 0;
    let currentDay = dayOfWeek;
    
    while (currentDay < 7) {
        if (settings.workingDays.includes(currentDay)) {
            workdaysLeft++;
        }
        currentDay++;
    }
    
    // Subtract 1 from workdaysLeft if we're counting today
    return Math.max(0, workdaysLeft - 1);
}

// Calculate days until next holiday based on currency's country
function getDaysUntilHoliday() {
    const config = CURRENCY_CONFIG[settings.currency];
    const now = getCurrentTime();
    
    // Get all future holidays in current year
    const futureHolidays = config.holidays.filter(holiday => {
        return holiday.date > now;
    });
    
    // If no future holidays in current year
    if (futureHolidays.length === 0) {
        return { name: config.labels.noHoliday, days: 0 };
    }
    
    // Get next holiday
    const nextHoliday = futureHolidays[0];
    const daysUntil = Math.ceil((nextHoliday.date - now) / (1000 * 60 * 60 * 24));
    
    return { name: nextHoliday.name, days: daysUntil };
}

// Calculate days until next payday
function getDaysUntilPayday() {
    const now = getCurrentTime();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    
    // Create this month's payday
    let paydayDate = new Date(currentYear, currentMonth, settings.payday);
    
    // If today is payday and we're still in working hours
    if (currentDate === settings.payday && isWorkingHours(now)) {
        return 0;
    }
    
    // If we've passed this month's payday, look at next month
    if (currentDate > settings.payday || 
        (currentDate === settings.payday && !isWorkingHours(now))) {
        paydayDate = new Date(currentYear, currentMonth + 1, settings.payday);
    }
    
    return Math.ceil((paydayDate - now) / (1000 * 60 * 60 * 24));
}

// Calculate time until end of work with seconds
function getTimeUntilEndOfWork() {
    const now = getCurrentTime();
    const dayOfWeek = now.getDay();
    const config = CURRENCY_CONFIG[settings.currency];
    
    // If it's not a working day
    if (!settings.workingDays.includes(dayOfWeek)) {
        return { text: config.labels.weekend, seconds: 0 };
    }
    
    const [endHour, endMinute] = settings.endTime.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    const [startHour, startMinute] = settings.startTime.split(':').map(Number);
    const startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    // If current time is before start time
    if (now < startTime) {
        return { text: config.labels.beforeWork, seconds: 0 };
    }
    
    // If current time is after end time
    if (now >= endTime) {
        return { text: config.labels.afterWork, seconds: 0 };
    }
    
    const secondsLeft = Math.floor((endTime - now) / 1000);
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;
    
    return {
        text: `${formatTimeComponent(hours)}:${formatTimeComponent(minutes)}:${formatTimeComponent(seconds)}`,
        seconds: secondsLeft
    };
}

// 社交分享功能
function shareToTwitter() {
    const text = `我正在使用下班倒计时！还有 ${document.getElementById('timeUntilEndOfWork').textContent} 就下班了！`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
}

function shareToFacebook() {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}

function shareToReddit() {
    const title = '下班倒计时';
    const url = window.location.href;
    window.open(`https://reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
}

function shareToWeibo() {
    const text = `我正在使用下班倒计时！还有 ${document.getElementById('timeUntilEndOfWork').textContent} 就下班了！`;
    const url = window.location.href;
    window.open(`http://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, '_blank');
}

function shareToWechat() {
    // 由于微信分享需要使用微信SDK，这里我们简单提示用户
    alert('请截图后分享到微信');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    loadSettings();
    
    // Apply settings to form
    applySettings();
    
    // Update interface language
    updateInterfaceLanguage();
    
    // Add event listeners to day buttons
    document.querySelectorAll('.day-btn').forEach(button => {
        button.addEventListener('click', function() {
            const day = parseInt(this.dataset.day);
            this.classList.toggle('selected');
            this.classList.toggle('bg-blue-500');
            this.classList.toggle('text-white');
            
            const index = settings.workingDays.indexOf(day);
            if (index === -1) {
                settings.workingDays.push(day);
                settings.workingDays.sort((a, b) => a - b);
            } else {
                settings.workingDays.splice(index, 1);
            }
        });
    });
    
    // Add event listener to currency select
    document.getElementById('currency').addEventListener('change', function() {
        settings.currency = this.value;
        // Update interface language immediately
        updateInterfaceLanguage();
        updateDisplays();
    });
    
    // Add event listener to save settings button
    document.getElementById('saveSettings').addEventListener('click', function() {
        settings.startTime = document.getElementById('startTime').value;
        settings.endTime = document.getElementById('endTime').value;
        settings.payday = parseInt(document.getElementById('payday').value);
        settings.dailyIncome = parseFloat(document.getElementById('dailyIncome').value);
        settings.currency = document.getElementById('currency').value;
        
        saveSettings();
        showDashboard();
    });
    
    // Add event listener to edit settings button
    document.getElementById('editSettings').addEventListener('click', showSetup);
    
    // Add event listeners to share buttons
    document.getElementById('shareToTwitter').addEventListener('click', shareToTwitter);
    document.getElementById('shareToFacebook').addEventListener('click', shareToFacebook);
    document.getElementById('shareToReddit').addEventListener('click', shareToReddit);
    document.getElementById('shareToWeibo').addEventListener('click', shareToWeibo);
    document.getElementById('shareToWechat').addEventListener('click', shareToWechat);
    
    // Show dashboard if settings exist, otherwise show setup
    if (localStorage.getItem('workSettings')) {
        showDashboard();
    } else {
        updateInterfaceLanguage();
    }
});
