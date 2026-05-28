import { DEALERSHIPS } from './data.js';

// State Management
let appState = {
  currentUser: null,
  currentLocationId: null,
  dateRange: 'month', // '7d', '30d', 'month', 'custom'
  customStartDate: '',
  customEndDate: '',
  notifications: [
    { id: 1, title: 'Welcome aboard!', text: 'Your Google Ads campaign is live. Track metrics daily.', date: '2026-05-20', read: false }
  ],
  tickets: [],
  messages: [],
  charts: {
    leads: { canvas: null, ctx: null },
    spend: { canvas: null, ctx: null }
  }
};

// ==========================================
// 1. APPLICATION INITIALIZATION & ROUTING
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuthEventListeners();
  checkExistingSession();
  initSimPanel();
});

function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  
  // Default is light. Check localStorage first
  const savedTheme = localStorage.getItem('cd_ncbd_theme') || 'light';
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      showToast('Theme Changed', `Switched to ${newTheme} mode.`);
    });
  }
}

function applyTheme(theme) {
  const icon = document.getElementById('theme-icon');
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (icon) icon.textContent = '🌙';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (icon) icon.textContent = '☀️';
  }
  localStorage.setItem('cd_ncbd_theme', theme);
  
  // Redraw charts if active and visible to match the text and line colors
  if (appState.currentUser && document.getElementById('tab-dashboard') && document.getElementById('tab-dashboard').style.display !== 'none') {
    redrawCharts();
  }
}

function checkExistingSession() {
  const savedSession = localStorage.getItem('cd_ncbd_session');
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      const dealer = DEALERSHIPS[session.dealerId];
      if (dealer) {
        loginUser(dealer, session.locationId);
        return;
      }
    } catch (e) {
      localStorage.removeItem('cd_ncbd_session');
    }
  }
  showAuthOverlay();
}

function loginUser(dealer, targetLocationId = null) {
  appState.currentUser = dealer;
  
  // Get first available location if not specified
  const locationIds = Object.keys(dealer.locations);
  appState.currentLocationId = targetLocationId && locationIds.includes(targetLocationId) 
    ? targetLocationId 
    : locationIds[0];
  
  // Save session
  localStorage.setItem('cd_ncbd_session', JSON.stringify({
    dealerId: Object.keys(DEALERSHIPS).find(key => DEALERSHIPS[key] === dealer),
    locationId: appState.currentLocationId
  }));

  // Hide Auth, Show Main App
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app-view').style.display = 'flex';
  
  // Update dealer profile in header
  document.getElementById('dealer-name-header').textContent = dealer.name;
  document.getElementById('dealer-avatar').textContent = dealer.name.split(' ').map(n=>n[0]).join('').substring(0, 2);

  // Clone location specific data to state
  const locData = dealer.locations[appState.currentLocationId];
  appState.tickets = [...(locData.tickets || [])];
  appState.messages = [...(locData.messages || [])];
  appState.notifications = [...(locData.notifications || [
    { id: Date.now(), title: 'Welcome aboard!', text: `${locData.name} campaign is live. Track metrics daily.`, date: locData.startDate, read: false }
  ])];

  initAppDashboard();
  showToast('Logged In Successfully', `Welcome to ${dealer.name}`);
}

function showAuthOverlay() {
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
  showPhoneView();
}

// ==========================================
// 2. AUTHENTICATION CONTROLLERS
// ==========================================
function initAuthEventListeners() {
  const phoneInput = document.getElementById('login-phone');
  const sendOtpBtn = document.getElementById('send-otp-btn');
  const verifyOtpBtn = document.getElementById('verify-otp-btn');
  const backToPhoneBtn = document.getElementById('back-to-phone-btn');
  const otpInputs = document.querySelectorAll('.otp-input');
  
  // Auto-focus transitions for OTP box
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });
  });

  sendOtpBtn.addEventListener('click', () => {
    const phoneVal = phoneInput.value.trim();
    const matchedKey = Object.keys(DEALERSHIPS).find(key => DEALERSHIPS[key].phone === phoneVal);
    
    if (matchedKey) {
      // Transition to OTP view
      showOtpView(phoneVal);
      // Auto populate code check helper
      setTimeout(() => {
        const dealer = DEALERSHIPS[matchedKey];
        otpInputs[0].value = dealer.otp[0];
        otpInputs[1].value = dealer.otp[1];
        otpInputs[2].value = dealer.otp[2];
        otpInputs[3].value = dealer.otp[3];
        otpInputs[4].value = dealer.otp[4];
        otpInputs[5].value = dealer.otp[5];
        otpInputs[5].focus();
        showToast('OTP Simulated', `Code sent to ${phoneVal}. Autopopulated code: ${dealer.otp}`);
      }, 800);
    } else {
      showToast('Validation Failed', 'Mobile number not found in our database.', 'danger');
      phoneInput.style.borderColor = 'var(--color-danger)';
      setTimeout(() => phoneInput.style.borderColor = 'var(--border-color)', 2000);
    }
  });

  verifyOtpBtn.addEventListener('click', () => {
    let codeStr = '';
    otpInputs.forEach(input => codeStr += input.value);
    
    const phoneVal = phoneInput.value.trim();
    const matchedKey = Object.keys(DEALERSHIPS).find(key => DEALERSHIPS[key].phone === phoneVal);
    
    if (matchedKey && DEALERSHIPS[matchedKey].otp === codeStr) {
      loginUser(DEALERSHIPS[matchedKey]);
    } else {
      showToast('Error', 'Incorrect OTP. Please check the code and try again.', 'danger');
      otpInputs.forEach(input => {
        input.value = '';
        input.style.borderColor = 'var(--color-danger)';
        setTimeout(() => input.style.borderColor = 'var(--border-color)', 2000);
      });
      otpInputs[0].focus();
    }
  });

  backToPhoneBtn.addEventListener('click', showPhoneView);
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('cd_ncbd_session');
    appState.currentUser = null;
    showAuthOverlay();
    showToast('Logged Out', 'Session ended.');
  });
}

