// Andmed jäävad brauserisse; Python saab neid ainult graafiku koostamiseks.
const $ = (selector) => document.querySelector(selector);
const DAYS = ['Esmaspäev', 'Teisipäev', 'Kolmapäev', 'Neljapäev', 'Reede', 'Laupäev', 'Pühapäev'];
const PRIORITIES = { high: 'Kõrge', medium: 'Keskmine', low: 'Madal' };
const STORAGE_KEY = 'plaanik-v1';
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = (value) => new Date(`${value}T12:00:00`);
const formatDate = (value) => parseDate(value).toLocaleDateString('et-EE', { day: 'numeric', month: 'short', year: 'numeric' });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const hourText = (minutes) => `${Number((minutes / 60).toFixed(2)).toLocaleString('et-EE')} h`;
const initial = () => ({ subjects: ['Matemaatika', 'Programmeerimine', 'Inglise keel'], tasks: [], availability: DAYS.map((_, index) => ({ enabled: index < 5, start: '16:00', end: '19:00' })), plan: null });
let state = initial();
let messageTimer;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved && Array.isArray(saved.subjects) && Array.isArray(saved.tasks) && Array.isArray(saved.availability) && saved.availability.length === 7) state = saved;
} catch { /* Kui salvestus on vigane või keelatud, käivita uus plaan. */ }

function message(text) {
  $('#message').textContent = text;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { $('#message').textContent = ''; }, 5000);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { message('Brauser ei saanud andmeid salvestada. Kontrolli brauseri salvestusruumi seadeid.'); return false; }
  return true;
}
function invalidatePlan() {
  state.plan = null;
  renderSchedule();
}
function renderSubjects() {
  $('#task-subject').innerHTML = state.subjects.map((subject) => `<option>${escapeHtml(subject)}</option>`).join('');
}
function renderTasks() {
  const sorted = [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.deadline.localeCompare(b.deadline));
  $('#task-list').innerHTML = sorted.length ? sorted.map((task) => `<tr class="${task.done ? 'done' : ''}">
    <td><input type="checkbox" data-complete="${escapeHtml(task.id)}" aria-label="Märgi tehtuks: ${escapeHtml(task.title)}" ${task.done ? 'checked' : ''}></td>
    <td>${escapeHtml(task.title)}</td><td>${escapeHtml(task.subject)}</td><td>${formatDate(task.deadline)}</td>
    <td>${hourText(task.hours * 60)}</td><td>${PRIORITIES[task.priority]}</td>
    <td><button type="button" class="delete" data-delete="${escapeHtml(task.id)}" aria-label="Kustuta ülesanne: ${escapeHtml(task.title)}">Kustuta</button></td></tr>`).join('')
    : '<tr><td colspan="7">Ülesandeid veel pole. Lisa esimene ülesanne ülal oleva vormiga.</td></tr>';
  const pending = state.tasks.filter((task) => !task.done);
  $('#task-summary').textContent = `${pending.length} tegemata · ${hourText(pending.reduce((sum, task) => sum + task.hours * 60, 0))} õppimist · ${state.tasks.length - pending.length} tehtud`;
}
function renderAvailability() {
  $('#availability').innerHTML = DAYS.map((day, i) => {
    const entry = state.availability[i];
    return `<div class="day-availability"><label class="day-toggle"><input type="checkbox" name="day-${i}" data-day="${i}" ${entry.enabled ? 'checked' : ''}>${day.slice(0, 1)}</label>
      <label>Algus<input type="time" name="start-${i}" aria-label="${day}: algus" value="${escapeHtml(entry.start)}" step="900" required ${entry.enabled ? '' : 'disabled'}></label>
      <label>Lõpp<input type="time" name="end-${i}" aria-label="${day}: lõpp" value="${escapeHtml(entry.end)}" step="900" required ${entry.enabled ? '' : 'disabled'}></label></div>`;
  }).join('');
  document.querySelectorAll('[data-day]').forEach((checkbox, i) => {
    checkbox.setAttribute('aria-label', DAYS[i]);
  });
}
function readAvailability() {
  return DAYS.map((_, i) => {
    const enabled = $(`[name="day-${i}"]`).checked;
    const start = $(`[name="start-${i}"]`).value;
    const end = $(`[name="end-${i}"]`).value;
    if (enabled && (!start || !end || start >= end)) throw new Error(`${DAYS[i]}: lõppaeg peab olema algusajast hilisem.`);
    return { enabled, start, end };
  });
}
function renderSchedule() {
  const plan = state.plan;
  $('#schedule-notice').innerHTML = '';
  if (!plan || plan.week !== $('#week-start').value) {
    $('#schedule').innerHTML = '<p class="empty">Graafik ilmub siia, kui oled lisanud ülesanded ja vajutad „Koosta õpigraafik”.</p>';
    return;
  }
  const warnings = plan.unscheduled.map((item) => {
    const task = state.tasks.find((task) => task.id === item.taskId);
    return `<li>${escapeHtml(task?.title || 'Ülesanne')}: ${hourText(item.minutes)} planeerimata. ${item.reason === 'overdue' ? 'Tähtaeg on möödunud.' : 'Valitud nädalal ei jätku enne tähtaega vaba aega.'}</li>`;
  });
  $('#schedule-notice').innerHTML = `<div class="notice ${warnings.length ? 'warning' : ''}"><p>${warnings.length ? 'Kõik ülesanded ei mahu graafikusse. Muuda vaba aega, ajakulu või tähtaegu ja koosta graafik uuesti.' : 'Õpigraafik on valmis. Kõik tegemata ülesanded mahuvad valitud nädalasse.'}</p>${warnings.length ? `<ul>${warnings.join('')}</ul>` : ''}</div>`;
  $('#schedule').innerHTML = DAYS.map((day, i) => {
    const date = parseDate(plan.week);
    date.setDate(date.getDate() + i);
    const sessions = plan.sessions.filter((session) => session.date === dateKey(date));
    const content = sessions.map((session) => {
      const task = state.tasks.find((task) => task.id === session.taskId);
      return `<div class="session"><time>${session.start}–${session.end}</time><span>${escapeHtml(task?.title || '')} <small>· ${escapeHtml(task?.subject || '')}</small></span></div>`;
    }).join('');
    return `<div class="schedule-day"><h3>${day}, ${formatDate(dateKey(date))}</h3>${content || '<p class="rest">Õppimist ei ole planeeritud.</p>'}</div>`;
  }).join('');
}

