// ==========================================
// Cosmic Growth & Developer Mastery App
// Core State & Logic Module
// ==========================================

// --- Curated Milestones Database ---
const MILESTONES_DATABASE = {
  TypeScript: [
    "Strict Mode Configuration Mastered",
    "Advanced Generics & Conditional Types",
    "Mapped Types & Template Literal Types",
    "Declaration Merging & Utility Classes",
    "TSConfig Optimization & Module Resolution"
  ],
  Go: [
    "Goroutines, Channels & Select Patterns",
    "Context Cancellation & Timeout Propagation",
    "HTTP Middleware & REST Handlers from scratch",
    "Reflection, unsafe package & interface internal structures",
    "pprof profiling, benchmarks & gc tuning"
  ],
  Rust: [
    "Ownership, Borrowing & Explicit Lifetimes",
    "Advanced Trait Bounds & Generics",
    "Smart Pointers (Rc, Arc, RefCell, Box)",
    "Declarative & Procedural Macros",
    "Wasm-bindgen compilation & FFI integrations"
  ],
  Python: [
    "Comprehensions, Generators & Iterators",
    "Decorators, Closures & Context Managers",
    "Asyncio concurrency & Threading/Multiprocessing",
    "Metaclasses & Custom Dictionaries/Objects",
    "C-API Extensions, Cython, or Pybind11"
  ],
  "System Design": [
    "Horizontal Scaling, Load Balancing & DNS Routing",
    "Multilevel Caching (Redis/Memcached, CDN)",
    "Sharding, Partitioning & Read-replicas",
    "Message Brokers (Kafka/RabbitMQ) & Event Sourcing",
    "CAP Theorem, Paxos/Raft consensus & ACID/BASE"
  ],
  "C++": [
    "RAII & Smart Pointers (unique, shared, weak)",
    "Move Semantics & Rvalue references",
    "Template Metaprogramming & SFINAE",
    "Memory Alignment, custom Allocators & Cache lines",
    "Multithreading, atomics & Lock-free queues"
  ]
};

// --- Application State ---
let activeDate = ""; // Formatted as YYYY-MM-DD
let activeLanguage = "TypeScript";

// Local storage object models
let motivations = {}; // { "YYYY-MM-DD": "text" }
let tasks = {};       // { "YYYY-MM-DD": [ { id, title, priority, completed } ] }
let mastery = {       // { activeLanguage, milestones: { "lang": [] }, dailyLogs: { "YYYY-MM-DD": { hours, challenges, concept } } }
  activeLanguage: "TypeScript",
  milestones: {},
  dailyLogs: {}
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  // Set active date to today's date in local time
  const today = new Date();
  activeDate = formatDateString(today);
  
  // Load data from LocalStorage
  loadFromLocalStorage();
  
  // Apply current values to UI selectors
  document.getElementById("stack-selector").value = activeLanguage;
  
  // Register Event Listeners
  setupEventListeners();
  
  // Initial Rendering
  renderAll();
  
  // Initialize Lucide Icons
  lucide.createIcons();

  // Register PWA Service Worker
  registerServiceWorker();
  
  // Check online/offline connection status
  updateConnectionStatus();
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
});

