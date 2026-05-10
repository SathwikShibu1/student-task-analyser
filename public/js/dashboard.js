/* =========================
   CHART INSTANCES  — must be declared before applyTheme() is called
========================= */
let weeklyChart  = null;
let subjectChart = null;

/* =========================
   SAFE STORAGE  — Edge/Firefox tracking prevention blocks localStorage
========================= */
const store = {
  get(key)      { try { return localStorage.getItem(key); }    catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, val); }      catch { /* blocked */ } },
  remove(key)   { try { localStorage.removeItem(key); }        catch { /* blocked */ } }
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
  const storedUser = store.get('user');
  if (storedUser && storedUser !== 'undefined') userData = JSON.parse(storedUser);
} catch (err) { console.error('user parse error:', err); }

function applyUserToUI(user) {
  if (!user || !user.name) return;
  const userName = document.getElementById('user-name');
  const avatar   = document.getElementById('avatar');
  if (userName) userName.textContent = user.name;
  if (avatar)   avatar.textContent   = user.name.charAt(0).toUpperCase();
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
  if (response.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Unauthorized');
  }
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
    if (err.message !== 'Unauthorized') {
      console.warn('Profile fetch failed, continuing with cached data:', err.message);
    }
  }
}

/* =========================
   STATS
========================= */
function updateStats(stats) {
  const mappings = {
    'stat-total':     stats.total     || 0,
    'stat-completed': stats.completed || 0,
    'streak-count':   stats.streak    || 0,
    'xp-count':       stats.xp        || 0
  };
  Object.entries(mappings).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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
  subjects.forEach(subject => {
    const opt = document.createElement('option');
    opt.value = subject;
    opt.textContent = subject;
    if (subject === current) opt.selected = true;
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
        <div class="task-body">
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
        </div>
        <div class="task-actions">
          ${task.status !== 'Completed' ? `
            ${task.isTimerRunning
              ? `<button class="btn btn-warning btn-sm" onclick="pauseTask('${task._id}')">⏸ Pause</button>`
              : `<button class="btn btn-primary btn-sm" onclick="resumeTask('${task._id}')">▶ Resume</button>`
            }
            <button class="btn btn-success btn-sm" onclick="markCompleted('${task._id}')">✓ Done</button>
          ` : `<div class="completed-badge">✅ Completed</div>`}
          <button class="btn btn-secondary btn-sm" onclick="openEditModal('${task._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${task._id}')">Delete</button>
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

    const data = await apiRequest(`/api/tasks?${params.toString()}`);
    state.tasks = data.tasks || [];

    renderTasks(state.tasks, true);
    renderAnalytics(state.tasks);
    renderCalendar(state.tasks);
    updateStats(data.stats || {});
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

function openDeleteModal(id) {
  state.deletingTaskId = id;
  elements.deleteModal.classList.add('open');
}
function closeDeleteModal() { elements.deleteModal.classList.remove('open'); }

/* =========================
   TASK ACTIONS
========================= */
async function pauseTask(id) {
  try { await apiRequest(`/api/tasks/${id}`, 'PUT', { action: 'pause' }); loadTasks(); }
  catch (err) { console.error('pauseTask:', err); alert(err.message); }
}

async function resumeTask(id) {
  try { await apiRequest(`/api/tasks/${id}`, 'PUT', { action: 'resume' }); loadTasks(); }
  catch (err) { console.error('resumeTask:', err); alert(err.message); }
}

async function markCompleted(id) {
  try { await apiRequest(`/api/tasks/${id}`, 'PUT', { status: 'Completed' }); loadTasks(); }
  catch (err) { console.error('markCompleted:', err); alert(err.message); }
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
    console.error(err);
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
    console.error(err);
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
  hamburger.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (
    sidebar.classList.contains('open') &&
    !sidebar.contains(e.target) &&
    !(hamburger && hamburger.contains(e.target))
  ) {
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
    if (chart.options.scales) {
      Object.values(chart.options.scales).forEach(scale => {
        if (scale.ticks) scale.ticks.color = c.text;
        if (scale.grid)  scale.grid.color  = c.grid;
      });
    }
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
  const pending   = tasks.filter(t => t.status !== 'Completed').length;
  const pct       = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  weeklyChart = new Chart(weeklyCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [completed || 0.001, pending || 0.001],
        backgroundColor: [createGradient(weeklyCanvas, c.purple, c.blue), c.grid],
        borderColor: [c.purple, 'transparent'],
        borderWidth: [2, 0], hoverOffset: 8, borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '72%',
      animation: { animateRotate: true, animateScale: true, duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: c.text, padding: 16, font: { family: "'DM Sans', sans-serif", size: 12, weight: '500' }, usePointStyle: true, pointStyleWidth: 8 }
        },
        tooltip: {
          backgroundColor: c.surface, titleColor: c.purple, bodyColor: c.text,
          borderColor: 'rgba(124,92,255,0.3)', borderWidth: 1, padding: 12, cornerRadius: 12,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw === 0.001 ? 0 : ctx.raw}` }
        },
        centerText: { pct, completed, total: tasks.length, color: c.text, accent: c.purple }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { pct: p, color, accent } = chart.options.plugins.centerText;
        const { width, height, ctx } = chart;
        ctx.save();
        const cx = width / 2, cy = height / 2 - 10;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `800 28px 'Syne', sans-serif`;
        ctx.fillStyle = accent; ctx.fillText(`${p}%`, cx, cy);
        ctx.font = `400 11px 'DM Sans', sans-serif`;
        ctx.fillStyle = color; ctx.fillText('completion', cx, cy + 22);
        ctx.restore();
      }
    }]
  });

  if (subjectChart) subjectChart.destroy();

  const subjectMap = {};
  tasks.forEach(task => { subjectMap[task.subject] = (subjectMap[task.subject] || 0) + 1; });
  const labels  = Object.keys(subjectMap);
  const values  = Object.values(subjectMap);
  const palette = [c.purple, c.blue, c.green, c.yellow, c.red, c.violet];
  const bgColors = labels.map((_, i) => hexWithAlpha(palette[i % palette.length], 0.18));
  const bdColors = labels.map((_, i) => palette[i % palette.length]);

  subjectChart = new Chart(subjectCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Tasks', data: values,
        backgroundColor: bgColors, borderColor: bdColors,
        borderWidth: 2, borderRadius: 10, borderSkipped: false,
        hoverBackgroundColor: bdColors.map(b => hexWithAlpha(b, 0.35))
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 900, easing: 'easeOutQuart', delay: ctx => ctx.dataIndex * 80 },
      layout: { padding: { top: 10 } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: c.text, font: { family: "'DM Sans', sans-serif", size: 11 } } },
        y: { grid: { color: c.grid, lineWidth: 1 }, border: { display: false, dash: [4, 4] }, ticks: { color: c.text, font: { family: "'DM Sans', sans-serif", size: 11 }, stepSize: 1, precision: 0 }, beginAtZero: true }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.surface, titleColor: c.purple, bodyColor: c.text,
          borderColor: 'rgba(124,92,255,0.3)', borderWidth: 1, padding: 12, cornerRadius: 12,
          callbacks: { title: ctx => ctx[0].label, label: ctx => ` ${ctx.raw} task${ctx.raw !== 1 ? 's' : ''}` }
        }
      }
    }
  });
}

function createGradient(canvas, color1, color2) {
  const ctx  = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height || 220);
  grad.addColorStop(0, color1); grad.addColorStop(1, color2);
  return grad;
}

function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* =========================
   PANELS
========================= */
function renderCalendar(tasks) {
  const upcoming     = document.getElementById('upcoming-list');
  const today        = document.getElementById('today-list');
  const focusHours   = document.getElementById('focus-hours');
  const topSubject   = document.getElementById('top-subject');
  const pendingCount = document.getElementById('pending-count');
  if (!upcoming || !today) return;

  const now = new Date();

  const todayTasks = tasks.filter(task =>
    new Date(task.deadline).toDateString() === now.toDateString()
  );

  const upcomingTasks = tasks
    .filter(task => new Date(task.deadline) > now && task.status !== 'Completed')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  today.innerHTML = todayTasks.length
    ? todayTasks.map(t => `
        <div class="study-task">
          <div><strong>${t.title}</strong><small>${t.subject}</small></div>
          <span class="mini-badge ${t.priority.toLowerCase()}">${t.priority}</span>
        </div>`).join('')
    : `<div class="study-empty">Nothing due today 🎉</div>`;

  upcoming.innerHTML = upcomingTasks.length
    ? upcomingTasks.map(t => `
        <div class="study-task">
          <div><strong>${t.title}</strong><small>${new Date(t.deadline).toLocaleDateString()}</small></div>
          <span class="mini-badge ${t.priority.toLowerCase()}">${t.priority}</span>
        </div>`).join('')
    : `<div class="study-empty">No upcoming tasks</div>`;

  const totalMs = tasks.reduce((acc, t) => acc + (t.accumulatedTime || 0), 0);
  if (focusHours)   focusHours.textContent   = `${(totalMs / 3600000).toFixed(1)}h`;

  const subjectMap = {};
  tasks.forEach(t => { subjectMap[t.subject] = (subjectMap[t.subject] || 0) + 1; });
  let top = 'None', max = 0;
  Object.entries(subjectMap).forEach(([s, n]) => { if (n > max) { max = n; top = s; } });
  if (topSubject)   topSubject.textContent   = top;
  if (pendingCount) pendingCount.textContent = tasks.filter(t => t.status !== 'Completed').length;
}

/* =========================
   INIT
========================= */
async function initDashboard() {
  await checkAuth();
  await loadTasks();
}

initDashboard();