function showPhoneView() {
  document.getElementById('auth-phone-view').style.display = 'flex';
  document.getElementById('auth-otp-view').style.display = 'none';
  document.getElementById('login-phone').value = '';
  document.getElementById('login-phone').focus();
}

function showOtpView(phone) {
  document.getElementById('auth-phone-view').style.display = 'none';
  document.getElementById('auth-otp-view').style.display = 'flex';
  document.querySelector('.otp-timer').innerHTML = `Verification code sent to <strong>+91 ${phone}</strong>`;
  const otpInputs = document.querySelectorAll('.otp-input');
  otpInputs.forEach(input => input.value = '');
  otpInputs[0].focus();
}

// ==========================================
// 3. CORE APP VIEW CONTROLLER
// ==========================================
function initAppDashboard() {
  // 1. Populate locations select
  const select = document.getElementById('location-switcher');
  select.innerHTML = '';
  
  const locations = appState.currentUser.locations;
  Object.keys(locations).forEach(locId => {
    const opt = document.createElement('option');
    opt.value = locId;
    opt.textContent = locations[locId].name;
    if (locId === appState.currentLocationId) opt.selected = true;
    select.appendChild(opt);
  });

  // 2. Attach Core Event Listeners
  select.onchange = (e) => {
    appState.currentLocationId = e.target.value;
    const locData = appState.currentUser.locations[appState.currentLocationId];
    appState.tickets = [...(locData.tickets || [])];
    appState.messages = [...(locData.messages || [])];
    appState.notifications = [...(locData.notifications || [
      { id: Date.now(), title: 'Welcome aboard!', text: `${locData.name} campaign is live. Track metrics daily.`, date: locData.startDate, read: false }
    ])];
    
    // Update dealer profile in header in case of switcher change
    document.getElementById('dealer-name-header').textContent = appState.currentUser.name;
    document.getElementById('dealer-avatar').textContent = appState.currentUser.name.split(' ').map(n=>n[0]).join('').substring(0, 2);

    // Save session change
    localStorage.setItem('cd_ncbd_session', JSON.stringify({
      dealerId: Object.keys(DEALERSHIPS).find(key => DEALERSHIPS[key] === appState.currentUser),
      locationId: appState.currentLocationId
    }));

    updateDashboardContent();
    renderOptimisationLog();
    renderReports();
    renderTickets();
    renderChat();
    renderBilling();
    updateNotificationsUI();
    showToast('Location Switched', `Now viewing ${locData.name}`);
  };

  // Nav Items Click Handlers
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.onclick = () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    };
  });

  // Date Pills
  const datePills = document.querySelectorAll('.date-pill');
  const customDateInputs = document.getElementById('custom-date-inputs');
  datePills.forEach(pill => {
    pill.onclick = () => {
      datePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const range = pill.getAttribute('data-range');
      appState.dateRange = range;
      
      if (range === 'custom') {
        customDateInputs.style.display = 'flex';
      } else {
        customDateInputs.style.display = 'none';
        updateDashboardContent();
      }
    };
  });

  document.getElementById('apply-custom-dates').onclick = () => {
    const start = document.getElementById('date-start').value;
    const end = document.getElementById('date-end').value;
    if (!start || !end) {
      showToast('Validation Error', 'Please select both start and end dates.', 'warning');
      return;
    }
    if (new Date(start) > new Date(end)) {
      showToast('Validation Error', 'Start date must be prior to end date.', 'warning');
      return;
    }
    appState.customStartDate = start;
    appState.customEndDate = end;
    updateDashboardContent();
  };

  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  mobileToggle.onclick = (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('mobile-open');
  };
  document.body.onclick = () => {
    sidebar.classList.remove('mobile-open');
  };
  sidebar.onclick = (e) => e.stopPropagation();

  // Support ticket form submission
  const supportForm = document.getElementById('support-form');
  const supportDialog = document.getElementById('support-dialog');
  supportForm.onsubmit = (e) => {
    e.preventDefault();
    const subject = document.getElementById('tkt-subject').value.trim();
    const priority = document.getElementById('tkt-priority').value;
    const desc = document.getElementById('tkt-desc').value.trim();
    
    const newTkt = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject,
      priority,
      description: desc,
      status: 'Open',
      date: new Date().toISOString().split('T')[0],
      history: [
        { date: new Date().toISOString().split('T')[0], status: 'Open', note: 'Ticket registered by dealership portal.' }
      ]
    };

    appState.tickets.unshift(newTkt);
    // Persist mock ticket back to source data store for duration of runtime session
    appState.currentUser.locations[appState.currentLocationId].tickets = appState.tickets;
    
    renderTickets();
    supportForm.reset();
    supportDialog.close();
    showToast('Ticket Raised', `${newTkt.id} created successfully.`);
  };

  // Chat send handlers
  document.getElementById('chat-send-btn').onclick = sendDealerChatMessage;
  document.getElementById('chat-input-field').onkeydown = (e) => {
    if (e.key === 'Enter') sendDealerChatMessage();
  };

  // Notification Clear All
  document.getElementById('clear-notif-btn').onclick = () => {
    appState.notifications = [];
    const loc = appState.currentUser.locations[appState.currentLocationId];
    if (loc) {
      loc.notifications = [];
    }
    updateNotificationsUI();
    showToast('Notifications Cleared', 'In-app notification logs cleared.');
  };

  // Excel Export Trigger
  document.getElementById('excel-export-btn').onclick = exportRangeToCSV;

  // Initialize display
  updateDashboardContent();
  renderOptimisationLog();
  renderReports();
  renderTickets();
  renderChat();
  renderBilling();
  updateNotificationsUI();
}

function switchTab(tabId) {
  const panes = document.querySelectorAll('.tab-pane');
  const navItems = document.querySelectorAll('.nav-item');
  
  panes.forEach(pane => {
    pane.classList.remove('active');
    pane.style.display = 'none';
  });
  navItems.forEach(item => item.classList.remove('active'));

  const activePane = document.getElementById(`tab-${tabId}`);
  const activeNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  
  if (activePane && activeNavItem) {
    activePane.classList.add('active');
    activePane.style.display = tabId === 'logs' || tabId === 'dashboard' || tabId === 'reports' || tabId === 'billing' ? 'flex' : 'grid';
    activeNavItem.classList.add('active');
    
    // Draw charts if tab is dashboard
    if (tabId === 'dashboard') {
      setTimeout(redrawCharts, 50);
    }
  }
}

