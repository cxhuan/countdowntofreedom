// Currency and timezone settings
const CURRENCY_CONFIG = {
    USD: {
        symbol: '$',
        timezone: 'America/New_York',
        holidays: [
            { name: 'New Year', date: new Date(2025, 0, 1) },
            { name: 'Martin Luther King Jr. Day', date: new Date(2025, 0, 20) },
            { name: 'Presidents Day', date: new Date(2025, 1, 17) },
            { name: 'Memorial Day', date: new Date(2025, 4, 26) },
            { name: 'Independence Day', date: new Date(2025, 6, 4) },
            { name: 'Labor Day', date: new Date(2025, 8, 1) },
            { name: 'Thanksgiving', date: new Date(2025, 10, 27) },
            { name: 'Christmas', date: new Date(2025, 11, 25) }
        ]
    },
    CNY: {
        symbol: '¥',
        timezone: 'Asia/Shanghai',
        holidays: [
            { name: 'Spring Festival', date: new Date(2025, 0, 29) },
            { name: 'Qingming Festival', date: new Date(2025, 3, 5) },
            { name: 'Labor Day', date: new Date(2025, 4, 1) },
            { name: 'Dragon Boat Festival', date: new Date(2025, 5, 31) },
            { name: 'Mid-Autumn Festival', date: new Date(2025, 8, 29) },
            { name: 'National Day', date: new Date(2025, 9, 1) }
        ]
    },
    EUR: {
        symbol: '€',
        timezone: 'Europe/Paris',
        holidays: [
            { name: 'New Year', date: new Date(2025, 0, 1) },
            { name: 'Easter Monday', date: new Date(2025, 3, 21) },
            { name: 'Labor Day', date: new Date(2025, 4, 1) },
            { name: 'Europe Day', date: new Date(2025, 4, 9) },
            { name: 'Christmas', date: new Date(2025, 11, 25) },
            { name: 'St. Stephen\'s Day', date: new Date(2025, 11, 26) }
        ]
    },
    GBP: {
        symbol: '£',
        timezone: 'Europe/London',
        holidays: [
            { name: 'New Year', date: new Date(2025, 0, 1) },
            { name: 'Good Friday', date: new Date(2025, 3, 18) },
            { name: 'Easter Monday', date: new Date(2025, 3, 21) },
            { name: 'Early May Bank Holiday', date: new Date(2025, 4, 5) },
            { name: 'Spring Bank Holiday', date: new Date(2025, 4, 26) },
            { name: 'Summer Bank Holiday', date: new Date(2025, 7, 25) },
            { name: 'Christmas', date: new Date(2025, 11, 25) },
            { name: 'Boxing Day', date: new Date(2025, 11, 26) }
        ]
    },
    JPY: {
        symbol: '¥',
        timezone: 'Asia/Tokyo',
        holidays: [
            { name: 'New Year', date: new Date(2025, 0, 1) },
            { name: 'Coming of Age Day', date: new Date(2025, 0, 13) },
            { name: 'National Foundation Day', date: new Date(2025, 1, 11) },
            { name: 'Emperor\'s Birthday', date: new Date(2025, 1, 23) },
            { name: 'Showa Day', date: new Date(2025, 3, 29) },
            { name: 'Golden Week', date: new Date(2025, 4, 3) },
            { name: 'Obon Festival', date: new Date(2025, 7, 15) },
            { name: 'Respect for the Aged Day', date: new Date(2025, 8, 15) }
        ]
    }
};

// Default settings
let settings = {
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '18:00',
    payday: 15,
    dailyIncome: 100,
    currency: 'USD'
};

// Animation variables
let lastUpdateTime = Date.now();
let lastMoneyRain = Date.now();
let moneyRainInterval = 2000;
let baseTime = new Date("2025-03-19T15:13:18+08:00");
let startTimestamp = Date.now();
let currentEarnings = 0;
let lastEarningUpdate = Date.now();

// Get current time in the selected timezone
function getCurrentTime() {
    const elapsedMs = Date.now() - startTimestamp;
    const now = new Date(baseTime.getTime() + elapsedMs);
    const timezone = CURRENCY_CONFIG[settings.currency].timezone;
    return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
}

// Format number with 3 decimal places
function formatNumber(amount) {
    return amount.toFixed(3);
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
    baseTime = new Date("2025-03-19T15:13:18+08:00");
    startTimestamp = Date.now();
    currentEarnings = 0;
    lastEarningUpdate = Date.now();
    
    // Initialize display values
    updateDisplays();
    
    // Clear existing interval if any
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
    }
    
    // Start real-time updates
    requestAnimationFrame(updateDisplays);
}

// Create money rain element
function createMoneyRain() {
    const moneyRain = document.createElement('div');
    moneyRain.className = 'money-rain';
    moneyRain.textContent = '💰';
    document.querySelector('.earnings-display').parentElement.appendChild(moneyRain);
    
    setTimeout(() => {
        moneyRain.remove();
    }, 2000);
}