// --- Date Utilities ---
function formatDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getLocalDateObject(dateStr) {
  const parts = dateStr.split('-');
  // Year, Month (0-indexed), Day
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function isTodayOrFuture(dateStr) {
  const todayStr = formatDateString(new Date());
  return dateStr >= todayStr;
}

function isPastDate(dateStr) {
  const todayStr = formatDateString(new Date());
  return dateStr < todayStr;
}

// --- Data Synchronization (LocalStorage) ---
function loadFromLocalStorage() {
  try {
    motivations = JSON.parse(localStorage.getItem("cosmic_motivation_data")) || {};
    tasks = JSON.parse(localStorage.getItem("cosmic_tasks_data")) || {};
    
    const savedMastery = localStorage.getItem("cosmic_language_mastery");
    if (savedMastery) {
      mastery = JSON.parse(savedMastery);
      if (!mastery.milestones) mastery.milestones = {};
      if (!mastery.dailyLogs) mastery.dailyLogs = {};
      activeLanguage = mastery.activeLanguage || "TypeScript";
    } else {
      // Default initialization
      mastery = {
        activeLanguage: "TypeScript",
        milestones: {},
        dailyLogs: {}
      };
      activeLanguage = "TypeScript";
    }
  } catch (e) {
    console.error("Error loading from localStorage", e);
    showToast("Error loading stored data. Using default state.", "error");
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem("cosmic_motivation_data", JSON.stringify(motivations));
    localStorage.setItem("cosmic_tasks_data", JSON.stringify(tasks));
    
    // Always keep activeLanguage updated in mastery object before saving
    mastery.activeLanguage = activeLanguage;
    localStorage.setItem("cosmic_language_mastery", JSON.stringify(mastery));
    
    // Re-render XP since data changes alter XP yields
    renderXPAndRanks();
    
    // Re-render heatmap since task completion/logs change contribution shades
    renderHeatmap();
  } catch (e) {
    console.error("Error saving to localStorage", e);
    showToast("Storage quota full. Changes might not persist.", "error");
  }
}

// --- Dynamic XP & Developer Rank Calculator ---
// Action weights:
// - Ivy Lee Task Completed: +15 XP
// - Focus Intention written: +20 XP
// - Milestone checked: +50 XP
// - Daily Study Log hours: +10 XP per hour
// - Daily Study Log challenges: +10 XP per problem
function calculateTotalXP() {
  let xp = 0;
  
  // 1. Tasks Completion XP
  Object.values(tasks).forEach(dayTasks => {
    if (Array.isArray(dayTasks)) {
      dayTasks.forEach(task => {
        if (task.completed) {
          xp += 15;
        }
      });
    }
  });
  
  // 2. Daily Motivation Intentions XP
  Object.entries(motivations).forEach(([date, text]) => {
    if (text && text.trim().length > 0) {
      xp += 20;
    }
  });
  
  // 3. Milestones XP
  if (mastery.milestones) {
    Object.values(mastery.milestones).forEach(list => {
      if (Array.isArray(list)) {
        xp += list.length * 50;
      }
    });
  }
  
  // 4. Study Logs XP
  if (mastery.dailyLogs) {
    Object.values(mastery.dailyLogs).forEach(log => {
      if (log) {
        const hours = parseFloat(log.hours) || 0;
        const challenges = parseInt(log.challenges) || 0;
        xp += (hours * 10) + (challenges * 10);
      }
    });
  }
  
  return Math.round(xp);
}

const DEV_RANKS = [
  { minXP: 0, title: "Sandbox Intern", level: 1 },
  { minXP: 101, title: "Junior Synthesizer", level: 2 },
  { minXP: 301, title: "Full Stack Artisan", level: 3 },
  { minXP: 601, title: "System Architect", level: 4 },
  { minXP: 1001, title: "Kernel Sage", level: 5 }
];

function getDevRank(xp) {
  for (let i = DEV_RANKS.length - 1; i >= 0; i--) {
    if (xp >= DEV_RANKS[i].minXP) {
      const currentRank = DEV_RANKS[i];
      const nextRank = DEV_RANKS[i + 1] || null;
      return { currentRank, nextRank };
    }
  }
  return { currentRank: DEV_RANKS[0], nextRank: DEV_RANKS[1] };
}

// --- Render Operations ---
function renderAll() {
  renderActiveDate();
  renderMotivation();
  renderTasks();
  renderMastery();
  renderXPAndRanks();
  renderHeatmap();
}

function renderActiveDate() {
  const activeDateLabel = document.getElementById("active-date-label");
  const localDate = getLocalDateObject(activeDate);
  
  // Options for display
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  let dateText = localDate.toLocaleDateString('en-US', options);
  
  const todayStr = formatDateString(new Date());
  if (activeDate === todayStr) {
    dateText = `Today: ${dateText}`;
  }
  activeDateLabel.innerText = dateText;
  
  // Disable next-day traversal into the future to preserve serialization rules
  const btnNext = document.getElementById("btn-next-day");
  if (activeDate >= todayStr) {
    btnNext.classList.add("opacity-30", "pointer-events-none");
  } else {
    btnNext.classList.remove("opacity-30", "pointer-events-none");
  }
  
  // Check and display past lock notifications
  const motivationLock = document.getElementById("motivation-lock-badge");
  const textarea = document.getElementById("motivation-input");
  const saveMotButton = document.getElementById("btn-save-motivation");
  
  const masteryLock = document.getElementById("mastery-lock-badge");
  const logForm = document.getElementById("study-log-form");
  const formElements = logForm.querySelectorAll("input, textarea, button");
  const btnAdd = document.getElementById("btn-add-task");
  const taskTitle = document.getElementById("task-title-input");
  const taskPriority = document.getElementById("task-priority-select");
  
  if (isPastDate(activeDate)) {
    // Past Lock Enabled
    motivationLock.classList.remove("hidden");
    textarea.setAttribute("readonly", "true");
    textarea.classList.add("locked-field");
    saveMotButton.classList.add("hidden");
    
    masteryLock.classList.remove("hidden");
    formElements.forEach(el => el.setAttribute("disabled", "true"));
    logForm.classList.add("locked-field");
    
    // Lock task entry form
    btnAdd.setAttribute("disabled", "true");
    btnAdd.classList.add("opacity-40", "cursor-not-allowed");
    taskTitle.setAttribute("disabled", "true");
    taskPriority.setAttribute("disabled", "true");
  } else {
    // Active Day Editable
    motivationLock.classList.add("hidden");
    textarea.removeAttribute("readonly");
    textarea.classList.remove("locked-field");
    saveMotButton.classList.remove("hidden");
    
    masteryLock.classList.add("hidden");
    formElements.forEach(el => el.removeAttribute("disabled"));
    logForm.classList.remove("locked-field");
    
    btnAdd.removeAttribute("disabled");
    btnAdd.classList.remove("opacity-40", "cursor-not-allowed");
    taskTitle.removeAttribute("disabled");
    taskPriority.removeAttribute("disabled");
  }
}

function renderMotivation() {
  const input = document.getElementById("motivation-input");
  const savedText = motivations[activeDate] || "";
  input.value = savedText;
  
  const status = document.getElementById("motivation-status");
  if (savedText) {
    status.innerHTML = `<i data-lucide="check-check" class="w-3.5 h-3.5 text-emerald-400"></i> Intention saved`;
  } else {
    status.innerHTML = `<i data-lucide="info" class="w-3.5 h-3.5 text-slate-500"></i> Intention pending`;
  }
  lucide.createIcons({ attrs: { class: ["inline", "w-3.5", "h-3.5"] } });
}

function renderTasks() {
  const container = document.getElementById("task-list-container");
  const dayTasks = tasks[activeDate] || [];
  
  // Sort tasks: Priority 1 (High) -> 2 (Medium) -> 3 (Low)
  dayTasks.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.id - b.id; // Secondary sorting by creation time
  });
  
  // Update task count indicators
  const totalCount = dayTasks.length;
  const completedCount = dayTasks.filter(t => t.completed).length;
  document.getElementById("task-count").innerText = totalCount;
  
  const progressRing = document.getElementById("task-progress-ring");
  const ratioText = document.getElementById("task-ratio-text");
  
  const circumference = 2 * Math.PI * 11; // r=11 => 69.11
  if (totalCount === 0) {
    progressRing.style.strokeDashoffset = circumference;
    ratioText.innerText = "0%";
  } else {
    const ratio = completedCount / totalCount;
    const offset = circumference - (ratio * circumference);
    progressRing.style.strokeDashoffset = offset;
    ratioText.innerText = `${Math.round(ratio * 100)}%`;
  }
  
  if (totalCount === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
        <i data-lucide="clipboard-list" class="w-8 h-8 text-slate-700 mb-2"></i>
        <p class="text-xs font-mono">Queue is empty for this date</p>
        <p class="text-[10px] text-slate-600 font-mono mt-1">Focus on serialization &bull; Ivy Lee method</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }
  
  let html = "";
  dayTasks.forEach(task => {
    const priorityLabel = task.priority === 1 ? 'High' : task.priority === 2 ? 'Med' : 'Low';
    const priorityColor = task.priority === 1 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' 
                        : task.priority === 2 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25';
                        
    const checkedClass = task.completed ? 'task-completed text-slate-500' : '';
    const checkedIcon = task.completed ? 'check-circle-2 text-cyan-400' : 'circle text-slate-600';
    
    // Check if controls are disabled due to past date
    const lockClass = isPastDate(activeDate) ? 'opacity-40 cursor-not-allowed pointer-events-none' : '';
    
    html += `
      <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition-all ${checkedClass}">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <button onclick="toggleTaskCompletion('${task.id}')" class="focus:outline-none transition-transform active:scale-95 ${lockClass}">
            <i data-lucide="${checkedIcon}" class="w-5 h-5 flex-shrink-0"></i>
          </button>
          <span class="task-title text-sm truncate font-medium pr-2">${escapeHTML(task.title)}</span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full ${priorityColor}">
            ${priorityLabel}
          </span>
          <button onclick="openEditTaskModal('${task.id}', '${escapeQuote(task.title)}', ${task.priority})" class="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-cyan-400 transition-colors ${lockClass}" title="Edit Task">
            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteTask('${task.id}')" class="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 transition-colors ${lockClass}" title="Delete Task">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  lucide.createIcons();
}

function renderMastery() {
  // Render Stack Milestones
  const milestoneContainer = document.getElementById("milestone-container");
  const availableMilestones = MILESTONES_DATABASE[activeLanguage] || [];
  const activeLangMilestones = mastery.milestones[activeLanguage] || [];
  
  let milestoneHTML = "";
  if (availableMilestones.length === 0) {
    milestoneHTML = `<p class="text-slate-500 italic text-[11px]">No milestones defined.</p>`;
  } else {
    availableMilestones.forEach(m => {
      const isChecked = activeLangMilestones.includes(m);
      const icon = isChecked ? 'square-check' : 'square';
      const colorClass = isChecked ? 'text-emerald-400' : 'text-slate-700 hover:text-slate-500';
      const textClass = isChecked ? 'line-through text-slate-500' : 'text-slate-300';
      
      milestoneHTML += `
        <div class="flex items-start gap-2.5 cursor-pointer py-0.5 select-none" onclick="toggleMilestone('${escapeQuote(m)}')">
          <i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0 mt-0.5 ${colorClass} transition-colors"></i>
          <span class="${textClass} leading-tight">${escapeHTML(m)}</span>
        </div>
      `;
    });
  }
  milestoneContainer.innerHTML = milestoneHTML;
  
  // Render Daily logs for activeDate
  const hoursInput = document.getElementById("log-hours");
  const challengesInput = document.getElementById("log-challenges");
  const conceptInput = document.getElementById("log-concept");
  
  const dailyLog = mastery.dailyLogs[activeDate];
  if (dailyLog) {
    hoursInput.value = dailyLog.hours || "";
    challengesInput.value = dailyLog.challenges || "";
    conceptInput.value = dailyLog.concept || "";
  } else {
    hoursInput.value = "";
    challengesInput.value = "";
    conceptInput.value = "";
  }
  
  lucide.createIcons();
}

function renderXPAndRanks() {
  const totalXP = calculateTotalXP();
  const rankData = getDevRank(totalXP);
  
  document.getElementById("dev-xp-total").innerText = `${totalXP} XP`;
  document.getElementById("dev-rank-title").innerText = rankData.currentRank.title;
  document.getElementById("dev-level-num").innerText = rankData.currentRank.level;
  
  const xpProgressBar = document.getElementById("dev-xp-progress");
  
  if (rankData.nextRank) {
    const range = rankData.nextRank.minXP - rankData.currentRank.minXP;
    const progress = totalXP - rankData.currentRank.minXP;
    const percentage = Math.min(100, Math.max(0, (progress / range) * 100));
    xpProgressBar.style.width = `${percentage}%`;
  } else {
    // Max Level
    xpProgressBar.style.width = "100%";
  }
}

function renderHeatmap() {
  const gridContainer = document.getElementById("heatmap-grid");
  const today = new Date();
  
  // Generate dates trailing 364 days ago up to today, aligned by weeks (Sunday to Saturday)
  // 52 weeks = 364 days. Let's find Sunday of the week 52 weeks ago.
  const dayOfWeek = today.getDay();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364 - dayOfWeek); // Start of Sunday 52 weeks ago
  
  let gridHTML = "";
  
  // Loop through 53 weeks (approx 371 days to cover full calendar bounds)
  // In grid CSS, row-major flow, 7 rows.
  // Columns are weeks (53 columns)
  // Let's create an array of dates to render
  const datesToRender = [];
  const loopDate = new Date(startDate);
  
  // Render exactly 371 cells (53 weeks * 7 days) to fill the grid template completely
  for (let i = 0; i < 371; i++) {
    datesToRender.push(new Date(loopDate));
    loopDate.setDate(loopDate.getDate() + 1);
  }
  
  datesToRender.forEach(date => {
    const dateStr = formatDateString(date);
    const contributionLevel = getContributionLevelForDate(dateStr);
    const isFuture = dateStr > formatDateString(today);
    
    // Styling classes
    let colorClass = `hm-${contributionLevel}`;
    let borderClass = "border border-slate-900/40";
    let cursorClass = "cursor-pointer hover:scale-110 transform transition-transform";
    
    if (isFuture) {
      colorClass = "bg-[#03060c] opacity-25";
      cursorClass = "cursor-not-allowed";
    }
    
    if (dateStr === activeDate) {
      borderClass = "border border-cyan-400 scale-105 z-10 shadow-[0_0_8px_rgba(6,182,212,0.5)]";
    }
    
    gridHTML += `
      <div class="w-3.5 h-3.5 rounded-sm flex-shrink-0 transition-all duration-200 ${colorClass} ${borderClass} ${cursorClass}"
           data-date="${dateStr}"
           onclick="if('${isFuture}' === 'false') handleHeatmapCellClick('${dateStr}')"></div>
    `;
  });
  
  gridContainer.innerHTML = gridHTML;
  setupHeatmapTooltips();
}

function getContributionLevelForDate(dateStr) {
  // Compute contribution metrics
  const dayTasks = tasks[dateStr] || [];
  const dayMotivation = motivations[dateStr];
  const dayLog = mastery.dailyLogs[dateStr];
  
  const hasTasks = dayTasks.length > 0;
  const hasMotivation = dayMotivation && dayMotivation.trim().length > 0;
  const hasLog = dayLog && (parseFloat(dayLog.hours) > 0 || parseInt(dayLog.challenges) > 0 || (dayLog.concept && dayLog.concept.trim().length > 0));
  
  if (!hasTasks && !hasMotivation && !hasLog) {
    return 0; // Level 0: No contribution
  }
  
  let score = 0;
  
  // Calculate Task Completion ratio
  if (hasTasks) {
    const completed = dayTasks.filter(t => t.completed).length;
    const ratio = completed / dayTasks.length;
    score += ratio * 0.7; // Weights tasks completion heavily (up to 0.7)
  }
  
  if (hasMotivation) {
    score += 0.15; // Intention written (0.15)
  }
  
  if (hasLog) {
    score += 0.15; // Study logging recorded (0.15)
  }
  
  // Classify score into 3 levels
  if (score === 0) {
    return 0;
  } else if (score > 0 && score <= 0.33) {
    return 1;
  } else if (score > 0.33 && score <= 0.66) {
    return 2;
  } else {
    return 3;
  }
}

// --- Interaction Handlers ---
function setupEventListeners() {
  // Navigation: Previous Day
  document.getElementById("btn-prev-day").addEventListener("click", () => {
    const currentObj = getLocalDateObject(activeDate);
    currentObj.setDate(currentObj.getDate() - 1);
    activeDate = formatDateString(currentObj);
    renderAll();
  });
  
  // Navigation: Next Day
  document.getElementById("btn-next-day").addEventListener("click", () => {
    const currentObj = getLocalDateObject(activeDate);
    const todayStr = formatDateString(new Date());
    if (activeDate < todayStr) {
      currentObj.setDate(currentObj.getDate() + 1);
      activeDate = formatDateString(currentObj);
      renderAll();
    }
  });
  
  // Navigation: Today Quick Button
  document.getElementById("btn-today").addEventListener("click", () => {
    activeDate = formatDateString(new Date());
    renderAll();
  });
  
  // Datepicker select event
  const pickerInput = document.getElementById("date-picker");
  pickerInput.addEventListener("input", (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      const todayStr = formatDateString(new Date());
      if (selectedDate > todayStr) {
        showToast("Access restricted: Future serialization is not allowed.", "warning");
      } else {
        activeDate = selectedDate;
        renderAll();
      }
    }
  });
  
  // Language Stack Switch
  document.getElementById("stack-selector").addEventListener("change", (e) => {
    activeLanguage = e.target.value;
    mastery.activeLanguage = activeLanguage;
    saveToLocalStorage();
    renderMastery();
  });
  
  // Motivation Auto-save & Manual Save listeners
  const motInput = document.getElementById("motivation-input");
  let typingTimer;
  
  motInput.addEventListener("input", () => {
    if (isPastDate(activeDate)) return;
    
    document.getElementById("motivation-status").innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin text-cyan-400"></i> Typing...`;
    lucide.createIcons();
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      saveMotivationIntention();
    }, 1200); // Autosaves 1.2s after typing stops
  });
  
  document.getElementById("btn-save-motivation").addEventListener("click", () => {
    if (isPastDate(activeDate)) return;
    saveMotivationIntention(true);
  });
  
  // Task add submission
  document.getElementById("add-task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (isPastDate(activeDate)) {
      showToast("Cannot modify task logs for past dates.", "warning");
      return;
    }
    
    const titleInput = document.getElementById("task-title-input");
    const priorityInput = document.getElementById("task-priority-select");
    
    const title = titleInput.value.trim();
    const priority = parseInt(priorityInput.value);
    
    if (!title) return;
    
    const dayTasks = tasks[activeDate] || [];
    if (dayTasks.length >= 6) {
      showToast("Ivy Lee Constraint: Limit of 6 tasks reached for today.", "warning");
      return;
    }
    
    // Add task
    const newTask = {
      id: Date.now().toString(),
      title: title,
      priority: priority,
      completed: false
    };
    
    dayTasks.push(newTask);
    tasks[activeDate] = dayTasks;
    
    saveToLocalStorage();
    renderTasks();
    
    titleInput.value = "";
    showToast("Task serialized successfully! (+15 XP potential)", "success");
  });
  
  // Study Log submission
  document.getElementById("study-log-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (isPastDate(activeDate)) {
      showToast("Cannot modify metrics for past dates.", "warning");
      return;
    }
    
    const hours = parseFloat(document.getElementById("log-hours").value) || 0;
    const challenges = parseInt(document.getElementById("log-challenges").value) || 0;
    const concept = document.getElementById("log-concept").value.trim();
    
    mastery.dailyLogs[activeDate] = {
      hours: hours,
      challenges: challenges,
      concept: concept
    };
    
    saveToLocalStorage();
    showToast(`Mastery log saved! Dynamic XP recalulated.`, "success");
  });
  
  // Modal Edit Actions
  document.getElementById("btn-close-modal").addEventListener("click", closeEditTaskModal);
  document.getElementById("btn-cancel-edit").addEventListener("click", closeEditTaskModal);
  
  document.getElementById("btn-save-task-edit").addEventListener("click", () => {
    const id = document.getElementById("edit-task-id").value;
    const title = document.getElementById("edit-task-title").value.trim();
    const priority = parseInt(document.getElementById("edit-task-priority").value);
    
    if (!title) {
      showToast("Task description cannot be blank.", "warning");
      return;
    }
    
    const dayTasks = tasks[activeDate] || [];
    const taskIndex = dayTasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      dayTasks[taskIndex].title = title;
      dayTasks[taskIndex].priority = priority;
      
      saveToLocalStorage();
      renderTasks();
      closeEditTaskModal();
      showToast("Task definition modified.", "success");
    }
  });
}