// ==========================================
// 4. DATA PROCESSING ENGINE
// ==========================================
function getFilteredData() {
  const loc = appState.currentUser.locations[appState.currentLocationId];
  const allData = loc.dailyData;
  const now = new Date("2026-05-25");
  
  let startDateLimit;
  if (appState.dateRange === '7d') {
    startDateLimit = new Date(now);
    startDateLimit.setDate(now.getDate() - 7);
  } else if (appState.dateRange === '30d') {
    startDateLimit = new Date(now);
    startDateLimit.setDate(now.getDate() - 30);
  } else if (appState.dateRange === 'month') {
    // Current calendar month starting May 1, 2026
    startDateLimit = new Date("2026-05-01");
  } else if (appState.dateRange === 'custom') {
    const start = new Date(appState.customStartDate);
    const end = new Date(appState.customEndDate);
    return allData.filter(d => {
      const dDate = new Date(d.date);
      return dDate >= start && dDate <= end;
    });
  }

  return allData.filter(d => new Date(d.date) >= startDateLimit);
}

function getPreviousPeriodData(filteredData) {
  const loc = appState.currentUser.locations[appState.currentLocationId];
  const allData = loc.dailyData;
  if (filteredData.length === 0) return [];
  
  const earliestDateStr = filteredData[0].date;
  const earliestDate = new Date(earliestDateStr);
  const diffTime = filteredData.length; // number of days in range
  
  const prevStart = new Date(earliestDate);
  prevStart.setDate(earliestDate.getDate() - diffTime);
  const prevEnd = new Date(earliestDate);
  prevEnd.setDate(earliestDate.getDate() - 1);
  
  return allData.filter(d => {
    const dDate = new Date(d.date);
    return dDate >= prevStart && dDate <= prevEnd;
  });
}

function updateDashboardContent() {
  const loc = appState.currentUser.locations[appState.currentLocationId];
  const filtered = getFilteredData();
  const previous = getPreviousPeriodData(filtered);
  
  // Set subtitle header info
  document.getElementById('dashboard-subtitle').innerHTML = `${loc.name} • Status: <span style="color: var(--color-success); font-weight: 700;">${loc.status}</span> • Live since ${new Date(loc.startDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`;
  document.getElementById('am-name').textContent = loc.assignedAM;
  document.getElementById('am-avatar').textContent = loc.assignedAM.split(' ').map(n=>n[0]).join('');

  // 1. Accumulate Metrics
  let totals = { impressions: 0, clicks: 0, spend: 0, leads: 0 };
  let searchTotals = { impressions: 0, clicks: 0, spend: 0, leads: 0 };
  let displayTotals = { impressions: 0, clicks: 0, spend: 0, leads: 0 };

  filtered.forEach(d => {
    totals.impressions += d.impressions;
    totals.clicks += d.clicks;
    totals.spend += d.spend;
    totals.leads += d.leads;
    
    searchTotals.impressions += d.channels.search.impressions;
    searchTotals.clicks += d.channels.search.clicks;
    searchTotals.spend += d.channels.search.spend;
    searchTotals.leads += d.channels.search.leads;

    displayTotals.impressions += d.channels.display.impressions;
    displayTotals.clicks += d.channels.display.clicks;
    displayTotals.spend += d.channels.display.spend;
    displayTotals.leads += d.channels.display.leads;
  });

  // Prev totals for trend
  let prevTotals = { impressions: 0, clicks: 0, spend: 0, leads: 0 };
  previous.forEach(d => {
    prevTotals.impressions += d.impressions;
    prevTotals.clicks += d.clicks;
    prevTotals.spend += d.spend;
    prevTotals.leads += d.leads;
  });

  // Calculate averages & CPL
  const cpl = totals.leads > 0 ? Math.round(totals.spend / totals.leads) : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  
  const prevCpl = prevTotals.leads > 0 ? Math.round(prevTotals.spend / prevTotals.leads) : 0;
  const prevCtr = prevTotals.impressions > 0 ? (prevTotals.clicks / prevTotals.impressions) * 100 : 0;

  // DOM bindings
  document.getElementById('stat-leads').textContent = totals.leads.toLocaleString();
  document.getElementById('stat-clicks').textContent = totals.clicks.toLocaleString();
  document.getElementById('stat-spend').textContent = `₹${totals.spend.toLocaleString()}`;
  document.getElementById('stat-cpl').textContent = `₹${cpl.toLocaleString()}`;
  document.getElementById('stat-committed-cpl-label').textContent = `₹${loc.committedCPL}`;

  // Trend percentages UI
  setTrendUI('stat-leads-trend', totals.leads, prevTotals.leads, 'leads');
  setTrendUI('stat-ctr', ctr, prevCtr, 'CTR', '%');
  
  // Spend description
  document.getElementById('stat-impressions').textContent = `${totals.impressions.toLocaleString()} views`;

  // CPL Target Validation Badge
  const cplBadge = document.getElementById('stat-cpl-badge');
  if (cpl <= loc.committedCPL) {
    cplBadge.className = 'metric-badge on-track';
    cplBadge.textContent = `On Track (Target CPL: ₹${loc.committedCPL})`;
  } else {
    cplBadge.className = 'metric-badge above-target';
    cplBadge.textContent = `₹${cpl - loc.committedCPL} Above Target CPL`;
  }

  // 2. Lead Source breakdown channels
  const totalLeadsChannel = searchTotals.leads + displayTotals.leads;
  const searchLeadPct = totalLeadsChannel > 0 ? Math.round((searchTotals.leads / totalLeadsChannel) * 100) : 0;
  const displayLeadPct = totalLeadsChannel > 0 ? Math.round((displayTotals.leads / totalLeadsChannel) * 100) : 0;

  document.getElementById('source-search-val').textContent = `${searchTotals.leads} leads (${searchLeadPct}%)`;
  document.getElementById('source-display-val').textContent = `${displayTotals.leads} leads (${displayLeadPct}%)`;
  document.getElementById('source-search-bar').style.width = `${searchLeadPct}%`;
  document.getElementById('source-display-bar').style.width = `${displayLeadPct}%`;

  // 3. Budget Utilisation
  // Billing cycle calculation
  const totalAllocated = loc.totalBudget;
  // Calculate total spent in current cycle: we can simulate by summing up details since start of current cycle
  // Noida billing cycle is April 25 - May 25. Let's sum Noida spend for this date range:
  const cycleStart = new Date("2026-04-25");
  const cycleEnd = new Date("2026-05-25");
  const cycleData = loc.dailyData.filter(d => {
    const dDate = new Date(d.date);
    return dDate >= cycleStart && dDate <= cycleEnd;
  });
  let cycleSpent = cycleData.reduce((sum, d) => sum + d.spend, 0);
  
  // Calculate remaining
  let remainingBudget = totalAllocated - cycleSpent;
  let remainingPct = 0;
  let spentPct = 0;
  let isOverspent = false;

  if (remainingBudget < 0) {
    // Clamping to 0 with a flag for overspend
    remainingBudget = 0;
    spentPct = 100;
    remainingPct = 0;
    isOverspent = true;
  } else {
    spentPct = Math.round((cycleSpent / totalAllocated) * 100);
    remainingPct = 100 - spentPct;
  }

  document.getElementById('stat-contracted-budget').textContent = `₹${totalAllocated.toLocaleString()}`;
  document.getElementById('stat-remaining-budget').textContent = `₹${remainingBudget.toLocaleString()}`;
  
  const remainingValEl = document.getElementById('stat-remaining-budget');
  if (isOverspent) {
    remainingValEl.className = "budget-stat-value overspent";
    remainingValEl.innerHTML = `₹0 <span style="font-size: 11px; font-weight: 700; color: var(--color-danger); block; display: block;">Overspent!</span>`;
  } else {
    remainingValEl.className = "budget-stat-value remaining";
  }

  const progressFill = document.getElementById('budget-progress-fill');
  progressFill.style.width = `${spentPct}%`;
  if (isOverspent) {
    progressFill.style.background = 'var(--color-danger)';
    progressFill.style.boxShadow = '0 0 8px var(--color-danger)';
  } else {
    progressFill.style.background = 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%)';
    progressFill.style.boxShadow = '0 0 8px var(--accent-cyan)';
  }

  document.getElementById('budget-spent-percent').textContent = `${spentPct}% Spent (₹${cycleSpent.toLocaleString()})`;
  document.getElementById('budget-remaining-percent').textContent = `${remainingPct}% Remaining`;

  // Redraw charts
  setTimeout(redrawCharts, 50);
}

