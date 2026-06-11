import { DEALERSHIPS, ACCOUNT_MANAGERS } from './data.js';

// State Management
let appState = {
  currentUser: null,
  currentLocationId: null,
  currentRole: 'dealer', // 'dealer' or 'am'
  activeChatLocationId: null, // for AM chat panel
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
  initOnboardingEventListeners();
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
      if (session.role === 'am') {
        const am = ACCOUNT_MANAGERS[session.amId];
        if (am) {
          loginAM(am);
          return;
        }
      } else {
        const dealerId = session.dealerId;
        const dealer = DEALERSHIPS[dealerId];
        if (dealer) {
          loginUser(dealer, session.locationId);
          return;
        }
      }
    } catch (e) {
      localStorage.removeItem('cd_ncbd_session');
    }
  }
  showAuthOverlay();
}

function loginUser(dealer, targetLocationId = null) {
  appState.currentUser = dealer;
  appState.currentRole = 'dealer';
  
  document.body.classList.add('user-role-dealer');
  document.body.classList.remove('user-role-am');
  
  // Get first available location if not specified
  const locationIds = Object.keys(dealer.locations);
  appState.currentLocationId = targetLocationId && locationIds.includes(targetLocationId) 
    ? targetLocationId 
    : locationIds[0];
  
  // Save session
  localStorage.setItem('cd_ncbd_session', JSON.stringify({
    role: 'dealer',
    dealerId: Object.keys(DEALERSHIPS).find(key => DEALERSHIPS[key] === dealer),
    locationId: appState.currentLocationId
  }));

  // Hide Auth, Show Main App
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app-view').style.display = 'flex';
  
  // Toggle displays
  document.getElementById('sidebar-dealer-nav').style.display = 'flex';
  document.getElementById('sidebar-am-nav').style.display = 'none';
  document.getElementById('location-switcher').style.display = 'block';

  // Update dealer profile in header
  document.getElementById('user-name-header').textContent = dealer.name;
  document.getElementById('user-role-label').textContent = "Dealership Portal";
  document.getElementById('user-avatar').textContent = dealer.name.split(' ').map(n=>n[0]).join('').substring(0, 2);

  // Clone location specific data to state
  const locData = dealer.locations[appState.currentLocationId];
  appState.tickets = [...(locData.tickets || [])];
  appState.messages = [...(locData.messages || [])];
  appState.notifications = [...(locData.notifications || [
    { id: Date.now(), title: 'Welcome aboard!', text: `${locData.name} campaign is live. Track metrics daily.`, date: locData.startDate, read: false }
  ])];

  initAppDashboard();
  checkOnboardingState();
  showToast('Logged In Successfully', `Welcome to ${dealer.name}`);
}