function saveMotivationIntention(showFeedback = false) {
  const text = document.getElementById("motivation-input").value;
  const oldText = motivations[activeDate] || "";
  
  motivations[activeDate] = text;
  saveToLocalStorage();
  renderMotivation();
  
  if (showFeedback || (text.trim() && !oldText.trim())) {
    showToast("Focus intention synchronized. (+20 XP gained)", "success");
  }
}

// Task actions accessible via window callbacks
window.toggleTaskCompletion = function(id) {
  if (isPastDate(activeDate)) return;
  
  const dayTasks = tasks[activeDate] || [];
  const task = dayTasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveToLocalStorage();
    renderTasks();
    if (task.completed) {
      showToast("Task marked complete! (+15 XP gained)", "success");
    }
  }
};

window.deleteTask = function(id) {
  if (isPastDate(activeDate)) return;
  
  const dayTasks = tasks[activeDate] || [];
  tasks[activeDate] = dayTasks.filter(t => t.id !== id);
  
  saveToLocalStorage();
  renderTasks();
  showToast("Task removed from active queue.", "info");
};

window.openEditTaskModal = function(id, title, priority) {
  if (isPastDate(activeDate)) return;
  
  document.getElementById("edit-task-id").value = id;
  document.getElementById("edit-task-title").value = title;
  document.getElementById("edit-task-priority").value = priority;
  
  const modal = document.getElementById("edit-task-modal");
  modal.classList.remove("pointer-events-none", "opacity-0");
  modal.querySelector("div").classList.remove("scale-95");
  modal.querySelector("div").classList.add("scale-100");
};