$('#subject-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#subject-name');
  const name = input.value.trim();
  if (!name) return message('Sisesta õppeaine nimi.');
  if (state.subjects.some((subject) => subject.toLocaleLowerCase() === name.toLocaleLowerCase())) return message('See õppeaine on juba olemas.');
  state.subjects.push(name);
  renderSubjects();
  $('#task-subject').value = name;
  if (save()) message('Õppeaine lisatud.');
  event.target.reset();
});
$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = new FormData(event.target);
  const title = values.get('title').trim();
  if (!title) return message('Sisesta ülesande nimi.');
  if (state.tasks.length >= 500) return message('Ülesandeid võib olla kuni 500.');
  state.tasks.push({ id: crypto.randomUUID(), title, subject: values.get('subject'), deadline: values.get('deadline'), hours: Number(values.get('hours')), priority: values.get('priority'), done: false });
  invalidatePlan();
  renderTasks();
  if (save()) message('Ülesanne lisatud. Koosta uuendatud graafik.');
  $('#task-title').value = '';
  $('#task-title').focus();
});
$('#task-list').addEventListener('change', (event) => {
  const id = event.target.dataset.complete;
  if (!id) return;
  const task = state.tasks.find((task) => task.id === id);
  task.done = event.target.checked;
  invalidatePlan();
  renderTasks();
  save();
});
$('#task-list').addEventListener('click', (event) => {
  const id = event.target.dataset.delete;
  if (!id) return;
  state.tasks = state.tasks.filter((task) => task.id !== id);
  invalidatePlan();
  renderTasks();
  if (save()) message('Ülesanne kustutatud.');
});
$('#availability').addEventListener('change', (event) => {
  if (event.target.dataset.day !== undefined) {
    event.target.closest('.day-availability').querySelectorAll('input[type="time"]').forEach((input) => { input.disabled = !event.target.checked; });
  }
  // Unsaved availability must never leave an old schedule looking current.
  invalidatePlan();
});
$('#availability-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    state.availability = readAvailability();
    invalidatePlan();
    if (save()) message('Vaba aeg salvestatud.');
  } catch (error) { message(error.message); }
});
$('#week-start').addEventListener('change', renderSchedule);
$('#schedule-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.tasks.some((task) => !task.done)) return message('Lisa kõigepealt vähemalt üks tegemata ülesanne.');
  const week = $('#week-start').value;
  if (parseDate(week).getDay() !== 1) return message('Vali nädala alguseks esmaspäev.');
  const button = $('#generate');
  try {
    state.availability = readAvailability();
    button.disabled = true;
    button.textContent = 'Koostan…';
    const now = new Date();
    const response = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks: state.tasks, availability: state.availability, week, today: dateKey(now), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Graafiku koostamine ebaõnnestus.');
    state.plan = { ...result, week };
    save();
    renderSchedule();
  } catch (error) { message(error instanceof TypeError ? 'Pythoni serveriga ei saa ühendust. Käivita python3 app.py ja proovi uuesti.' : error.message); }
  finally { button.disabled = false; button.textContent = 'Koosta õpigraafik'; }
});

const monday = new Date();
monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
$('#week-start').value = state.plan?.week || dateKey(monday);
$('#task-deadline').value = dateKey(new Date());
renderSubjects();
renderTasks();
renderAvailability();
renderSchedule();