function loginAM(am) {
  appState.currentUser = am;
  appState.currentRole = 'am';
  
  document.body.classList.add('user-role-am');
  document.body.classList.remove('user-role-dealer');
  
  // Save session
  localStorage.setItem('cd_ncbd_session', JSON.stringify({
    role: 'am',
    amId: am.id
  }));

  // Hide Auth, Show Main App
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app-view').style.display = 'flex';
  
  // Toggle displays
  document.getElementById('sidebar-dealer-nav').style.display = 'none';
  document.getElementById('sidebar-am-nav').style.display = 'flex';
  document.getElementById('location-switcher').style.display = 'none';

  // Update profile in header
  document.getElementById('user-name-header').textContent = am.name;
  document.getElementById('user-role-label').textContent = "Account Manager Console";
  document.getElementById('user-avatar').textContent = am.name.split(' ').map(n=>n[0]).join('').substring(0, 2);

  // Bind nav-items click handlers for AM sidebar
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.onclick = () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    };
  });

  // Navigate to default tab
  switchTab('am-showrooms');
  
  // Show AM notifications
  appState.notifications = am.notifications || [];
  updateNotificationsUI();
  
  // Bind send handlers for AM chat
  document.getElementById('am-chat-send-btn').onclick = sendAMChatMessage;
  document.getElementById('am-chat-input-field').onkeydown = (e) => {
    if (e.key === 'Enter') sendAMChatMessage();
  };

  // Bind AM clear-notifications handler
  document.getElementById('clear-notif-btn').onclick = () => {
    appState.notifications = [];
    if (appState.currentUser) {
      appState.currentUser.notifications = [];
    }
    updateNotificationsUI();
    showToast('Notifications Cleared', 'In-app notification logs cleared.');
  };
  
  showToast('Logged In Successfully', `Welcome, ${am.name}`);
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
    const matchedAMKey = Object.keys(ACCOUNT_MANAGERS).find(key => ACCOUNT_MANAGERS[key].phone === phoneVal);
    
    if (matchedKey) {
      // Transition to OTP view
      showOtpView(phoneVal);
      // Auto populate code check helper
      setTimeout(() => {
        const dealer = DEALERSHIPS[matchedKey];
        otpInputs.forEach((input, idx) => input.value = dealer.otp[idx]);
        otpInputs[5].focus();
        showToast('OTP Simulated', `Code sent to ${phoneVal}. Autopopulated code: ${dealer.otp}`);
      }, 800);
    } else if (matchedAMKey) {
      // Transition to OTP view
      showOtpView(phoneVal);
      // Auto populate code check helper
      setTimeout(() => {
        const am = ACCOUNT_MANAGERS[matchedAMKey];
        otpInputs.forEach((input, idx) => input.value = am.otp[idx]);
        otpInputs[5].focus();
        showToast('OTP Simulated', `Code sent to AM ${phoneVal}. Autopopulated code: ${am.otp}`);
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
    const matchedAMKey = Object.keys(ACCOUNT_MANAGERS).find(key => ACCOUNT_MANAGERS[key].phone === phoneVal);
    
    if (matchedKey && DEALERSHIPS[matchedKey].otp === codeStr) {
      loginUser(DEALERSHIPS[matchedKey]);
    } else if (matchedAMKey && ACCOUNT_MANAGERS[matchedAMKey].otp === codeStr) {
      loginAM(ACCOUNT_MANAGERS[matchedAMKey]);
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
    document.getElementById('user-name-header').textContent = appState.currentUser.name;
    document.getElementById('user-avatar').textContent = appState.currentUser.name.split(' ').map(n=>n[0]).join('').substring(0, 2);

    // Save session change
    localStorage.setItem('cd_ncbd_session', JSON.stringify({
      role: 'dealer',
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
    checkOnboardingState();
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
  
  const onboardingView = document.getElementById('onboarding-view');
  if (onboardingView) {
    onboardingView.style.display = 'none';
  }
  
  panes.forEach(pane => {
    pane.classList.remove('active');
    pane.style.display = 'none';
  });
  navItems.forEach(item => item.classList.remove('active'));

  const activePane = document.getElementById(`tab-${tabId}`);
  const activeNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  
  if (activePane && activeNavItem) {
    activePane.classList.add('active');
    const isFlex = tabId === 'logs' || tabId === 'dashboard' || tabId === 'reports' || tabId === 'billing' || tabId === 'am-showrooms' || tabId === 'am-chat' || tabId === 'am-tickets';
    activePane.style.display = isFlex ? 'flex' : 'grid';
    activeNavItem.classList.add('active');
    
    // Draw charts if tab is dashboard
    if (tabId === 'dashboard') {
      setTimeout(redrawCharts, 50);
    } else if (tabId === 'am-showrooms') {
      renderAMOverview();
    } else if (tabId === 'am-chat') {
      renderAMChat();
    } else if (tabId === 'am-tickets') {
      renderAMTickets();
    }
  }
  if (appState.currentRole === 'dealer') {
    checkOnboardingState();
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
  if (loc.status !== 'Active' || (loc.id === 'ghaziabad' && loc.dailyData.length <= 4)) {
    container.innerHTML = `<div class="no-logs-msg" style="padding: 24px; grid-column: span 3; text-align: center; width: 100%;">No monthly reports available yet. First performance digest will generate at the end of the billing cycle.</div>`;
    return;
  }
  
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
      if (appState.currentRole === 'am') {
        appState.currentUser.notifications = appState.notifications;
      } else {
        const loc = appState.currentUser.locations[appState.currentLocationId];
        if (loc) {
          loc.notifications = appState.notifications;
        }
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

// ==========================================
// 13. ACCOUNT MANAGER CONTROLLERS & VIEWS
// ==========================================
function getAMShowrooms() {
  if (!appState.currentUser || appState.currentRole !== 'am') return [];
  const showrooms = [];
  appState.currentUser.assignedDealers.forEach(dealerKey => {
    const dealer = DEALERSHIPS[dealerKey];
    if (dealer) {
      Object.keys(dealer.locations).forEach(locId => {
        showrooms.push({
          dealerKey,
          dealerName: dealer.name,
          locId,
          ...dealer.locations[locId]
        });
      });
    }
  });
  return showrooms;
}

function renderAMOverview() {
  const container = document.getElementById('tab-am-showrooms');
  if (!container) return;

  const showrooms = getAMShowrooms();
  
  if (showrooms.length === 0) {
    container.innerHTML = `
      <div class="page-title-section">
        <div>
          <h1 class="page-title">Assigned Showrooms</h1>
          <p class="page-subtitle">Consolidated view of all active dealerships assigned to you.</p>
        </div>
      </div>
      <div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-muted);">
        No showrooms assigned to your account.
      </div>
    `;
    return;
  }

  let rowsHtml = showrooms.map(showroom => {
    if (showroom.status !== 'Active') {
      let statusBadge = '';
      let actionBtn = '';
      
      if (showroom.status === 'Pending Ads Connection') {
        statusBadge = `<span class="status-pill" style="background: rgba(108, 117, 125, 0.15); color: var(--text-muted); font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">Connection Pending</span>`;
        actionBtn = `<span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">Waiting for Dealer</span>`;
      } else if (showroom.status === 'Pending Audit') {
        statusBadge = `<span class="status-pill status-danger" style="background: rgba(220, 53, 69, 0.15); color: var(--color-danger); font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">Audit Required</span>`;
        actionBtn = `<button class="btn btn-primary" style="padding: 6px 10px; font-size: 11.5px;" onclick="window.showAuditModal('${showroom.dealerKey}', '${showroom.locId}')">🔍 Run Audit</button>`;
      } else if (showroom.status === 'Pending Retainer') {
        statusBadge = `<span class="status-pill" style="background: rgba(255, 193, 7, 0.15); color: var(--color-warning); font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">Audit Shared</span>`;
        actionBtn = `<span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">Waiting for Payment</span>`;
      } else if (showroom.status === 'Pending Goals') {
        statusBadge = `<span class="status-pill" style="background: rgba(13, 202, 240, 0.15); color: var(--accent-cyan); font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">Goal Intake</span>`;
        actionBtn = `<span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">Waiting for Goals</span>`;
      } else if (showroom.status === 'Pending Activation') {
        statusBadge = `<span class="status-pill" style="background: rgba(145, 80, 200, 0.15); color: var(--accent-purple); font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">Activation Ready</span>`;
        actionBtn = `<button class="btn btn-primary" style="padding: 6px 10px; font-size: 11.5px; background: var(--accent-purple); border-color: var(--accent-purple);" onclick="window.showActivationModal('${showroom.dealerKey}', '${showroom.locId}')">⚡ Activate Campaign</button>`;
      }

      return `
        <tr style="border-bottom: 1px solid var(--border-color); vertical-align: middle; background: rgba(255, 255, 255, 0.01);">
          <td style="padding: 16px 12px;">
            <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${showroom.dealerName}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${showroom.name}</div>
          </td>
          <td style="padding: 16px 12px; max-width: 200px;">
            <div style="font-weight: 600; font-size: 12.5px; color: var(--text-muted); font-style: italic;">Onboarding In-progress</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.3;">${showroom.objective}</div>
          </td>
          <td style="padding: 16px 12px;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="font-size: 13px; font-weight: 700;">-</div>
              ${statusBadge}
            </div>
          </td>
          <td style="padding: 16px 12px;">
            <span style="font-size: 12.5px; color: var(--text-muted); font-style: italic;">Pending Setup</span>
          </td>
          <td style="padding: 16px 12px; text-align: center;">
            <span style="font-size: 12.5px; color: var(--text-muted);">-</span>
          </td>
          <td style="padding: 16px 12px; text-align: right;">
            <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
              ${actionBtn}
              <button class="btn" style="padding: 6px 10px; font-size: 11.5px;" onclick="window.selectShowroomChat('${showroom.dealerKey}', '${showroom.locId}')">💬 Chat</button>
            </div>
          </td>
        </tr>
      `;
    }

    // Calculate CPL & metrics
    const filteredData = showroom.dailyData.filter(d => new Date(d.date) >= new Date("2026-05-01"));
    const spend = filteredData.reduce((sum, d) => sum + d.spend, 0);
    const leads = filteredData.reduce((sum, d) => sum + d.leads, 0);
    const currentCPL = leads > 0 ? Math.round(spend / leads) : 0;
    
    const onTrack = currentCPL <= showroom.committedCPL;
    const cplStatusText = onTrack ? 'On Track' : 'Above Target';
    
    // Tickets
    const openTicketsCount = (showroom.tickets || []).filter(t => t.status === 'Open' || t.status === 'In Review').length;
    
    // Budget
    const cycleStart = new Date("2026-04-25");
    const cycleEnd = new Date("2026-05-25");
    const cycleData = showroom.dailyData.filter(d => {
      const dDate = new Date(d.date);
      return dDate >= cycleStart && dDate <= cycleEnd;
    });
    const cycleSpent = cycleData.reduce((sum, d) => sum + d.spend, 0);
    const spentPct = Math.min(100, Math.round((cycleSpent / showroom.totalBudget) * 100));
    
    return `
      <tr style="border-bottom: 1px solid var(--border-color); vertical-align: middle;">
        <td style="padding: 16px 12px;">
          <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${showroom.dealerName}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${showroom.name}</div>
        </td>
        <td style="padding: 16px 12px; max-width: 200px;">
          <div style="font-weight: 600; font-size: 12.5px; color: var(--text-primary);">${showroom.campaignName}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.3;">${showroom.objective}</div>
        </td>
        <td style="padding: 16px 12px;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="font-size: 13px; font-weight: 700;">₹${currentCPL.toLocaleString()} <span style="font-size: 11px; font-weight: 400; color: var(--text-muted);">CPL</span></div>
            <div style="font-size: 11px; color: var(--text-secondary);">Target: ₹${showroom.committedCPL}</div>
            <span class="status-pill ${onTrack ? 'status-active' : 'status-danger'}" style="width: fit-content; padding: 2px 6px; font-size: 10px; border-radius: 4px; font-weight: 700; text-transform: uppercase; background: ${onTrack ? 'rgba(57, 181, 74, 0.15)' : 'rgba(220, 53, 69, 0.15)'}; color: ${onTrack ? '#39b54a' : 'var(--color-danger)'};">
              ${cplStatusText}
            </span>
          </div>
        </td>
        <td style="padding: 16px 12px;">
          <div style="display: flex; flex-direction: column; gap: 6px; min-width: 120px;">
            <div class="progress-bar-bg" style="height: 6px; width: 100%; margin: 0; background: var(--bg-card-hover); border-radius: 3px; overflow: hidden;">
              <div class="progress-bar-fill" style="width: ${spentPct}%; background: ${spentPct > 100 ? 'var(--color-danger)' : 'var(--accent-cyan)'}; box-shadow: none; height: 100%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-muted);">
              <span>₹${cycleSpent.toLocaleString()} spent</span>
              <span>${spentPct}%</span>
            </div>
          </div>
        </td>
        <td style="padding: 16px 12px; text-align: center;">
          <span class="status-pill" style="background: ${openTicketsCount > 0 ? 'rgba(255, 193, 7, 0.15)' : 'rgba(57, 181, 74, 0.15)'}; color: ${openTicketsCount > 0 ? 'var(--color-warning)' : '#39b54a'}; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px;">
            ${openTicketsCount} Open
          </span>
        </td>
        <td style="padding: 16px 12px; text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn btn-primary" style="padding: 6px 10px; font-size: 11.5px;" onclick="window.selectShowroomChat('${showroom.dealerKey}', '${showroom.locId}')">💬 Chat</button>
            <button class="btn" style="padding: 6px 10px; font-size: 11.5px;" onclick="switchTab('am-tickets')">🎫 Tickets</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="page-title-section">
      <div>
        <h1 class="page-title">Assigned Showrooms Tracker</h1>
        <p class="page-subtitle">Consolidated live tracker for campaign metrics, budgets, and status of dealerships assigned to ${appState.currentUser.name}.</p>
      </div>
    </div>
    
    <div class="glass-card" style="padding: 0; overflow-x: auto; width: 100%;">
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-weight: 600; background: rgba(0, 0, 0, 0.02);">
            <th style="padding: 12px 12px;">Showroom / Dealer</th>
            <th style="padding: 12px 12px;">Active Campaign & Objective</th>
            <th style="padding: 12px 12px;">Goal Status</th>
            <th style="padding: 12px 12px;">Budget Pacing</th>
            <th style="padding: 12px 12px; text-align: center;">Support Tickets</th>
            <th style="padding: 12px 12px; text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

function renderAMChat() {
  const channelsList = document.getElementById('am-chat-channels-list');
  if (!channelsList) return;

  const showrooms = getAMShowrooms();
  channelsList.innerHTML = '';

  showrooms.forEach(showroom => {
    const channelId = `${showroom.dealerKey}_${showroom.locId}`;
    const isActive = appState.activeChatLocationId === channelId;
    
    const lastMsg = showroom.messages && showroom.messages.length > 0 
      ? showroom.messages[showroom.messages.length - 1] 
      : null;
    const snippet = lastMsg ? (lastMsg.text.length > 30 ? lastMsg.text.substring(0, 30) + '...' : lastMsg.text) : "No messages yet";
    const timeStr = lastMsg ? new Date(lastMsg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
    
    // Badge logic: Action Required if last sender was 'dealer'
    const needsAction = lastMsg && lastMsg.sender === 'dealer';
    const statusBadge = needsAction
      ? `<span class="status-pill status-danger" style="font-size: 9px; padding: 2px 4px; border-radius: 4px; font-weight: 700; margin-left: auto; background: rgba(220, 53, 69, 0.15); color: var(--color-danger);">⚠️ Action</span>`
      : `<span class="status-pill status-paid" style="font-size: 9px; padding: 2px 4px; border-radius: 4px; font-weight: 700; margin-left: auto; background: rgba(57, 181, 74, 0.15); color: #39b54a;">✔️ Closed</span>`;

    const item = document.createElement('div');
    item.className = `am-channel-item ${isActive ? 'active' : ''}`;
    item.style.padding = '12px';
    item.style.borderRadius = '8px';
    item.style.cursor = 'pointer';
    item.style.background = isActive ? 'rgba(13, 202, 240, 0.08)' : 'rgba(255, 255, 255, 0.02)';
    item.style.border = isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.gap = '4px';
    item.style.transition = 'all 0.2s';
    
    item.onclick = () => {
      appState.activeChatLocationId = channelId;
      renderAMChat();
    };

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${showroom.dealerName}</span>
        <span style="font-size: 10px; color: var(--text-muted);">${timeStr}</span>
      </div>
      <div style="font-size: 11px; color: var(--text-secondary);">${showroom.name}</div>
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 4px;">
        <span style="font-size: 11px; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 150px;">${snippet}</span>
        ${statusBadge}
      </div>
    `;
    channelsList.appendChild(item);
  });

  // Active chat conversation pane
  const inactiveMsg = document.getElementById('am-chat-inactive-msg');
  const chatTitle = document.getElementById('am-chat-active-title');
  const messagesContainer = document.getElementById('am-chat-messages-container');

  if (!appState.activeChatLocationId) {
    inactiveMsg.style.display = 'flex';
    messagesContainer.innerHTML = '';
    chatTitle.textContent = "Select a Chat Room";
  } else {
    inactiveMsg.style.display = 'none';
    const [dKey, locId] = appState.activeChatLocationId.split('_');
    const dealer = DEALERSHIPS[dKey];
    const showroom = dealer ? dealer.locations[locId] : null;

    if (showroom) {
      chatTitle.textContent = `Chatting with ${dealer.name} - ${showroom.name}`;
      messagesContainer.innerHTML = '';

      if (!showroom.messages || showroom.messages.length === 0) {
        messagesContainer.innerHTML = `<div class="no-logs-msg" style="padding: 24px;">No messages in this chat room.</div>`;
      } else {
        showroom.messages.forEach(msg => {
          const el = document.createElement('div');
          el.className = `chat-message ${msg.sender}`;
          
          const timeStr = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          el.innerHTML = `
            <div>${msg.text}</div>
            <span class="message-time">${timeStr}</span>
          `;
          messagesContainer.appendChild(el);
        });

        // Auto scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }
}

function sendAMChatMessage() {
  const input = document.getElementById('am-chat-input-field');
  const txt = input.value.trim();
  if (!txt || !appState.activeChatLocationId) return;

  const [dKey, locId] = appState.activeChatLocationId.split('_');
  const dealer = DEALERSHIPS[dKey];
  const showroom = dealer ? dealer.locations[locId] : null;

  if (showroom) {
    const newMsg = {
      sender: 'am',
      text: txt,
      time: new Date().toISOString()
    };

    if (!showroom.messages) showroom.messages = [];
    showroom.messages.push(newMsg);
    
    renderAMChat();
    input.value = '';
    showToast('Message Sent', 'Your reply has been sent.');
  }
}

function renderAMTickets() {
  const container = document.getElementById('am-tickets-list');
  if (!container) return;
  container.innerHTML = '';

  const showrooms = getAMShowrooms();
  let allTickets = [];

  showrooms.forEach(showroom => {
    if (showroom.tickets && showroom.tickets.length > 0) {
      showroom.tickets.forEach(tkt => {
        allTickets.push({
          ...tkt,
          dealerKey: showroom.dealerKey,
          locId: showroom.locId,
          showroomName: showroom.name,
          dealerName: showroom.dealerName
        });
      });
    }
  });

  // Sort: Open and In Review first, then Resolved, then by date descending
  allTickets.sort((a, b) => {
    const statusOrder = { 'Open': 1, 'In Review': 2, 'Resolved': 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.date) - new Date(a.date);
  });

  if (allTickets.length === 0) {
    container.innerHTML = `<div class="no-logs-msg" style="padding: 24px;">No support tickets registered across your assigned showrooms.</div>`;
    return;
  }

  allTickets.forEach((tkt, idx) => {
    const item = document.createElement('div');
    item.className = 'ticket-item glass-card';
    
    let historyHtml = tkt.history.map(h => `
      <div style="display: flex; gap: 8px; font-size: 11px; margin-top: 4px; color: var(--text-muted);">
        <span>•</span>
        <span><strong>[${h.date}] ${h.status}</strong>: ${h.note}</span>
      </div>
    `).join('');

    let actionBtn = '';
    if (tkt.status === 'Open') {
      actionBtn = `<button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="window.advanceAMTicket('${tkt.dealerKey}', '${tkt.locId}', '${tkt.id}', 'In Review')">⚙️ Move to In Review</button>`;
    } else if (tkt.status === 'In Review') {
      actionBtn = `<button class="btn btn-success" style="padding: 6px 12px; font-size: 12px; background: #39b54a; border-color: #39b54a; color: white;" onclick="window.advanceAMTicket('${tkt.dealerKey}', '${tkt.locId}', '${tkt.id}', 'Resolved')">✔️ Resolve Ticket</button>`;
    } else {
      actionBtn = `<span style="font-size: 12px; font-weight: 700; color: #39b54a;">✔️ Resolved</span>`;
    }

    item.innerHTML = `
      <div class="ticket-header">
        <span class="ticket-id">${tkt.id}</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 11px; background: HSLA(222, 10%, 20%, 0.5); padding: 2px 6px; border-radius: 4px;">Priority: ${tkt.priority}</span>
          <span class="ticket-status ${tkt.status.replace(' ', '-')}">${tkt.status}</span>
        </div>
      </div>
      <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">Showroom: ${tkt.dealerName} - ${tkt.showroomName}</div>
      <div class="ticket-subject" style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">${tkt.subject}</div>
      <div class="ticket-desc" style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">${tkt.description}</div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 8px; flex-wrap: wrap; gap: 10px;">
        <div style="font-size: 11px; color: var(--text-muted);">
          <span>Created: ${tkt.date}</span>
          <button class="ticket-history-btn" style="background: none; border: none; color: var(--accent-cyan); cursor: pointer; margin-left: 10px;" onclick="window.toggleTicketHistory(${idx})">Activity Logs</button>
        </div>
        <div>
          ${actionBtn}
        </div>
      </div>
      <div id="tkt-history-${idx}" style="display: none; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Activity Logs</span>
        ${historyHtml}
      </div>
    `;
    container.appendChild(item);
  });
}

window.advanceAMTicket = (dKey, locId, tktId, newStatus) => {
  const dealer = DEALERSHIPS[dKey];
  const showroom = dealer ? dealer.locations[locId] : null;
  if (!showroom) return;

  const tkt = (showroom.tickets || []).find(t => t.id === tktId);
  if (!tkt) return;

  const oldStatus = tkt.status;
  tkt.status = newStatus;
  tkt.history.push({
    date: new Date().toISOString().split('T')[0],
    status: newStatus,
    note: `Status updated to ${newStatus} by Account Manager ${appState.currentUser.name}.`
  });

  renderAMTickets();
  renderAMOverview(); // Refresh overview counts
  showToast('Ticket Updated', `${tktId} status moved from ${oldStatus} ➔ ${newStatus}`);
};

window.selectShowroomChat = (dealerKey, locId) => {
  appState.activeChatLocationId = `${dealerKey}_${locId}`;
  switchTab('am-chat');
};

// ==========================================
// 14. END-TO-END ONBOARDING AND ACTIVATION LOGIC
// ==========================================
function checkOnboardingState() {
  if (appState.currentRole !== 'dealer' || !appState.currentUser) {
    const onboardingView = document.getElementById('onboarding-view');
    if (onboardingView) onboardingView.style.display = 'none';
    
    // Remove disabled class from sidebar nav
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.style.pointerEvents = 'auto';
      item.style.opacity = '1';
    });
    return;
  }

  const locData = appState.currentUser.locations[appState.currentLocationId];
  if (!locData) return;

  const onboardingView = document.getElementById('onboarding-view');
  
  if (locData.status !== 'Active') {
    // Lock sidebar tabs except Dashboard and AM Chat
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      const tab = item.getAttribute('data-tab');
      if (tab !== 'dashboard' && tab !== 'chat') {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.35';
      } else {
        item.style.pointerEvents = 'auto';
        item.style.opacity = '1';
      }
    });

    // Hide standard tab panels
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.style.display = 'none';
      pane.classList.remove('active');
    });

    // Show onboarding card
    if (onboardingView) {
      onboardingView.style.display = 'flex';
      renderOnboardingWizard(locData);
    }
  } else {
    // Unlock everything
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.style.pointerEvents = 'auto';
      item.style.opacity = '1';
    });
    if (onboardingView) onboardingView.style.display = 'none';
  }
}

function renderOnboardingWizard(loc) {
  const container = document.getElementById('onboarding-view');
  if (!container) return;

  let stepsHeaderHtml = `
    <div class="onboarding-steps" style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 20px; margin-bottom: 10px; flex-wrap: wrap; gap: 12px; width: 100%;">
      <div class="step-pill ${loc.status === 'Pending Ads Connection' ? 'active' : 'completed'}" style="display: flex; align-items: center; gap: 8px; font-size: 12.5px;">
        <span class="step-num" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: ${loc.status === 'Pending Ads Connection' ? 'var(--accent-cyan)' : 'var(--color-success)'}; color: white;">1</span>
        <span style="font-weight: 600;">Connect Google Ads</span>
      </div>
      <div class="step-pill ${loc.status === 'Pending Audit' ? 'active' : (loc.status === 'Pending Ads Connection' ? '' : 'completed')}" style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; opacity: ${loc.status === 'Pending Ads Connection' ? '0.5' : '1'};">
        <span class="step-num" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: ${loc.status === 'Pending Audit' ? 'var(--accent-cyan)' : (['Pending Ads Connection', 'Pending Audit'].includes(loc.status) ? 'var(--bg-hover)' : 'var(--color-success)')}; color: ${loc.status === 'Pending Ads Connection' ? 'var(--text-muted)' : 'white'};">2</span>
        <span style="font-weight: 600;">Specialist Audit</span>
      </div>
      <div class="step-pill ${['Pending Retainer', 'Pending Goals', 'Pending Activation'].includes(loc.status) ? 'active' : ''}" style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; opacity: ${['Pending Ads Connection', 'Pending Audit'].includes(loc.status) ? '0.5' : '1'};">
        <span class="step-num" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: ${['Pending Retainer', 'Pending Goals', 'Pending Activation'].includes(loc.status) ? 'var(--accent-cyan)' : 'var(--bg-hover)'}; color: ${['Pending Ads Connection', 'Pending Audit'].includes(loc.status) ? 'var(--text-muted)' : 'white'};">3</span>
        <span style="font-weight: 600;">Retainer & Goals</span>
      </div>
      <div class="step-pill" style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; opacity: 0.5;">
        <span class="step-num" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; background: var(--bg-hover); color: var(--text-muted);">4</span>
        <span style="font-weight: 600;">Campaign Live</span>
      </div>
    </div>
  `;

  let contentHtml = '';

  if (loc.status === 'Pending Ads Connection') {
    contentHtml = `
      <div style="text-align: center; padding: 20px 0; display: flex; flex-direction: column; gap: 16px; align-items: center; width: 100%;">
        <div style="font-size: 48px; margin-bottom: 8px;">🔗</div>
        <h2 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">Link Your Google Ads Account</h2>
        <p style="color: var(--text-secondary); max-width: 500px; font-size: 14px; line-height: 1.5;">
          Welcome to the CarDekho NCBD portal! To begin optimizing your dealership lead campaigns, we first need read-only access to your historical Google Ads data. This allows us to run a campaign audit and identify budget waste.
        </p>
        <button id="connect-ads-btn" class="btn btn-primary" style="padding: 12px 24px; font-size: 14px; font-weight: 600; margin-top: 10px;">🔗 Connect Google Ads Account</button>
        <div class="mock-info-box" style="margin-top: 20px; font-size: 12px; text-align: left; max-width: 500px; border-color: rgba(66, 133, 244, 0.3); background: rgba(66, 133, 244, 0.03); color: var(--text-secondary);">
          ℹ️ <strong>Demo Simulation:</strong> Clicking this button will open a mock Google OAuth popup to grant permissions for Malhotra Hyundai.
        </div>
      </div>
    `;
  } else if (loc.status === 'Pending Audit') {
    contentHtml = `
      <div style="text-align: center; padding: 20px 0; display: flex; flex-direction: column; gap: 16px; align-items: center; width: 100%;">
        <div style="font-size: 48px; margin-bottom: 8px; animation: pulse 2s infinite;">🔍</div>
        <h2 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">Campaign Audit in Progress</h2>
        <p style="color: var(--text-secondary); max-width: 550px; font-size: 14px; line-height: 1.5;">
          Google Ads account linked successfully! Connected account: <strong>malhotramotors.ghz@gmail.com (ID: 482-990-1288)</strong>.
        </p>
        <p style="color: var(--text-muted); max-width: 550px; font-size: 13.5px; line-height: 1.5;">
          Our Campaign Specialist <strong>Rohan Verma</strong> and the NCBD AI Audit tool are auditing your campaign structure, ad groups, negative keywords, and budget pacing. We will generate your report shortly.
        </p>
        <div style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 14px 20px; border-radius: 8px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-secondary); font-weight: 600; max-width: 500px; width: 100%; justify-content: center;">
          <span class="spinner" style="width: 16px; height: 16px; border: 2px solid var(--accent-cyan); border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite;"></span>
          Waiting for account manager to release the audit report...
        </div>
        <div class="mock-info-box" style="margin-top: 10px; font-size: 12px; text-align: left; max-width: 550px;">
          💡 <strong>Demo Guidance:</strong> Log out and log in as the Account Manager Rohan Verma (<code>9999999999</code>) to run the AI audit and push the report to the dealer portal.
        </div>
      </div>
    `;
  } else if (loc.status === 'Pending Retainer') {
    contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 20px; width: 100%;">
        <div style="text-align: center; margin-bottom: 10px;">
          <span style="font-size: 36px;">📈</span>
          <h2 style="font-family: var(--font-display); font-size: 22px; font-weight: 800; margin-top: 8px;">Your Google Ads Audit is Ready!</h2>
          <p style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">Audited on ${new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} by Rohan Verma (AM)</p>
        </div>

        <!-- Audit Findings Card -->
        <div class="glass-card" style="padding: 20px; background: rgba(220, 53, 69, 0.03); border-color: rgba(220, 53, 69, 0.25);">
          <h3 style="font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--color-danger); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>⚠️</span> Critical Account Inefficiencies Discovered
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div style="background: var(--bg-sidebar); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
              <span style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">ESTIMATED SPEND WASTAGE</span>
              <div style="font-size: 22px; font-weight: 800; color: var(--color-warning); margin-top: 4px;">34.2%</div>
              <span style="font-size: 10px; color: var(--text-muted); display: block; margin-top: 2px;">≈ ₹40,800 monthly loss</span>
            </div>
            <div style="background: var(--bg-sidebar); padding: 12px; border-radius: 6px; border: 1px solid var(--border-color);">
              <span style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">CURRENT COST PER LEAD</span>
              <div style="font-size: 22px; font-weight: 800; color: var(--color-danger); margin-top: 4px;">₹680</div>
              <span style="font-size: 10px; color: var(--text-muted); display: block; margin-top: 2px;">NCBD Benchmark: ₹450</span>
            </div>
          </div>

          <div style="font-size: 12.5px; line-height: 1.45; display: flex; flex-direction: column; gap: 10px; color: var(--text-secondary);">
            <div style="padding: 10px; background: var(--bg-sidebar); border-radius: 6px; border-left: 3px solid var(--color-danger);">
              <strong>Broad Match Keyword Bleed:</strong> Ad budget is bleeding on search queries with no purchase intent, such as <i>"used cars Ghaziabad"</i> and <i>"Hyundai job openings"</i>.
            </div>
            <div style="padding: 10px; background: var(--bg-sidebar); border-radius: 6px; border-left: 3px solid var(--color-warning);">
              <strong>Bidding Strategy Inefficiency:</strong> Bidding manually without conversion data capping causes CPC to spike to ₹48 on competitive keywords.
            </div>
          </div>
        </div>

        <!-- Agency Packages Retainer selection -->
        <div>
          <h3 style="font-family: var(--font-display); font-size: 16px; font-weight: 700; margin-bottom: 12px; text-align: center;">Select an Agency Retainer Package to Activate Optimization</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 12px;">
            
            <div class="glass-card package-box" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Standard Plan</span>
              <h4 style="font-size: 18px; font-weight: 700;">₹20,000<span style="font-size: 11px; font-weight:400; color:var(--text-muted);">/mo</span></h4>
              <ul style="font-size: 11.5px; padding-left: 14px; color: var(--text-secondary); line-height: 1.4; flex-grow: 1; display:flex; flex-direction:column; gap:4px;">
                <li>• Weekly bid tuning</li>
                <li>• Basic negative audit</li>
                <li>• SLA: 48-hour tickets</li>
              </ul>
              <button class="btn" style="padding: 8px; width: 100%; font-size:12px; margin-top: 8px;" onclick="window.selectRetainerPlan('Standard Plan', 20000)">Select Standard</button>
            </div>

            <div class="glass-card package-box" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; border-color: var(--accent-cyan); background: rgba(13, 202, 240, 0.03); position: relative; transition: all 0.2s;">
              <span style="position: absolute; top:-10px; right: 10px; background: var(--accent-cyan); color: white; padding: 2px 8px; border-radius: 99px; font-size: 9px; font-weight: 700; text-transform: uppercase;">Recommended</span>
              <span style="font-size: 11px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase;">Premium Plan</span>
              <h4 style="font-size: 18px; font-weight: 700;">₹25,000<span style="font-size: 11px; font-weight:400; color:var(--text-muted);">/mo</span></h4>
              <ul style="font-size: 11.5px; padding-left: 14px; color: var(--text-secondary); line-height: 1.4; flex-grow: 1; display:flex; flex-direction:column; gap:4px;">
                <li>• Daily automated bidding</li>
                <li>• WhatsApp monthly digests</li>
                <li>• SLA: 24-hour response</li>
              </ul>
              <button class="btn btn-primary" style="padding: 8px; width: 100%; font-size:12px; margin-top: 8px;" onclick="window.selectRetainerPlan('Premium Plan', 25000)">Select Premium</button>
            </div>

            <div class="glass-card package-box" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Enterprise Plan</span>
              <h4 style="font-size: 18px; font-weight: 700;">₹35,000<span style="font-size: 11px; font-weight:400; color:var(--text-muted);">/mo</span></h4>
              <ul style="font-size: 11.5px; padding-left: 14px; color: var(--text-secondary); line-height: 1.4; flex-grow: 1; display:flex; flex-direction:column; gap:4px;">
                <li>• Dedicated Lead manager</li>
                <li>• Realtime API CRM sync</li>
                <li>• SLA: 4-hour response</li>
              </ul>
              <button class="btn" style="padding: 8px; width: 100%; font-size:12px; margin-top: 8px;" onclick="window.selectRetainerPlan('Enterprise Plan', 35000)">Select Enterprise</button>
            </div>

          </div>
        </div>
      </div>
    `;
  } else if (loc.status === 'Pending Goals') {
    contentHtml = `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 20px;">
        <div style="text-align: center;">
          <span style="font-size: 36px;">🎯</span>
          <h2 style="font-family: var(--font-display); font-size: 22px; font-weight: 800; margin-top: 8px;">Define Your Campaign Goals</h2>
          <p style="color: var(--text-secondary); font-size: 13.5px; max-width: 500px; margin: 4px auto 0;">
            Retainer payment received! Let's define the campaign constraints so your Account Manager can set up the Google Ads campaigns.
          </p>
        </div>

        <form id="goals-intake-form" class="glass-card" style="display: flex; flex-direction: column; gap: 16px; padding: 24px; background: var(--bg-card); width: 100%;">
          <div class="form-group">
            <label class="form-label" style="font-weight:600;">Primary Campaign Objective</label>
            <select id="goal-objective" class="form-select" style="background: var(--bg-sidebar); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; width: 100%; outline: none; font-size: 13px;">
              <option value="Lead Generation">Capture Premium Leads (Test drive & bookings)</option>
              <option value="Brand Recall">Dealer local radius branding (Max views)</option>
              <option value="Showroom Visits">Drive walk-ins to dealership (Store visits objective)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" style="display: block; margin-bottom: 8px; font-weight:600;">Target Car Models (Select all that apply)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" name="models" value="Creta Facelift" checked> Creta Facelift</label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" name="models" value="Venue" checked> Venue</label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" name="models" value="Verna"> Verna</label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" name="models" value="Tucson"> Tucson</label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" name="models" value="Alcazar"> Alcazar</label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" name="models" value="Ioniq 5"> Ioniq 5 (EV)</label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight:600;">Target Regional Radius (km around Showroom)</label>
            <div style="display: flex; align-items: center; gap: 12px;">
              <input type="range" id="goal-radius" min="5" max="50" value="15" style="flex-grow: 1; accent-color: var(--accent-cyan);" oninput="document.getElementById('radius-val').textContent = this.value + ' km'">
              <span id="radius-val" style="font-weight: 700; font-size: 13px; min-width: 50px;">15 km</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight:600;">Desired Monthly Media Ad Budget (₹)</label>
            <input type="number" id="goal-budget" class="form-input" value="150000" step="10000" min="50000" style="background: var(--bg-sidebar); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; width: 100%; outline: none;" required>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight:600;">Special Instructions / Requirements</label>
            <textarea id="goal-instructions" class="form-textarea" rows="3" placeholder="e.g. Focus search keywords specifically around Creta Facelift automatic variants..." style="background: var(--bg-sidebar); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; width: 100%; outline: none; resize: none; font-family: var(--font-sans);"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="padding: 12px; width: 100%; font-size: 13.5px; font-weight: 600; margin-top: 10px;">Submit Campaign Goals</button>
        </form>
      </div>
    `;
  } else if (loc.status === 'Pending Activation') {
    contentHtml = `
      <div style="text-align: center; padding: 20px 0; display: flex; flex-direction: column; gap: 16px; align-items: center; width: 100%;">
        <div style="font-size: 48px; margin-bottom: 8px; animation: pulse 2s infinite;">🚀</div>
        <h2 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">Campaign Deployment Pending</h2>
        <p style="color: var(--text-secondary); max-width: 550px; font-size: 14px; line-height: 1.5;">
          Retainer Paid and Campaign Goals Submitted successfully!
        </p>
        <div style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 16px 20px; border-radius: 8px; font-size: 13px; text-align: left; max-width: 500px; width: 100%; line-height: 1.6;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">Goals Received:</strong>
          • <strong>Objective:</strong> ${loc.goalObjective || 'Lead Generation'}<br>
          • <strong>Models:</strong> ${(loc.goalModels || []).join(', ')}<br>
          • <strong>Radius:</strong> ${loc.goalRadius || 15} km<br>
          • <strong>Media Budget:</strong> ₹${(loc.goalBudget || 150000).toLocaleString()}/month
        </div>
        <p style="color: var(--text-muted); max-width: 550px; font-size: 13.5px; line-height: 1.5; margin-top: 4px;">
          Your Account Manager <strong>Rohan Verma</strong> is configuring the responsive ad copy assets, extensions, and bidding overrides. You will receive an SMS and email notification the moment the campaign is live.
        </p>
        <div style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 12px 20px; border-radius: 8px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-secondary); font-weight: 600; max-width: 500px; width: 100%; justify-content: center;">
          <span class="spinner" style="width: 16px; height: 16px; border: 2px solid var(--accent-cyan); border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite;"></span>
          Deploying Google Ads Campaign structures...
        </div>
        <div class="mock-info-box" style="margin-top: 10px; font-size: 12px; text-align: left; max-width: 550px;">
          💡 <strong>Demo Guidance:</strong> Log out and log in as Rohan Verma (<code>9999999999</code>) to review the goals and click "Launch Campaign" to unlock the dashboard.
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    ${stepsHeaderHtml}
    <div class="onboarding-wizard-body" style="padding: 10px 0; width: 100%;">
      ${contentHtml}
    </div>
  `;

  // Bind Event listeners for wizard page buttons
  if (loc.status === 'Pending Ads Connection') {
    const connectBtn = document.getElementById('connect-ads-btn');
    if (connectBtn) {
      connectBtn.onclick = () => {
        const oauthDialog = document.getElementById('oauth-dialog');
        oauthDialog.showModal();
      };
    }
  } else if (loc.status === 'Pending Goals') {
    const form = document.getElementById('goals-intake-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        
        const objective = document.getElementById('goal-objective').value;
        const radius = document.getElementById('goal-radius').value;
        const budget = parseInt(document.getElementById('goal-budget').value);
        const instructions = document.getElementById('goal-instructions').value;
        
        const checkedModels = [];
        document.querySelectorAll('input[name="models"]:checked').forEach(cb => {
          checkedModels.push(cb.value);
        });

        // Update state
        loc.status = 'Pending Activation';
        loc.goalObjective = objective;
        loc.goalModels = checkedModels;
        loc.goalRadius = radius;
        loc.goalBudget = budget;
        loc.goalInstructions = instructions;
        loc.campaignName = `NCBD_Hyundai_Ghaziabad_${objective.replace(/\s+/g, '_')}`;

        // Send alert to AM Rohan Verma
        const rohanVerma = ACCOUNT_MANAGERS['rohan_verma'];
        if (rohanVerma) {
          if (!rohanVerma.notifications) rohanVerma.notifications = [];
          rohanVerma.notifications.unshift({
            id: Date.now() + 1,
            title: "Goals Submitted",
            text: `Malhotra Hyundai Ghaziabad submitted goals. Retainer Plan Active. Ready for Campaign activation.`,
            date: new Date().toISOString().split('T')[0],
            read: false
          });
        }

        // Add a notification in Malhotra's list
        loc.notifications.unshift({
          id: Date.now() + 2,
          title: "Goals Submitted Successfully",
          text: "Intake form received. Campaign Setup is now in queue for account manager review.",
          date: new Date().toISOString().split('T')[0],
          read: false
        });

        appState.notifications = [...loc.notifications];

        // Refresh UI
        checkOnboardingState();
        updateNotificationsUI();
        showToast('Goals Submitted', 'Your campaign parameters have been sent to Rohan Verma.');
      };
    }
  }
}

function initOnboardingEventListeners() {
  // OAuth Allow/Deny buttons
  const oauthDialog = document.getElementById('oauth-dialog');
  const oauthAllowBtn = document.getElementById('oauth-allow-btn');
  const oauthDenyBtn = document.getElementById('oauth-deny-btn');
  
  if (oauthAllowBtn) {
    oauthAllowBtn.onclick = () => {
      oauthDialog.close();
      const loc = appState.currentUser ? appState.currentUser.locations[appState.currentLocationId] : null;
      if (loc) {
        loc.status = 'Pending Audit';
        loc.notifications.unshift({
          id: Date.now(),
          title: "Google Ads Account Connected",
          text: "Linked account: malhotramotors.ghz@gmail.com (ID: 482-990-1288). Read-only access granted.",
          date: new Date().toISOString().split('T')[0],
          read: false
        });
        appState.notifications = [...loc.notifications];

        // Push alert to AM Rohan Verma
        const rohan = ACCOUNT_MANAGERS['rohan_verma'];
        if (rohan) {
          if (!rohan.notifications) rohan.notifications = [];
          rohan.notifications.unshift({
            id: Date.now() + 1,
            title: "New Dealer Linked Google Ads",
            text: "Malhotra Hyundai (Ghaziabad) connected Ads. Run campaign audit now.",
            date: new Date().toISOString().split('T')[0],
            read: false
          });
        }
        
        checkOnboardingState();
        updateNotificationsUI();
        showToast('OAuth Access Granted', 'Google Ads account linked successfully. Audit initiated.', 'success');
      }
    };
  }

  if (oauthDenyBtn) {
    oauthDenyBtn.onclick = () => {
      oauthDialog.close();
      showToast('OAuth Cancelled', 'Google Ads account link rejected by user.', 'warning');
    };
  }

  // Payment Form submit
  const paymentForm = document.getElementById('payment-form');
  const paymentDialog = document.getElementById('payment-dialog');
  
  if (paymentForm) {
    paymentForm.onsubmit = (e) => {
      e.preventDefault();
      
      const loc = appState.currentUser ? appState.currentUser.locations[appState.currentLocationId] : null;
      if (loc && appState.selectedPlan) {
        const planName = appState.selectedPlan.name;
        const fee = appState.selectedPlan.fee;
        
        // Setup subscription
        loc.subscription = {
          status: "Active",
          planName: planName,
          fee: fee,
          billingCycle: "Monthly",
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paymentMethod: "Visa ending in 9988",
          invoices: [
            { id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`, date: new Date().toISOString().split('T')[0], amount: fee, status: "Paid" }
          ]
        };

        loc.status = 'Pending Goals';
        loc.notifications.unshift({
          id: Date.now(),
          title: `${planName} Activated`,
          text: `Retainer payment of ₹${fee.toLocaleString()} processed successfully. Setup goals to start!`,
          date: new Date().toISOString().split('T')[0],
          read: false
        });
        
        appState.notifications = [...loc.notifications];

        paymentForm.reset();
        paymentDialog.close();
        
        checkOnboardingState();
        updateNotificationsUI();
        renderBilling();
        showToast('Payment Successful', `${planName} activated. Please set your campaign goals.`);
      }
    };
  }

  // AM AI Audit Share button click handler
  const pushReportBtn = document.getElementById('push-audit-report-btn');
  if (pushReportBtn) {
    pushReportBtn.onclick = () => {
      const target = appState.auditTarget;
      if (!target) return;
      
      const dealer = DEALERSHIPS[target.dealerKey];
      const loc = dealer ? dealer.locations[target.locId] : null;
      
      if (loc) {
        loc.status = 'Pending Retainer';
        
        // Add notifications
        loc.notifications.unshift({
          id: Date.now(),
          title: "AI Campaign Audit Report Ready",
          text: "Rohan Verma shared your Google Ads audit report. Open Dashboard to view wasted spend and select plan.",
          date: new Date().toISOString().split('T')[0],
          read: false
        });
        
        document.getElementById('audit-dialog').close();
        renderAMOverview();
        showToast('Audit Report Shared', `Audit results shared with Malhotra Hyundai. Status moved to Pending Retainer.`);
      }
    };
  }

  // AM Campaign Activation submit handler
  const activateForm = document.getElementById('activate-campaign-form');
  const activateDialog = document.getElementById('activate-campaign-dialog');
  if (activateForm) {
    activateForm.onsubmit = (e) => {
      e.preventDefault();
      
      const target = appState.activationTarget;
      if (!target) return;

      const dealer = DEALERSHIPS[target.dealerKey];
      const loc = dealer ? dealer.locations[target.locId] : null;

      if (loc) {
        const finalName = document.getElementById('final-campaign-name').value.trim();
        const finalCPL = parseInt(document.getElementById('final-committed-cpl').value);

        // Transition location status to Active
        loc.status = 'Active';
        loc.campaignName = finalName;
        loc.committedCPL = finalCPL;
        loc.startDate = new Date().toISOString().split('T')[0];
        loc.totalBudget = loc.goalBudget || 150000;

        // Generate 3 days of historical running data
        loc.dailyData = generateNewDailyData(
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          finalCPL,
          Math.round(loc.totalBudget / 30),
          4
        );

        // Setup optimization log
        loc.optimisations = [
          {
            date: new Date().toISOString().split('T')[0],
            title: "NCBD Auto-Optimisation Campaign Launch",
            action: `Initialized smart campaign in Google Ads. Activated Target CPA bidding at ₹${finalCPL}. Applied local geographic exclusions (within 15km) and SUVs in-market bidding priority.`,
            why: `To launch Malhotra Hyundai Ghaziabad campaigns aligned with their submitted goals to promote Creta and Venue models within budget limits.`,
            result: `Campaign launched successfully. Auto-optimization bids active. Initial impressions recorded.`
          }
        ];

        // Setup messages
        loc.messages = [
          {
            sender: "am",
            text: `Hi Malhotra Hyundai Team! Priyanka/Rohan here. Your Ghaziabad dealership campaigns are now officially LIVE on Google Ads! I've set up Target CPA at ₹${finalCPL} to keep lead costs under control.`,
            time: new Date().toISOString()
          }
        ];

        // Setup notifications
        loc.notifications.unshift({
          id: Date.now(),
          title: "Campaign is LIVE!",
          text: `Your Ghaziabad campaigns are live. Target CPL capped at ₹${finalCPL}. All dashboard tools unlocked.`,
          date: new Date().toISOString().split('T')[0],
          read: false
        });

        // Push alert to AM Rohan Verma notifications
        if (appState.currentUser && appState.currentRole === 'am') {
          if (!appState.currentUser.notifications) appState.currentUser.notifications = [];
          appState.currentUser.notifications.unshift({
            id: Date.now() + 1,
            title: "Campaign Activated",
            text: `Campaign for Malhotra Hyundai Ghaziabad is now LIVE. Status set to Active.`,
            date: new Date().toISOString().split('T')[0],
            read: false
          });
          appState.notifications = [...appState.currentUser.notifications];
          updateNotificationsUI();
        }

        activateForm.reset();
        activateDialog.close();
        
        renderAMOverview();
        showToast('Campaign Launched', 'NCBD optimization activated. Status set to Active.', 'success');
      }
    };
  }
}