function closeEditTaskModal() {
  const modal = document.getElementById("edit-task-modal");
  modal.classList.add("pointer-events-none", "opacity-0");
  modal.querySelector("div").classList.remove("scale-100");
  modal.querySelector("div").classList.add("scale-95");
}

window.toggleMilestone = function(milestoneText) {
  if (!mastery.milestones[activeLanguage]) {
    mastery.milestones[activeLanguage] = [];
  }
  
  const list = mastery.milestones[activeLanguage];
  const idx = list.indexOf(milestoneText);
  
  if (idx === -1) {
    list.push(milestoneText);
    showToast("Milestone achieved! (+50 XP gained)", "success");
  } else {
    list.splice(idx, 1);
    showToast("Milestone cleared.", "info");
  }
  
  saveToLocalStorage();
  renderMastery();
};

window.handleHeatmapCellClick = function(dateStr) {
  const todayStr = formatDateString(new Date());
  if (dateStr > todayStr) return; // Future locks
  
  activeDate = dateStr;
  renderAll();
  showToast(`View shifted to: ${dateStr}`, "info");
};

// --- Heatmap Tooltips Controller ---
function setupHeatmapTooltips() {
  const cells = document.querySelectorAll("#heatmap-grid > div");
  const tooltip = document.getElementById("tooltip");
  
  cells.forEach(cell => {
    const dateStr = cell.getAttribute("data-date");
    if (!dateStr) return;
    
    cell.addEventListener("mouseenter", (e) => {
      // Fetch details for tooltip
      const dayTasks = tasks[dateStr] || [];
      const dayMotivation = motivations[dateStr];
      const dayLog = mastery.dailyLogs[dateStr];
      
      const formattedDate = new Date(dateStr + "T00:00:00").toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      let html = `<div class="font-bold text-cyan-400 mb-0.5">${formattedDate}</div>`;
      
      // Task breakdown
      if (dayTasks.length > 0) {
        const completed = dayTasks.filter(t => t.completed).length;
        html += `<div>&bull; ${completed}/${dayTasks.length} tasks completed</div>`;
      } else {
        html += `<div class="text-slate-500">&bull; No serialized tasks</div>`;
      }
      
      // Study log breakdown
      if (dayLog && (parseFloat(dayLog.hours) > 0 || parseInt(dayLog.challenges) > 0)) {
        html += `<div>&bull; Studied: ${dayLog.hours || 0} hrs / ${dayLog.challenges || 0} LeetCode</div>`;
        if (dayLog.concept) {
          html += `<div class="text-[10px] text-emerald-400 max-w-[200px] truncate">&bull; Log: "${dayLog.concept}"</div>`;
        }
      }
      
      // Motivation indicator
      if (dayMotivation && dayMotivation.trim().length > 0) {
        html += `<div class="text-[10px] text-slate-400 max-w-[200px] truncate">&bull; Goal: "${dayMotivation}"</div>`;
      }
      
      tooltip.innerHTML = html;
      tooltip.classList.add("visible");
      
      // Positioning logic
      positionTooltip(e, cell);
    });
    
    cell.addEventListener("mousemove", (e) => {
      positionTooltip(e, cell);
    });
    
    cell.addEventListener("mouseleave", () => {
      tooltip.classList.remove("visible");
    });
  });
}