function setTrendUI(elementId, current, previous, label, suffix = '') {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (previous === 0) {
    el.className = 'metric-trend neutral';
    el.innerHTML = `-- vs previous period`;
    return;
  }

  const pct = ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  
  if (label === 'leads') {
    // More leads is good
    el.className = isUp ? 'metric-trend up' : 'metric-trend down';
    el.innerHTML = `${isUp ? '▲' : '▼'} ${Math.abs(Math.round(pct))}% vs last period`;
  } else if (label === 'CTR') {
    // Higher CTR is good
    el.className = isUp ? 'metric-trend up' : 'metric-trend down';
    el.innerHTML = `${isUp ? '▲' : '▼'} ${Math.abs(pct.toFixed(1))}${suffix} CTR vs last period`;
  } else {
    el.className = 'metric-trend neutral';
    el.innerHTML = `${isUp ? '▲' : '▼'} ${Math.abs(Math.round(pct))}% vs last period`;
  }
}

// ==========================================
// 5. CUSTOM PREMIUM CANVAS CHART RENDERING
// ==========================================
function redrawCharts() {
  const filtered = getFilteredData();
  if (filtered.length === 0) return;

  drawLeadsChart(filtered);
  drawSpendChart(filtered);
}

function drawLeadsChart(data) {
  const canvas = document.getElementById('leads-chart');
  if (!canvas) return;

  // Setup High DPI Canvas
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Find boundaries
  const maxLeads = Math.max(...data.map(d => d.leads), 5);
  const minLeads = 0;
  const leadRange = maxLeads - minLeads;

  // Draw Grid Lines
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = paddingTop + (chartHeight * (1 - i / gridSteps));
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    // Labels
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.6)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(minLeads + (leadRange * (i / gridSteps))), paddingLeft - 8, y + 3);
  }

  // Draw Line and Gradient Fill
  const points = data.map((d, index) => {
    const x = paddingLeft + (chartWidth * (index / (data.length - 1 || 1)));
    const y = paddingTop + (chartHeight * (1 - (d.leads - minLeads) / leadRange));
    return { x, y, data: d };
  });

  // 1. Draw Area Gradient
  const grad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
  if (isDark) {
    grad.addColorStop(0, 'rgba(180, 100, 45, 0.25)'); // Cyan Glow
    grad.addColorStop(0.5, 'rgba(263, 85, 65, 0.1)'); // Purple Glow
    grad.addColorStop(1, 'rgba(6, 8, 14, 0)');
  } else {
    grad.addColorStop(0, 'rgba(180, 100, 45, 0.18)');
    grad.addColorStop(0.5, 'rgba(263, 85, 65, 0.08)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, height - paddingBottom);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
  ctx.closePath();
  ctx.fill();

  // 2. Draw Stroke Line
  const lineGrad = ctx.createLinearGradient(paddingLeft, 0, width - paddingRight, 0);
  lineGrad.addColorStop(0, 'var(--accent-cyan)');
  lineGrad.addColorStop(1, 'var(--accent-purple)');
  
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // Draw Dots for Date Endpoints or Hover Highlight
  // Draw date labels on X axis (limit to 5 labels max)
  const labelInterval = Math.ceil(data.length / 5);
  ctx.fillStyle = 'var(--text-muted)';
  ctx.font = '9px Inter';
  ctx.textAlign = 'center';
  
  data.forEach((d, index) => {
    if (index % labelInterval === 0 || index === data.length - 1) {
      const x = paddingLeft + (chartWidth * (index / (data.length - 1 || 1)));
      // format date as "May 12"
      const dateObj = new Date(d.date);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, height - 10);
    }
  });

  // Cache points in DOM ref for mouse interactions
  canvas.setAttribute('data-points-cache', JSON.stringify(points.map(p => ({ x: p.x, y: p.y, leads: p.data.leads, date: p.data.date }))));

  // Interactive Hover logic using single global overlay logic
  canvas.onmousemove = (e) => handleChartHover(e, canvas, ctx, points);
  canvas.onmouseleave = () => redrawCharts();
}