window.selectRetainerPlan = (planName, fee) => {
  appState.selectedPlan = { name: planName, fee: fee };
  
  // Update payment modal titles
  document.getElementById('payment-plan-title').textContent = planName;
  document.getElementById('payment-plan-fee').textContent = `₹${fee.toLocaleString()}`;
  document.getElementById('payment-invoice-id').textContent = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;
  document.getElementById('submit-payment-btn').textContent = `Pay Retainer (₹${fee.toLocaleString()})`;
  
  // Show Payment Dialog
  const paymentDialog = document.getElementById('payment-dialog');
  paymentDialog.showModal();
};

window.showAuditModal = (dealerKey, locId) => {
  appState.auditTarget = { dealerKey, locId };
  
  const dialog = document.getElementById('audit-dialog');
  const progressSection = document.getElementById('audit-progress-section');
  const reportPreview = document.getElementById('audit-report-preview');
  const logsBox = document.getElementById('audit-logs-box');
  const progressFill = document.getElementById('audit-progress-fill');
  const progressPercent = document.getElementById('audit-progress-percent');
  const statusLabel = document.getElementById('audit-status-label');

  dialog.showModal();
  progressSection.style.display = 'flex';
  reportPreview.style.display = 'none';
  logsBox.innerHTML = '';
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';
  statusLabel.textContent = 'Connecting to Google Ads API...';

  // Sequence of console logs
  const logs = [
    { time: 300, msg: "Connecting to account Malhotra Hyundai (Client ID: 482-990-1288)..." },
    { time: 800, msg: "✓ Connection established. Downloading search query history (past 90 days)..." },
    { time: 1400, msg: "Analyzing 14,288 keyword matches against CarDekho negative keyword database..." },
    { time: 2000, msg: "⚠️ Alert: Found 34.2% budget wastage in ad group 'Hyundai Creta Ghaziabad Search'." },
    { time: 2500, msg: "Analyzing ad copies. Identified missing structured snippet assets and location mappings." },
    { time: 3100, msg: "Assessing bidding strategy. Target CPA is not configured. CPC averaging ₹48." },
    { time: 3600, msg: "✓ Audit compilation complete. Generating AI optimization recommendations..." }
  ];

  logs.forEach(log => {
    setTimeout(() => {
      const line = document.createElement('div');
      line.textContent = `[${new Date().toLocaleTimeString()}] ${log.msg}`;
      logsBox.appendChild(line);
      logsBox.scrollTop = logsBox.scrollHeight;
    }, log.time);
  });

  // Animate progress bar
  let pct = 0;
  const interval = setInterval(() => {
    pct += 2;
    progressFill.style.width = `${pct}%`;
    progressPercent.textContent = `${pct}%`;
    
    if (pct === 30) statusLabel.textContent = "Downloading Search Term reports...";
    if (pct === 60) statusLabel.textContent = "Scanning ad extension settings...";
    if (pct === 90) statusLabel.textContent = "Formulating optimization plan...";
    
    if (pct >= 100) {
      clearInterval(interval);
      statusLabel.textContent = "Audit Completed Successfully.";
      
      // Delay slightly then show findings
      setTimeout(() => {
        progressSection.style.display = 'none';
        reportPreview.style.display = 'flex';
      }, 500);
    }
  }, 40);
};