// Update all displays
function updateDisplays(timestamp) {
    const now = getCurrentTime();
    const currentTime = Date.now();
    
    // Update earnings every 10ms (0.01 seconds)
    if (currentTime - lastEarningUpdate >= 10) {
        const { earned } = calculateTodayEarnings();
        
        // Smoothly update current earnings
        if (earned > currentEarnings) {
            const step = (earned - currentEarnings) * (10 / 1000); // 10ms step size
            currentEarnings += Math.min(step, earned - currentEarnings);
        } else {
            currentEarnings = earned;
        }
        
        // Update earnings display without currency symbol
        document.getElementById('todayEarnings').textContent = formatNumber(currentEarnings);
        lastEarningUpdate = currentTime;
    }
    
    // Update countdown display
    const timeUntilEnd = getTimeUntilEndOfWork();
    document.getElementById('timeUntilEndOfWork').textContent = timeUntilEnd.text;
    
    // Update other displays
    const workdaysLeft = getWorkdaysUntilWeekend();
    document.getElementById('workdaysLeft').textContent = workdaysLeft;
    
    document.getElementById('daysUntilPayday').textContent = getDaysUntilPayday();
    
    const holiday = getDaysUntilHoliday();
    document.getElementById('nextHoliday').textContent = `${holiday.name}: ${holiday.days}`;
    
    // Create money rain animation periodically
    if (currentTime - lastMoneyRain >= moneyRainInterval) {
        createMoneyRain();
        lastMoneyRain = currentTime;
    }
    
    // Continue animation frame
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
    applySettings();
}

// Calculate days until next holiday based on currency's country
function getDaysUntilHoliday() {
    const now = getCurrentTime();
    const holidays = CURRENCY_CONFIG[settings.currency].holidays;
    const upcoming = holidays.find(holiday => holiday.date > now);
    if (!upcoming) return { days: 0, name: 'No upcoming holidays' };
    const days = Math.ceil((upcoming.date - now) / (1000 * 60 * 60 * 24));
    return {
        days: days,
        name: upcoming.name
    };
}

// Calculate days until next payday
function getDaysUntilPayday() {
    const now = getCurrentTime();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let paydayDate = new Date(currentYear, currentMonth, settings.payday);
    
    if (now > paydayDate) {
        paydayDate = new Date(currentYear, currentMonth + 1, settings.payday);
    }
    
    return Math.ceil((paydayDate - now) / (1000 * 60 * 60 * 24));
}

// Calculate today's earnings based on work hours in local timezone
function calculateTodayEarnings() {
    const now = getCurrentTime();
    const dayOfWeek = now.getDay();
    
    if (!settings.workingDays.includes(dayOfWeek)) return { earned: 0 };
    
    const [startHour, startMinute] = settings.startTime.split(':').map(Number);
    const [endHour, endMinute] = settings.endTime.split(':').map(Number);
    
    const todayDate = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();
    
    const workStart = new Date(todayYear, todayMonth, todayDate, startHour, startMinute, 0);
    const workEnd = new Date(todayYear, todayMonth, todayDate, endHour, endMinute, 0);
    
    if (now < workStart) return { earned: 0 };
    if (now > workEnd) return { earned: settings.dailyIncome };
    
    const totalWorkSeconds = (endHour - startHour) * 3600 + (endMinute - startMinute) * 60;
    const workedSeconds = Math.floor((now - workStart) / 1000);
    const earned = (workedSeconds / totalWorkSeconds * settings.dailyIncome);
    
    return { earned };
}

// Calculate workdays until weekend
function getWorkdaysUntilWeekend() {
    const now = getCurrentTime();
    const dayOfWeek = now.getDay();
    
    if (!settings.workingDays.includes(dayOfWeek)) {
        return 0;
    }
    
    let workdaysLeft = 0;
    let currentDay = dayOfWeek;
    
    while (settings.workingDays.includes(currentDay)) {
        workdaysLeft++;
        currentDay = (currentDay + 1) % 7;
    }
    
    return workdaysLeft;
}

// Calculate time until end of work with seconds
function getTimeUntilEndOfWork() {
    const now = getCurrentTime();
    const dayOfWeek = now.getDay();
    
    if (!settings.workingDays.includes(dayOfWeek)) {
        return { text: 'Weekend! 🎉', seconds: 0 };
    }
    
    const [endHour, endMinute] = settings.endTime.split(':').map(Number);
    
    const todayDate = now.getDate();
    const todayMonth = now.getMonth();
    const todayYear = now.getFullYear();
    
    const workEnd = new Date(todayYear, todayMonth, todayDate, endHour, endMinute, 0);
    
    if (now > workEnd) {
        return { text: 'Done for today! 🌙', seconds: 0 };
    }
    
    const diff = workEnd - now;
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return {
        text: formatTime(hours, minutes, seconds),
        seconds: totalSeconds
    };
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('selected');
            btn.classList.toggle('bg-blue-500');
            btn.classList.toggle('text-white');
        });
    });
    
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    document.getElementById('editSettings').addEventListener('click', showSetup);
    
    loadSettings();
});