function drawSpendChart(data) {
  const canvas = document.getElementById('spend-chart');
  if (!canvas) return;

  // Setup High DPI Canvas
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;
  const paddingLeft = 35;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxSpend = Math.max(...data.map(d => d.spend), 1000);
  
  // Bar Chart Drawing
  const barWidth = Math.max(2, (chartWidth / data.length) - 2);
  
  // Draw grid lines
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 2; i++) {
    const y = paddingTop + (chartHeight * (1 - i / 2));
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.6)';
    ctx.font = '8px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`₹${Math.round((maxSpend * (i / 2)))}`, paddingLeft - 5, y + 3);
  }

  // Draw Bars
  data.forEach((d, index) => {
    const x = paddingLeft + (chartWidth * (index / data.length)) + 1;
    const barHeight = chartHeight * (d.spend / maxSpend);
    const y = height - paddingBottom - barHeight;

    const grad = ctx.createLinearGradient(0, y, 0, height - paddingBottom);
    grad.addColorStop(0, 'var(--accent-cyan)');
    grad.addColorStop(1, 'rgba(180, 100, 45, 0.2)');

    ctx.fillStyle = grad;
    // Round top corners
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
    ctx.fill();
  });
}

function handleChartHover(event, canvas, ctx, points) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Find closest point by x coordinate
  let closest = points[0];
  let minDist = Math.abs(mouseX - points[0].x);

  points.forEach(p => {
    const dist = Math.abs(mouseX - p.x);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  });

  if (minDist < 20) {
    // Redraw and show hover indicator line
    redrawCharts();
    
    // Draw vertical dotted line
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(closest.x, 20);
    ctx.lineTo(closest.x, rect.height - 30);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Draw active dot
    ctx.fillStyle = 'var(--accent-cyan)';
    ctx.strokeStyle = isDark ? 'white' : 'var(--bg-main)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(closest.x, closest.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Draw Interactive Tooltip box
    const tooltipW = 120;
    const tooltipH = 50;
    let tooltipX = closest.x + 10;
    let tooltipY = closest.y - 45;

    // Boundary containment checks
    if (tooltipX + tooltipW > rect.width) tooltipX = closest.x - tooltipW - 10;
    if (tooltipY < 5) tooltipY = closest.y + 10;

    ctx.fillStyle = isDark ? 'var(--bg-sidebar)' : 'white';
    ctx.strokeStyle = 'var(--border-color)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 6);
    ctx.fill();
    ctx.stroke();

    // Tooltip text
    ctx.fillStyle = 'var(--text-primary)';
    ctx.font = 'bold 11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`${closest.data.leads} Leads Generated`, tooltipX + 8, tooltipY + 18);
    
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = '10px Inter';
    ctx.fillText(`Date: ${closest.data.date}`, tooltipX + 8, tooltipY + 32);
    ctx.fillText(`Daily Spend: ₹${closest.data.spend}`, tooltipX + 8, tooltipY + 44);
  }
}

// ==========================================
// 6. OPTIMISATION LOG RENDERER
// ==========================================
function renderOptimisationLog() {
  const container = document.getElementById('opt-timeline');
  container.innerHTML = '';
  
  const loc = appState.currentUser.locations[appState.currentLocationId];
  const list = loc.optimisations || [];

  if (list.length === 0) {
    container.innerHTML = `<div class="no-logs-msg">No changes were made during this period.</div>`;
    return;
  }

  list.forEach(item => {
    const entry = document.createElement('div');
    entry.className = 'timeline-entry';
    
    entry.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div class="timeline-header">
          <h3 class="timeline-title">${item.title}</h3>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="timeline-author-tag">👤 CarDekho Specialist</span>
            <span class="timeline-date">${item.date}</span>
          </div>
        </div>
        <div class="timeline-details">
          <div class="timeline-field">
            <span class="timeline-field-label">What was done:</span>
            <span class="timeline-field-value">${item.action}</span>
          </div>
          <div class="timeline-field">
            <span class="timeline-field-label">Why:</span>
            <span class="timeline-field-value">${item.why}</span>
          </div>
          <div class="timeline-field">
            <span class="timeline-field-label">Expected Impact / Result:</span>
            <span class="timeline-field-value impact">${item.result}</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(entry);
  });
}

// ==========================================
// 7. SUPPORT TICKETS MODULE
// ==========================================
function renderTickets() {
  const container = document.getElementById('tickets-list');
  container.innerHTML = '';

  if (appState.tickets.length === 0) {
    container.innerHTML = `<div class="no-logs-msg" style="padding: 24px;">No active support requests registered for this location.</div>`;
    return;
  }

  appState.tickets.forEach((tkt, idx) => {
    const item = document.createElement('div');
    item.className = 'ticket-item glass-card';
    
    let historyHtml = tkt.history.map(h => `
      <div style="display: flex; gap: 8px; font-size: 11px; margin-top: 4px; color: var(--text-muted);">
        <span>•</span>
        <span><strong>[${h.date}] ${h.status}</strong>: ${h.note}</span>
      </div>
    `).join('');

    item.innerHTML = `
      <div class="ticket-header">
        <span class="ticket-id">${tkt.id}</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 11px; background: HSLA(222, 10%, 20%, 0.5); padding: 2px 6px; border-radius: 4px;">Priority: ${tkt.priority}</span>
          <span class="ticket-status ${tkt.status.replace(' ', '-')}">${tkt.status}</span>
        </div>
      </div>
      <div class="ticket-subject">${tkt.subject}</div>
      <div class="ticket-desc">${tkt.description}</div>
      <div class="ticket-footer">
        <span>Created: ${tkt.date}</span>
        <button class="ticket-history-btn" onclick="toggleTicketHistory(${idx})">Toggle Update Logs</button>
      </div>
      <div id="tkt-history-${idx}" style="display: none; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Activity Logs</span>
        ${historyHtml}
      </div>
    `;
    container.appendChild(item);
  });
}