window.showActivationModal = (dealerKey, locId) => {
  appState.activationTarget = { dealerKey, locId };
  
  const dealer = DEALERSHIPS[dealerKey];
  const loc = dealer ? dealer.locations[locId] : null;
  if (!loc) return;

  const dialog = document.getElementById('activate-campaign-dialog');
  const summaryBox = document.getElementById('activate-goals-summary');
  
  summaryBox.innerHTML = `
    <div><strong>🏢 Dealership:</strong> ${dealer.name} - ${loc.name}</div>
    <div><strong>🎯 Primary Objective:</strong> ${loc.goalObjective || 'Lead Generation'}</div>
    <div><strong>🚗 Models Target:</strong> ${(loc.goalModels || []).join(', ') || 'Creta Facelift, Venue'}</div>
    <div><strong>📍 Regional Radius:</strong> ${loc.goalRadius || 15} km from showroom</div>
    <div><strong>💰 Media Budget:</strong> ₹${(loc.goalBudget || 150000).toLocaleString()}/month</div>
    <div><strong>📝 Dealer Notes:</strong> <span style="font-style: italic; color: var(--text-secondary);">${loc.goalInstructions || 'None provided'}</span></div>
  `;

  document.getElementById('final-campaign-name').value = `NCBD_${dealer.name.replace(/\s+/g, '')}_${loc.goalObjective?.replace(/\s+/g, '') || 'Search'}`;
  document.getElementById('final-committed-cpl').value = loc.committedCPL || 450;

  dialog.showModal();
};

function generateNewDailyData(startDateStr, committedCPL, targetDailyBudget, totalDays = 4) {
  const dailyData = [];
  const start = new Date(startDateStr);

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    const spend = Math.round(targetDailyBudget * (0.9 + Math.random() * 0.2));
    const clicks = Math.round(spend / (28 + Math.random() * 5));
    const leads = Math.max(1, Math.round(spend / (committedCPL * (0.85 + Math.random() * 0.25))));
    const impressions = Math.round(clicks * (15 + Math.random() * 5));

    dailyData.push({
      date: dateStr,
      impressions,
      clicks,
      spend,
      leads,
      channels: {
        search: { impressions: Math.round(impressions * 0.75), clicks: Math.round(clicks * 0.75), spend: Math.round(spend * 0.75), leads: Math.round(leads * 0.75) },
        display: { impressions: Math.round(impressions * 0.25), clicks: Math.round(clicks * 0.25), spend: Math.round(spend * 0.25), leads: Math.round(leads * 0.25) }
      }
    });
  }
  return dailyData;
}
