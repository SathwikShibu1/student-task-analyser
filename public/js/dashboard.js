/* =========================
   CHART INSTANCES
========================= */
let weeklyChart  = null;
let subjectChart = null;

/* =========================
   SAFE STORAGE
========================= */
const store = {
  get(k)    { try { return localStorage.getItem(k); }    catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); }        catch { } },
  remove(k) { try { localStorage.removeItem(k); }        catch { } }
};

/* =========================
   STATE
========================= */
const state = {
  tasks: [],
  editingTaskId: null,
  deletingTaskId: null
};

const elements = {
  taskList:    document.getElementById('task-list'),
  modal:       document.getElementById('task-modal'),
  deleteModal: document.getElementById('delete-modal'),
  modalTitle:  document.getElementById('modal-title')
};

/* =========================
   THEME
========================= */
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.textContent = dark ? '☀️' : '🌙';
  store.set('theme', dark ? 'dark' : '');
  if (weeklyChart)  updateChartTheme();
  if (subjectChart) updateChartTheme();
}

applyTheme(store.get('theme') === 'dark');

const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
  });
}

/* =========================
   USER
========================= */
let userData = {};
try {
  const s = store.get('user');
  if (s && s !== 'undefined') userData = JSON.parse(s);
} catch {}

function applyUserToUI(user) {
  if (!user || !user.name) return;
  const el = document.getElementById('user-name');
  const av = document.getElementById('avatar');
  if (el) el.textContent = user.name;
  if (av) av.textContent = user.name.charAt(0).toUpperCase();
}
applyUserToUI(userData);

/* =========================
   HELPERS
========================= */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getElapsedMs(task) {
  let elapsed = Number(task.accumulatedTime || 0);
  if (task.status !== 'Completed' && task.timerStartedAt) {
    elapsed += Date.now() - new Date(task.timerStartedAt).getTime();
  }
  return elapsed;
}