// Global hook to toggle histories
window.toggleTicketHistory = (index) => {
  const el = document.getElementById(`tkt-history-${index}`);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
};

// ==========================================
// 8. TWO-WAY CHAT MODULE
// ==========================================
function renderChat() {
  const container = document.getElementById('chat-messages-container');
  container.innerHTML = '';

  if (appState.messages.length === 0) {
    container.innerHTML = `<div class="no-logs-msg" style="padding: 24px;">Start a conversation with your account manager.</div>`;
    return;
  }

  appState.messages.forEach(msg => {
    const el = document.createElement('div');
    el.className = `chat-message ${msg.sender}`;
    
    const timeStr = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    el.innerHTML = `
      <div>${msg.text}</div>
      <span class="message-time">${timeStr}</span>
    `;
    container.appendChild(el);
  });

  // Auto scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function sendDealerChatMessage() {
  const input = document.getElementById('chat-input-field');
  const txt = input.value.trim();
  if (!txt) return;

  const newMsg = {
    sender: 'dealer',
    text: txt,
    time: new Date().toISOString()
  };

  appState.messages.push(newMsg);
  // Persist to runtime state
  appState.currentUser.locations[appState.currentLocationId].messages = appState.messages;
  
  renderChat();
  input.value = '';

  // Trigger simulated AM response based on message content
  simulateAMResponse(txt);
}

function simulateAMResponse(userMessage) {
  const loc = appState.currentUser.locations[appState.currentLocationId];
  
  // Set AM typing indicator state
  const amStatus = document.getElementById('am-status');
  amStatus.textContent = "Typing...";
  
  setTimeout(() => {
    let reply = `Hi, I have received your message. I'm checking details and will update you shortly.`;
    
    const lower = userMessage.toLowerCase();
    if (lower.includes('cpl') || lower.includes('cost')) {
      reply = `I am reviewing the CPL pacing for ${loc.name}. We are currently averaging ₹${Math.round(loc.dailyData[loc.dailyData.length-1].spend / loc.dailyData[loc.dailyData.length-1].leads)} today, which matches our target commitments.`;
    } else if (lower.includes('budget') || lower.includes('money')) {
      reply = `Regarding the budget for ${loc.name}, we have utilized about ${Math.round((loc.dailyData.reduce((s,d)=>s+d.spend,0) / loc.totalBudget)*100)}% of the contracted ₹${loc.totalBudget.toLocaleString()} limit. Daily burn rate is pacing normally.`;
    } else if (lower.includes('report') || lower.includes('pdf')) {
      reply = `Finalized campaign PDF reports are generated automatically at the end of each billing cycle. You can download existing month files directly in the Reports tab.`;
    } else if (lower.includes('hello') || lower.includes('hi')) {
      reply = `Hello! How can I help you with your ${loc.name} Google Ads campaign today?`;
    }

    const amMsg = {
      sender: 'am',
      text: reply,
      time: new Date().toISOString()
    };

    appState.messages.push(amMsg);
    appState.currentUser.locations[appState.currentLocationId].messages = appState.messages;
    
    renderChat();
    amStatus.textContent = "Online";
    showToast('New Message', `Reply from ${loc.assignedAM}`);
  }, 2000);
}

// ==========================================
// 9. REPORTS GENERATOR (PDF & EXCEL CSV EXPORT)
// ==========================================
function getCompletedMonths(startDateStr) {
  const start = new Date(startDateStr);
  const result = [];
  
  // We want to list all calendar months from start date up to April 2026 (completed months relative to May 2026)
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const lastCompletedMonth = new Date(2026, 3, 1); // April 2026 (index 3)
  
  while (current <= lastCompletedMonth) {
    const monthName = current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Deterministic file size based on the name length and characters
    let seed = 0;
    for (let i = 0; i < monthName.length; i++) {
      seed += monthName.charCodeAt(i);
    }
    let size = 110 + (seed % 40); 
    
    result.unshift({ month: monthName, size: `${size} KB` }); // Newest first
    current.setMonth(current.getMonth() + 1);
  }
  
  return result.length > 0 ? result : [{ month: 'April 2026', size: '142 KB' }];
}