function positionTooltip(e, cell) {
  const tooltip = document.getElementById("tooltip");
  const cellRect = cell.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Place tooltip above the cell
  const x = cellRect.left + scrollLeft + (cellRect.width / 2) - (tooltip.offsetWidth / 2);
  const y = cellRect.top + scrollTop - tooltip.offsetHeight - 8;
  
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

// --- Dynamic Toast System ---
function showToast(message, type = 'info') {
  const container = document.getElementById("toast-container");
  
  let bgClass = "bg-slate-900 border-slate-800 text-slate-300";
  let icon = "info";
  let iconColor = "text-cyan-400";
  
  if (type === 'success') {
    bgClass = "bg-emerald-950/80 border-emerald-500/30 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
    icon = "check-circle";
    iconColor = "text-emerald-400";
  } else if (type === 'warning') {
    bgClass = "bg-amber-950/80 border-amber-500/30 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
    icon = "alert-triangle";
    iconColor = "text-amber-400";
  } else if (type === 'error') {
    bgClass = "bg-rose-950/80 border-rose-500/30 text-rose-100 shadow-[0_0_15px_rgba(239,68,68,0.15)]";
    icon = "shield-alert";
    iconColor = "text-rose-400";
  }
  
  const toastId = `toast-${Date.now()}`;
  const toastHTML = `
    <div id="${toastId}" class="flex items-center gap-3 p-3.5 rounded-xl border backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto ${bgClass}">
      <i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0 ${iconColor}"></i>
      <span class="text-xs font-mono font-medium">${message}</span>
      <button onclick="document.getElementById('${toastId}').remove()" class="p-1 hover:bg-slate-800/40 rounded ml-auto text-slate-500 hover:text-slate-300">
        <i data-lucide="x" class="w-3 h-3"></i>
      </button>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', toastHTML);
  lucide.createIcons();
  
  const toastElement = document.getElementById(toastId);
  
  // Transition in
  setTimeout(() => {
    toastElement.classList.remove("translate-y-2", "opacity-0");
    toastElement.classList.add("translate-y-0", "opacity-100");
  }, 10);
  
  // Auto dismiss after 3.2 seconds
  setTimeout(() => {
    if (toastElement) {
      toastElement.classList.add("opacity-0", "translate-y-1");
      setTimeout(() => {
        toastElement.remove();
      }, 300);
    }
  }, 3200);
}

// --- Connection Status (Offline Indicator) ---
function updateConnectionStatus() {
  const statusLabel = document.getElementById("connection-status");
  if (navigator.onLine) {
    statusLabel.innerText = "Online System Active";
    statusLabel.className = "text-slate-500";
  } else {
    statusLabel.innerText = "Offline Cache Active (Offline Mode)";
    statusLabel.className = "text-amber-500 font-bold animate-pulse";
  }
}

// --- Service Worker Registration ---
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          console.log('[PWA Service Worker] Registered successfully', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA Service Worker] Registration failed', err);
        });
    });
  }
}

// --- Helper Functions to Avoid Code Injection ---
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function escapeQuote(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