function formatMs(ms) {
  const s    = Math.floor(ms / 1000);
  const hrs  = String(Math.floor(s / 3600)).padStart(2, '0');
  const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const secs = String(s % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

function isOverdue(task) {
  return task.status !== 'Completed' && new Date(task.deadline) < new Date();
}

/* =========================
   API
========================= */
async function apiRequest(url, method = 'GET', body = null) {
  const options = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { window.location.href = '/login.html'; throw new Error('Unauthorized'); }
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

/* =========================
   AUTH
========================= */
async function checkAuth() {
  try {
    const profile = await apiRequest('/api/user/profile');
    store.set('user', JSON.stringify(profile));
    applyUserToUI(profile);
  } catch (err) {
    if (err.message !== 'Unauthorized') console.warn('Profile fetch failed:', err.message);
  }
}

/* =========================
   STATS  — removed XP/streak, added overdue + focus
========================= */
function updateStats(stats, tasks) {
  const totalMs   = (tasks || []).reduce((acc, t) => acc + (t.accumulatedTime || 0), 0);
  const focusHrs  = (totalMs / 3600000).toFixed(1);

  const map = {
    'stat-total':     stats.total     || 0,
    'stat-completed': stats.completed || 0,
    'stat-overdue':   stats.overdue   || 0,
    'stat-focus':     focusHrs + 'h'
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

/* =========================
   SUBJECTS
========================= */
function renderSubjects(subjects) {
  const select = document.getElementById('filter-subject');
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">All Subjects</option>`;
  subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    if (s === current) opt.selected = true;
    select.appendChild(opt);
  });
}

/* =========================
   RENDER TASKS
========================= */
let lastRenderedIds = '';

function renderTasks(tasks, force = false) {
  const newIds = tasks.map(t => t._id + t.status + t.isTimerRunning).join(',');
  if (!force && newIds === lastRenderedIds) return;
  lastRenderedIds = newIds;

  if (!tasks.length) {
    elements.taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No tasks found</h3>
        <p style="margin-top:0.5rem;font-size:0.85rem">Add a task to get started!</p>
      </div>`;
    return;
  }

  elements.taskList.innerHTML = tasks.map(task => {
    const overdue = isOverdue(task);
    return `
      <div class="task-card${overdue ? ' overdue-card' : ''}">
        <div class="task-top">
          <div class="task-title">${task.title}</div>
          <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
        </div>
        <div class="task-meta">
          <span>⏱ <span class="task-timer" data-id="${task._id}">${formatMs(getElapsedMs(task))}</span></span>
          <span>📚 ${task.subject}</span>
          <span>📅 ${formatDate(task.deadline)}</span>
          <span>${overdue ? '⚠️ Overdue' : task.status}</span>
        </div>
        ${task.description ? `<p class="task-desc">${task.description}</p>` : ''}
        <div class="task-actions">
          ${task.status !== 'Completed' ? `
            ${task.isTimerRunning
              ? `<button class="btn btn-warning btn-sm" onclick="pauseTask('${task._id}')">⏸ Pause</button>`
              : `<button class="btn btn-primary btn-sm" onclick="resumeTask('${task._id}')">▶ Resume</button>`
            }
            <button class="btn btn-success btn-sm" onclick="markCompleted('${task._id}')">✓ Done</button>
          ` : `<div class="completed-badge">✅ Completed</div>`}
          <button class="btn btn-secondary btn-sm" onclick="openEditModal('${task._id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${task._id}')">🗑 Delete</button>
        </div>
      </div>`;
  }).join('');
}

/* =========================
   TIMER TICK
========================= */
setInterval(() => {
  if (!state.tasks.length) return;
  renderTasks(state.tasks);
  document.querySelectorAll('.task-timer[data-id]').forEach(el => {
    const task = state.tasks.find(t => t._id === el.dataset.id);
    if (task && task.status !== 'Completed' && task.isTimerRunning) {
      el.textContent = formatMs(getElapsedMs(task));
    }
  });
}, 1000);

/* =========================
   LOAD TASKS
========================= */
async function loadTasks() {
  try {
    if (!state.tasks.length) {
      elements.taskList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>Loading tasks...</h3>
        </div>`;
    }

    const params  = new URLSearchParams();
    const search  = document.getElementById('search')?.value || '';
    const subject = document.getElementById('filter-subject')?.value || '';
    const status  = document.getElementById('filter-status')?.value || '';
    if (search)  params.append('search', search);
    if (subject) params.append('subject', subject);
    if (status)  params.append('status', status);

    const data    = await apiRequest(`/api/tasks?${params.toString()}`);
    state.tasks   = data.tasks || [];

    renderTasks(state.tasks, true);
    renderAnalytics(state.tasks);
    renderPanels(state.tasks);
    updateStats(data.stats || {}, state.tasks);
    renderSubjects(data.subjects || []);
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      console.error('loadTasks error:', err);
      elements.taskList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Failed to load tasks</h3>
          <p style="margin-top:0.5rem;font-size:0.82rem;color:var(--red)">${err.message}</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="loadTasks()">Retry</button>
        </div>`;
    }
  }
}

/* =========================
   UPCOMING + DUE TODAY  — FIXED
========================= */
function renderPanels(tasks) {
  const upcomingEl   = document.getElementById('upcoming-list');
  const todayEl      = document.getElementById('today-list');
  const focusHoursEl = document.getElementById('focus-hours');
  const topSubjectEl = document.getElementById('top-subject');
  const pendingEl    = document.getElementById('pending-count');

  const now       = new Date();
  const todayStr  = now.toDateString();

  // Due Today — tasks whose deadline is today (any status)
  const todayTasks = tasks.filter(t => {
    const d = new Date(t.deadline);
    return d.toDateString() === todayStr;
  });

  // Upcoming — pending/overdue tasks with deadline in the future, sorted soonest first
  const upcomingTasks = tasks
    .filter(t => t.status !== 'Completed' && new Date(t.deadline) > now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 6);

  if (todayEl) {
    todayEl.innerHTML = todayTasks.length
      ? todayTasks.map(t => `
          <div class="study-task">
            <div>
              <strong>${t.title}</strong>
              <small>${t.subject}</small>
            </div>
            <span class="mini-badge ${t.priority.toLowerCase()}">${t.priority}</span>
          </div>`).join('')
      : `<div class="study-empty">Nothing due today 🎉</div>`;
  }

  if (upcomingEl) {
    upcomingEl.innerHTML = upcomingTasks.length
      ? upcomingTasks.map(t => {
          const daysLeft = Math.ceil((new Date(t.deadline) - now) / 86400000);
          return `
            <div class="study-task">
              <div>
                <strong>${t.title}</strong>
                <small>${t.subject} · ${daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}</small>
              </div>
              <span class="mini-badge ${t.priority.toLowerCase()}">${t.priority}</span>
            </div>`;
        }).join('')
      : `<div class="study-empty">No upcoming tasks 🎉</div>`;
  }

  // Insights
  const totalMs = tasks.reduce((acc, t) => acc + (t.accumulatedTime || 0), 0);
  if (focusHoursEl) focusHoursEl.textContent = `${(totalMs / 3600000).toFixed(1)}h`;

  const subjectMap = {};
  tasks.forEach(t => { subjectMap[t.subject] = (subjectMap[t.subject] || 0) + 1; });
  let top = 'None', max = 0;
  Object.entries(subjectMap).forEach(([s, n]) => { if (n > max) { max = n; top = s; } });
  if (topSubjectEl) topSubjectEl.textContent = top;
  if (pendingEl)    pendingEl.textContent    = tasks.filter(t => t.status !== 'Completed').length;
}

/* =========================
   MODALS
========================= */
function openAddModal() {
  state.editingTaskId = null;
  elements.modalTitle.textContent = 'Add New Task';
  document.getElementById('task-title').value    = '';
  document.getElementById('task-subject').value  = '';
  document.getElementById('task-desc').value     = '';
  document.getElementById('task-deadline').value = '';
  document.getElementById('task-priority').value = 'Medium';
  elements.modal.classList.add('open');
}

function openEditModal(id) {
  const task = state.tasks.find(t => t._id === id);
  if (!task) return;
  state.editingTaskId = id;
  elements.modalTitle.textContent                = 'Edit Task';
  document.getElementById('task-title').value    = task.title;
  document.getElementById('task-subject').value  = task.subject;
  document.getElementById('task-desc').value     = task.description || '';
  document.getElementById('task-deadline').value = task.deadline.split('T')[0];
  document.getElementById('task-priority').value = task.priority;
  elements.modal.classList.add('open');
}

function closeTaskModal()   { elements.modal.classList.remove('open'); }
function openDeleteModal(id) { state.deletingTaskId = id; elements.deleteModal.classList.add('open'); }
function closeDeleteModal()  { elements.deleteModal.classList.remove('open'); }

/* =========================
   TASK ACTIONS
========================= */
async function pauseTask(id) {
  try { await apiRequest(`/api/tasks/${id}`, 'PUT', { action: 'pause' }); loadTasks(); }
  catch (err) { alert(err.message); }
}

async function resumeTask(id) {
  try { await apiRequest(`/api/tasks/${id}`, 'PUT', { action: 'resume' }); loadTasks(); }
  catch (err) { alert(err.message); }
}

async function markCompleted(id) {
  try { await apiRequest(`/api/tasks/${id}`, 'PUT', { status: 'Completed' }); loadTasks(); }
  catch (err) { alert(err.message); }
}

/* =========================
   EVENT LISTENERS
========================= */
function safeListener(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
}

safeListener('add-task-link', 'click', (e) => { e.preventDefault(); openAddModal(); });
safeListener('add-task-btn',  'click', openAddModal);
safeListener('modal-close',   'click', closeTaskModal);
safeListener('modal-cancel',  'click', closeTaskModal);
safeListener('delete-cancel', 'click', closeDeleteModal);
safeListener('delete-close',  'click', closeDeleteModal);

safeListener('modal-save', 'click', async () => {
  try {
    const title       = document.getElementById('task-title').value.trim();
    const subject     = document.getElementById('task-subject').value.trim();
    const description = document.getElementById('task-desc').value.trim();
    const deadline    = document.getElementById('task-deadline').value;
    const priority    = document.getElementById('task-priority').value;

    if (!title || !subject || !deadline) { alert('Please fill in Title, Subject, and Deadline'); return; }

    const payload = { title, subject, description, deadline, priority };
    if (state.editingTaskId) {
      await apiRequest(`/api/tasks/${state.editingTaskId}`, 'PUT', payload);
    } else {
      await apiRequest('/api/tasks', 'POST', payload);
    }
    closeTaskModal();
    loadTasks();
  } catch (err) {
    alert(err.message || 'Failed to save task');
  }
});

safeListener('delete-confirm', 'click', async () => {
  if (!state.deletingTaskId) return;
  try {
    await apiRequest(`/api/tasks/${state.deletingTaskId}`, 'DELETE');
    closeDeleteModal();
    loadTasks();
  } catch (err) {
    alert(err.message || 'Failed to delete task');
  }
});

safeListener('logout-btn', 'click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  store.remove('user');
  window.location.href = '/login.html';
});

['search', 'filter-subject', 'filter-status'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', loadTasks);
});

/* =========================
   MOBILE SIDEBAR
========================= */
const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
}
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !(hamburger && hamburger.contains(e.target))) {
    sidebar.classList.remove('open');
  }
});

/* =========================
   ANALYTICS
========================= */
function getChartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text:    dark ? '#c9c2f0' : '#7a7290',
    grid:    dark ? 'rgba(124,92,255,0.1)' : 'rgba(124,92,255,0.08)',
    surface: dark ? '#18143a' : '#ffffff',
    purple: '#7c5cff', blue: '#4f8bff', green: '#10d97e',
    red: '#ff4f6a', yellow: '#ffbb33', violet: '#c084fc',
  };
}

function updateChartTheme() {
  const c = getChartColors();
  [weeklyChart, subjectChart].forEach(chart => {
    if (!chart) return;
    if (chart.options.plugins.legend) chart.options.plugins.legend.labels.color = c.text;
    if (chart.options.scales) Object.values(chart.options.scales).forEach(scale => {
      if (scale.ticks) scale.ticks.color = c.text;
      if (scale.grid)  scale.grid.color  = c.grid;
    });
    chart.update();
  });
}

function renderAnalytics(tasks) {
  const weeklyCanvas  = document.getElementById('weeklyChart');
  const subjectCanvas = document.getElementById('subjectChart');
  if (!weeklyCanvas || !subjectCanvas) return;
  const c = getChartColors();

  if (weeklyChart) weeklyChart.destroy();
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const pending   = tasks.filter(t => t.status === 'Pending').length;
  const overdue   = tasks.filter(t => t.status === 'Overdue' || isOverdue(t)).length;
  const pct       = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  weeklyChart = new Chart(weeklyCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending', 'Overdue'],
      datasets: [{
        data: [completed || 0.001, pending || 0.001, overdue || 0.001],
        backgroundColor: [
          createGradient(weeklyCanvas, c.purple, c.blue),
          hexWithAlpha(c.blue, 0.2),
          hexWithAlpha(c.red, 0.3)
        ],
        borderColor: [c.purple, 'transparent', c.red],
        borderWidth: [2, 0, 1],
        hoverOffset: 8, borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '72%',
      animation: { animateRotate: true, animateScale: true, duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: { position: 'bottom', labels: { color: c.text, padding: 12, font: { family: "'DM Sans', sans-serif", size: 11 }, usePointStyle: true } },
        tooltip: {
          backgroundColor: c.surface, titleColor: c.purple, bodyColor: c.text,
          borderColor: 'rgba(124,92,255,0.3)', borderWidth: 1, padding: 10, cornerRadius: 12,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw === 0.001 ? 0 : ctx.raw}` }
        },
        centerText: { pct, color: c.text, accent: c.purple }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { pct: p, color, accent } = chart.options.plugins.centerText;
        const { width, height, ctx } = chart;
        ctx.save();
        const cx = width / 2, cy = height / 2 - 8;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `800 26px 'Syne', sans-serif`;
        ctx.fillStyle = accent; ctx.fillText(`${p}%`, cx, cy);
        ctx.font = `400 10px 'DM Sans', sans-serif`;
        ctx.fillStyle = color; ctx.fillText('done', cx, cy + 20);
        ctx.restore();
      }
    }]
  });

  if (subjectChart) subjectChart.destroy();
  const subjectMap = {};
  tasks.forEach(t => { subjectMap[t.subject] = (subjectMap[t.subject] || 0) + 1; });
  const labels  = Object.keys(subjectMap);
  const values  = Object.values(subjectMap);
  const palette = [c.purple, c.blue, c.green, c.yellow, c.red, c.violet];
  const bgColors = labels.map((_, i) => hexWithAlpha(palette[i % palette.length], 0.18));
  const bdColors = labels.map((_, i) => palette[i % palette.length]);

  subjectChart = new Chart(subjectCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Tasks', data: values, backgroundColor: bgColors, borderColor: bdColors, borderWidth: 2, borderRadius: 10, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.dataIndex * 80 },
      layout: { padding: { top: 8 } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: c.text, font: { family: "'DM Sans', sans-serif", size: 10 } } },
        y: { grid: { color: c.grid }, border: { display: false }, ticks: { color: c.text, font: { family: "'DM Sans', sans-serif", size: 10 }, stepSize: 1, precision: 0 }, beginAtZero: true }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.surface, titleColor: c.purple, bodyColor: c.text,
          borderColor: 'rgba(124,92,255,0.3)', borderWidth: 1, padding: 10, cornerRadius: 12,
          callbacks: { title: ctx => ctx[0].label, label: ctx => ` ${ctx.raw} task${ctx.raw !== 1 ? 's' : ''}` }
        }
      }
    }
  });
}

function createGradient(canvas, c1, c2) {
  const ctx = canvas.getContext('2d');
  const g   = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  return g;
}

function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* =========================
   INIT
========================= */
async function initDashboard() {
  await checkAuth();
  await loadTasks();
}

initDashboard();