function renderReports() {
  const container = document.getElementById('reports-grid');
  container.innerHTML = '';
  
  const loc = appState.currentUser.locations[appState.currentLocationId];
  const reports = getCompletedMonths(loc.startDate);

  reports.forEach(rep => {
    const card = document.createElement('div');
    card.className = 'glass-card report-item-card';
    
    card.innerHTML = `
      <div class="report-header">
        <div class="report-icon">📄</div>
        <div class="report-meta">
          <span class="report-month">${rep.month}</span>
          <span class="report-filesize">${rep.size} • PDF Report</span>
        </div>
      </div>
      <div class="report-actions">
        <button class="btn btn-primary" onclick="window.downloadReport('${rep.month}', 'pdf')">Print Report</button>
        <button class="btn" onclick="window.downloadReport('${rep.month}', 'csv')">Export CSV</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Global hooks for reports
window.downloadReport = (month, type) => {
  const loc = appState.currentUser.locations[appState.currentLocationId];
  if (type === 'pdf') {
    showToast('Compiling PDF', 'Preparing formatted report. Opening print dialog...', 'info');
    setTimeout(() => {
      // Simulate clean printing layout by running window.print()
      window.print();
    }, 1000);
  } else {
    // Generate mock CSV data
    const filename = `${loc.name.replace(/\s+/g, '_')}_Report_${month.replace(/\s+/g, '_')}.csv`;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Impressions,Clicks,Spend,Leads\n";
    
    const cycleData = loc.dailyData.slice(0, 30); // export 30 rows
    cycleData.forEach(d => {
      csvContent += `${d.date},${d.impressions},${d.clicks},${d.spend},${d.leads}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV Downloaded', `${filename} generated.`);
  }
};

function exportRangeToCSV() {
  const loc = appState.currentUser.locations[appState.currentLocationId];
  const filtered = getFilteredData();
  if (filtered.length === 0) {
    showToast('No Data', 'No campaign records found in current range filter.', 'warning');
    return;
  }

  const filename = `${loc.name.replace(/\s+/g, '_')}_Custom_Range.csv`;
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Date,Impressions,Clicks,Spend,Leads,CTR,CPL\n";
  
  filtered.forEach(d => {
    const ctr = d.impressions > 0 ? ((d.clicks/d.impressions)*100).toFixed(2) : 0;
    const cpl = d.leads > 0 ? Math.round(d.spend/d.leads) : 0;
    csvContent += `${d.date},${d.impressions},${d.clicks},${d.spend},${d.leads},${ctr}%,₹${cpl}\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Export Completed', `${filtered.length} entries exported to Excel CSV.`);
}

// ==========================================
// 10. QA SIMULATOR PANELS & CONTROLS
// ==========================================
function initSimPanel() {
  const simToggle = document.getElementById('sim-toggle-btn');
  const simPanel = document.getElementById('sim-panel-container');
  const simClose = document.getElementById('sim-close-btn');

  simToggle.onclick = () => {
    const isShowing = simPanel.classList.contains('show');
    if (isShowing) {
      simPanel.classList.remove('show');
    } else {
      simPanel.classList.add('show');
    }
  };
  
  simClose.onclick = () => {
    simPanel.classList.remove('show');
  };

  // 1. WhatsApp Alert Simulator
  document.getElementById('sim-notif-whatsapp-btn').onclick = () => {
    const newNotif = {
      id: Date.now(),
      title: 'Monthly Report Ready',
      text: 'Finalized performance report for April 2026 is ready. Click to view.',
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    appState.notifications.unshift(newNotif);
    const loc = appState.currentUser.locations[appState.currentLocationId];
    if (loc) {
      loc.notifications = appState.notifications;
    }
    updateNotificationsUI();
    
    // Trigger toast notification that takes user to reports
    showToast(
      'WhatsApp Alert (Simulated)', 
      '💬 "Hi Principal! Your April monthly campaign performance report is ready. View at: portal.cardekho.com/reports"',
      'success',
      () => {
        switchTab('reports');
      }
    );
  };

  // 2. Chat reply simulator
  document.getElementById('sim-msg-reply-btn').onclick = () => {
    const loc = appState.currentUser.locations[appState.currentLocationId];
    const typingStatus = document.getElementById('am-status');
    typingStatus.textContent = "Typing...";
    
    setTimeout(() => {
      const amMsg = {
        sender: 'am',
        text: `Hey, I just ran a search query report and excluded some terms that were driving high CTR but zero leads. Let me know if you see CPL drop!`,
        time: new Date().toISOString()
      };
      
      appState.messages.push(amMsg);
      appState.currentUser.locations[appState.currentLocationId].messages = appState.messages;
      renderChat();
      typingStatus.textContent = "Online";
      showToast('New message', `From ${loc.assignedAM}`);
    }, 1500);
  };

  // 3. Support ticket status simulator
  document.getElementById('sim-ticket-status-btn').onclick = () => {
    const openTkt = appState.tickets.find(t => t.status === 'Open' || t.status === 'In Review');
    if (!openTkt) {
      showToast('No Active Tickets', 'There are no open or in review support tickets to advance.', 'warning');
      return;
    }

    const prevStatus = openTkt.status;
    const nowStr = new Date().toISOString().split('T')[0];
    
    if (prevStatus === 'Open') {
      openTkt.status = 'In Review';
      openTkt.history.push({ date: nowStr, status: 'In Review', note: 'Account manager reviewing campaign targeting modifications.' });
    } else {
      openTkt.status = 'Resolved';
      openTkt.history.push({ date: nowStr, status: 'Resolved', note: 'Requested changes implemented and verified.' });
    }

    // Persist changes
    appState.currentUser.locations[appState.currentLocationId].tickets = appState.tickets;
    renderTickets();
    showToast('Ticket Updated', `${openTkt.id} shifted from ${prevStatus} ➔ ${openTkt.status}`);
  };

  // 4. Force campaign CPL overspend (CPL alert simulator)
  document.getElementById('sim-cpl-alert-btn').onclick = () => {
    const loc = appState.currentUser.locations[appState.currentLocationId];
    
    // Manipulate Noida data to double the CPL
    loc.dailyData.forEach(d => {
      d.spend = d.spend * 2.2; // Double daily spend
      d.clicks = Math.round(d.clicks * 1.5);
    });

    updateDashboardContent();
    showToast('CPL Warning triggered!', `Campaign CPL exceeded target. Notice the red indicator badge!`, 'danger');
  };
}

// ==========================================
// 11. DYNAMIC NOTIFICATIONS & TOASTS
// ==========================================
function updateNotificationsUI() {
  const listEl = document.getElementById('popover-notif-list');
  const badge = document.getElementById('notif-badge');
  listEl.innerHTML = '';

  const unreadCount = appState.notifications.filter(n => !n.read).length;
  if (unreadCount > 0) {
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }

  if (appState.notifications.length === 0) {
    listEl.innerHTML = `<div class="no-logs-msg" style="padding: 16px; font-size: 12px;">No new alerts</div>`;
    return;
  }

  appState.notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = `popover-item ${n.read ? '' : 'unread'}`;
    item.onclick = () => {
      n.read = true;
      const loc = appState.currentUser.locations[appState.currentLocationId];
      if (loc) {
        loc.notifications = appState.notifications;
      }
      updateNotificationsUI();
    };
    
    item.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 2px;">${n.title}</div>
      <div>${n.text}</div>
      <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px; text-align: right;">${n.date}</div>
    `;
    listEl.appendChild(item);
  });
}

function showToast(title, body, type = 'success', action = null) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  if (type === 'danger') {
    toast.style.borderLeftColor = 'var(--color-danger)';
  } else if (type === 'warning') {
    toast.style.borderLeftColor = 'var(--color-warning)';
  } else if (type === 'info') {
    toast.style.borderLeftColor = 'var(--color-info)';
  } else {
    toast.style.borderLeftColor = 'var(--accent-cyan)';
  }

  toast.innerHTML = `
    <div class="toast-header">
      <span>${title}</span>
      <button class="toast-close">✕</button>
    </div>
    <div class="toast-body">${body}</div>
  `;

  // Attach dismiss action
  toast.querySelector('.toast-close').onclick = () => {
    toast.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => container.removeChild(toast), 300);
  };

  if (action) {
    toast.style.cursor = 'pointer';
    toast.onclick = (e) => {
      if (e.target.className !== 'toast-close') {
        action();
        toast.querySelector('.toast-close').click();
      }
    };
  }

  container.appendChild(toast);
  
  // Auto dismiss after 6 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.querySelector('.toast-close').click();
    }
  }, 6000);
}

// ==========================================
// 12. SUBSCRIPTION & BILLING PANEL
// ==========================================
function renderBilling() {
  const container = document.getElementById('tab-billing');
  if (!container) return;
  
  const loc = appState.currentUser.locations[appState.currentLocationId];
  if (!loc) return;

  const sub = loc.subscription || {
    status: "Active",
    planName: "Standard Agency Retainer",
    fee: 20000,
    billingCycle: "Monthly",
    nextPaymentDate: "2026-06-25",
    paymentMethod: "Mastercard ending in 9876",
    invoices: [
      { id: "INV-2026-004", date: "2026-05-25", amount: 20000, status: "Paid" },
      { id: "INV-2026-003", date: "2026-04-25", amount: 20000, status: "Paid" }
    ]
  };

  container.innerHTML = `
    <div class="page-title-section">
      <div>
        <h1 class="page-title">Subscription & Retainer Details</h1>
        <p class="page-subtitle">Manage monthly agency retainer subscriptions, view payment methods, and download transaction history.</p>
      </div>
    </div>

    <div class="billing-grid">
      <!-- Subscription Main Details -->
      <div class="glass-card billing-card-main">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
          <div>
            <span class="plan-badge" style="background: rgba(13, 202, 240, 0.15); color: var(--accent-cyan); padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${sub.planName}</span>
            <h2 style="font-family: var(--font-display); font-size: 26px; font-weight: 700; margin-top: 10px; color: var(--text-primary);">₹${sub.fee.toLocaleString()} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">/ ${sub.billingCycle.toLowerCase()}</span></h2>
          </div>
          <span class="status-pill status-${sub.status.toLowerCase()}" style="background: rgba(57, 181, 74, 0.15); color: #39b54a; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${sub.status}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 8px; width: 100%;">
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: var(--text-secondary);">Next Invoice Date</span>
            <span style="font-weight: 600; color: var(--text-primary);">${new Date(sub.nextPaymentDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span style="color: var(--text-secondary);">Payment Method</span>
            <span style="font-weight: 600; color: var(--text-primary);">${sub.paymentMethod}</span>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 8px; width: 100%; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="window.manageBillingAction('payment')">💳 Update Card</button>
          <button class="btn" onclick="window.manageBillingAction('plan')">⚙️ Change Plan</button>
          <button class="btn" style="border-color: rgba(220,53,69,0.3); color: var(--color-danger); background: transparent;" onclick="window.manageBillingAction('cancel')">✕ Cancel Plan</button>
        </div>
      </div>

      <!-- Quick Retainer SLA Terms -->
      <div class="glass-card" style="height: fit-content; display: flex; flex-direction: column; gap: 12px;">
        <h3 style="font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--text-primary);">Retainer Services</h3>
        <ul style="font-size: 12.5px; color: var(--text-secondary); padding-left: 20px; display: flex; flex-direction: column; gap: 8px; line-height: 1.4;">
          <li>🛡️ Guaranteed CPL audit compliance checks.</li>
          <li>📊 Dedicated account manager optimizations and bid tweaks.</li>
          <li>📩 Daily lead synchronization checks & alerts.</li>
        </ul>
        <div class="mock-info-box" style="margin: 0; background: rgba(57, 181, 74, 0.05); border-color: rgba(57, 181, 74, 0.2); color: #39b54a; font-size: 11.5px; padding: 10px; border-radius: 6px;">
          ✔️ Auto-renewal is enabled. Your next payment will be processed automatically on your billing date.
        </div>
      </div>
    </div>

    <!-- Invoice Table Card -->
    <div class="glass-card" style="display: flex; flex-direction: column; gap: 16px;">
      <h3 style="font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text-primary);">Invoice History</h3>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-weight: 600;">
              <th style="padding: 12px 8px;">Invoice ID</th>
              <th style="padding: 12px 8px;">Date</th>
              <th style="padding: 12px 8px;">Amount</th>
              <th style="padding: 12px 8px;">Status</th>
              <th style="padding: 12px 8px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${sub.invoices.map(inv => `
              <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-primary);">
                <td style="padding: 12px 8px; font-weight: 600;">${inv.id}</td>
                <td style="padding: 12px 8px; color: var(--text-secondary);">${inv.date}</td>
                <td style="padding: 12px 8px; font-weight: 600;">₹${inv.amount.toLocaleString()}</td>
                <td style="padding: 12px 8px;"><span style="background: rgba(57, 181, 74, 0.15); color: #39b54a; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">${inv.status}</span></td>
                <td style="padding: 12px 8px; text-align: right;">
                  <button class="btn" style="padding: 4px 8px; font-size: 11px;" onclick="window.downloadInvoice('${inv.id}')">Download PDF</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Global Billing Handlers
window.manageBillingAction = (action) => {
  if (action === 'payment') {
    showToast('Payment Update', 'Redirecting to secure gateway to update payment details...', 'info');
  } else if (action === 'plan') {
    showToast('Change Plan', 'Loading premium agency packages. Your AM will contact you.', 'info');
  } else {
    showToast('Subscription Cancelled', 'Cancel request received. Your AM will contact you within 24 hours.', 'warning');
  }
};

window.downloadInvoice = (invId) => {
  showToast('Downloading Invoice', `Compiling invoice ${invId}. Initiated PDF receipt download...`, 'success');
};
