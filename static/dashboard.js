import { icon } from './icons.js';
import { DAYS, PRIORITIES, COLORS, dateKey, parseDate, addDays, currentWeek, toMinutes, hours, shortDate, escapeHtml as esc, weekLabel, demoState, isState } from './planner.js';

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'plaanik-dashboard-v1'; // Lihtsa versiooni andmed jäävad eraldi alles.
let state;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  state = isState(saved) ? saved : demoState();
} catch { state = demoState(); }
let selectedWeek = currentWeek();
let view = 'week';
let editingId = null;
let toastTimer;
let generating = false;
const colorFor = (subject) => COLORS[Math.max(0, state.subjects.indexOf(subject)) % COLORS.length];
const pending = () => state.tasks.filter((task) => !task.done);

function notify(text, undo) {
  clearTimeout(toastTimer);
  $('#message').textContent = text;
  if (undo) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'toast-undo'; button.textContent = 'Võta tagasi';
    button.addEventListener('click', () => { undo(); $('#message').textContent = ''; });
    $('#message').append(button);
  }
  toastTimer = setTimeout(() => { $('#message').textContent = ''; }, undo ? 10000 : 4500);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { notify('Brauser ei saanud andmeid salvestada. Andmed püsivad praegu ainult avatud lehel.'); return false; }
}
function changed() {
  state.plan = null;
  save();
  render();
}
function renderSubjects() {
  $('#subject-list').innerHTML = state.subjects.map((subject) => `<div class="subject-item"><span class="dot" style="--dot:${colorFor(subject).dot}"></span><span>${esc(subject)}</span></div>`).join('');
  const previous = $('#task-subject').value;
  $('#task-subject').innerHTML = state.subjects.map((subject) => `<option>${esc(subject)}</option>`).join('');
  if (state.subjects.includes(previous)) $('#task-subject').value = previous;
  $('#demo-note').hidden = !state.tasks.some((task) => task.demo);
}
function renderStats() {
  const tasks = pending();
  const matchingPlan = state.plan?.week === selectedWeek;
  const studyMinutes = matchingPlan ? state.plan.sessions.reduce((sum, s) => sum + s.minutes, 0)
    : tasks.filter((t) => t.deadline >= selectedWeek && t.deadline <= addDays(selectedWeek, 6)).reduce((sum, t) => sum + t.hours * 60, 0);
  $('#study-total').textContent = hours(studyMinutes);
  $('#task-total').textContent = tasks.length;
  $('#free-total').textContent = hours(state.availability.reduce((sum, a) => sum + (a.enabled ? toMinutes(a.end) - toMinutes(a.start) : 0), 0));
}
function renderTasks() {
  const tasks = [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.deadline.localeCompare(b.deadline));
  const visible = view === 'week' ? pending().slice(0, 3) : tasks;
  $('#tasks-heading').textContent = view === 'week' ? 'Järgmisena laual' : 'Kõik ülesanded';
  $('#task-list').innerHTML = visible.length ? visible.map((task) => {
    const date = parseDate(task.deadline);
    const due = `${DAYS[(date.getDay() + 6) % 7].slice(0, 1)}, ${shortDate(task.deadline)}`;
    return `<div class="task-row ${task.done ? 'done' : ''}">
      <input type="checkbox" data-complete="${esc(task.id)}" aria-label="Märgi tehtuks: ${esc(task.title)}" ${task.done ? 'checked' : ''}>
      <span class="dot" style="--dot:${colorFor(task.subject).dot}" title="${esc(task.subject)}"></span>
      <button class="task-name" type="button" data-edit="${esc(task.id)}">${esc(task.title)}</button>
      <span class="task-deadline" title="${esc(task.deadline)}">${icon('calendar', 16)}${esc(due)}</span>
      <span class="priority ${task.priority}">${PRIORITIES[task.priority]}</span>
      <button class="row-menu" type="button" data-edit="${esc(task.id)}" aria-label="Muuda ülesannet: ${esc(task.title)}">${icon('more', 18)}</button>
    </div>`;
  }).join('') : `<div class="empty-tasks">${state.tasks.length ? 'Kõik ülesanded on tehtud. Tubli töö!' : 'Ülesandeid veel pole. Lisa oma esimene ülesanne.<br><button type="button" data-demo>Proovi näidisnädalat</button>'}</div>`;
  $('#tasks-bottom').hidden = view === 'week' ? tasks.length <= 3 : !tasks.length;
  $('#tasks-summary').textContent = `${pending().length} tegemata · ${state.tasks.filter((t) => t.done).length} tehtud`;
  $('#all-tasks').hidden = view === 'tasks';
}
function renderCalendar() {
  $('#week-label').textContent = weekLabel(selectedWeek);
  $('#schedule-notice').innerHTML = '';
  const plan = state.plan?.week === selectedWeek ? state.plan : null;
  const sessions = plan?.sessions || [];
  // Vaikimisi 15–20. Varasemaid või hilisemaid õppeplokke ei lõigata ära.
  let start = 15 * 60, end = 20 * 60;
  if (sessions.length) {
    start = Math.min(start, ...sessions.map((s) => Math.floor(toMinutes(s.start) / 60) * 60));
    end = Math.max(end, ...sessions.map((s) => Math.ceil(toMinutes(s.end) / 60) * 60));
  }
  const range = end - start;
  const height = Math.max(305, range / 60 * 61);
  const hour = height / (range / 60);
  $('#calendar').style.setProperty('--hour', `${hour}px`);
  let headers = '<div class="calendar-corner"></div>';
  const today = dateKey(new Date());
  DAYS.forEach((day, i) => {
    const date = addDays(selectedWeek, i);
    headers += `<div class="day-header ${date === today ? 'today' : ''}" aria-label="${day}, ${shortDate(date)}"><span>${day.slice(0, 1)}</span><span class="date-number">${parseDate(date).getDate()}</span></div>`;
  });
  let labels = '';
  for (let minute = start; minute <= end; minute += 60) {
    labels += `<span class="time-label" style="top:${(minute - start) / range * 100}%">${String(minute / 60).padStart(2, '0')}:00</span>`;
  }
  let columns = `<div class="time-gutter" style="height:${height}px">${labels}</div>`;
  DAYS.forEach((day, i) => {
    const date = addDays(selectedWeek, i);
    const blocks = sessions.filter((s) => s.date === date).map((session) => {
      const task = state.tasks.find((t) => t.id === session.taskId);
      if (!task || task.done) return '';
      const duration = toMinutes(session.end) - toMinutes(session.start);
      const blockHeight = duration / range * height - 3;
      const compact = blockHeight < 52 ? 'compact' : '';
      return `<button type="button" data-edit="${esc(task.id)}" class="calendar-event ${duration <= 60 ? 'short' : ''} ${compact} ${blockHeight < 28 ? 'tiny' : ''}" style="top:${(toMinutes(session.start) - start) / range * 100}%;height:${Math.max(10, blockHeight)}px;--event:${colorFor(task.subject).event}" aria-label="${esc(task.title)}, ${day} ${session.start}–${session.end}" title="${esc(task.title)} · ${session.start}–${session.end} · ${hours(session.minutes)}">
        <time>${session.start} – ${session.end}</time><strong>${esc(task.title)}</strong><small>${esc(task.subject)} · ${hours(session.minutes)}</small></button>`;
    }).join('');
    columns += `<div class="day-column" style="height:${height}px" aria-label="${day}">${blocks}</div>`;
  });
  $('#calendar').innerHTML = headers + columns;
  $('#calendar-empty').hidden = sessions.length > 0;
  if (!sessions.length && plan?.unscheduled?.length) $('#calendar-empty').hidden = true;
  if (plan?.unscheduled?.length) {
    $('#schedule-notice').innerHTML = `<div class="notice">Kõik ülesanded ei mahu valitud nädalasse. Muuda vaba aega, ajakulu või tähtaegu.<ul>${plan.unscheduled.map((u) => {
      const task = state.tasks.find((t) => t.id === u.taskId);
      return `<li>${esc(task?.title || 'Ülesanne')}: ${hours(u.minutes)} planeerimata${u.reason === 'overdue' ? ' — tähtaeg on möödunud' : ' — enne tähtaega ei jätku vaba aega'}.</li>`;
    }).join('')}</ul></div>`;
  }
}
function render() {
  renderSubjects();
  renderStats();
  renderCalendar();
  renderTasks();
}
function showView(next) {
  view = next;
  $('#calendar-panel').hidden = view !== 'week';
  $('#page-title').textContent = view === 'week' ? 'Sinu nädal, sinu tempos.' : 'Sinu ülesanded.';
  $('#page-subtitle').textContent = view === 'week' ? 'Vähem planeerimist. Rohkem tehtud.' : 'Üks ülesanne korraga. Kõik ühes kohas.';
  for (const name of ['week', 'tasks']) {
    const button = $(`#${name}-nav`);
    button.classList.toggle('active', name === view);
    if (name === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  renderTasks();
}
function openTask(id = null) {
  editingId = id;
  const task = state.tasks.find((t) => t.id === id);
  const form = $('#task-form');
  form.reset();
  $('#task-error').textContent = '';
  $('#task-dialog-title').textContent = task ? 'Muuda ülesannet' : 'Lisa ülesanne';
  $('#delete-task').hidden = !task;
  if (task) {
    for (const key of ['title', 'subject', 'deadline', 'hours', 'priority']) form.elements[key].value = task[key];
  } else {
    form.elements.deadline.value = dateKey(new Date());
  }
  $('#task-dialog').showModal();
}

for (const element of document.querySelectorAll('[data-icon]')) element.innerHTML = icon(element.dataset.icon);
$('#today-date').textContent = new Date().toLocaleDateString('et-EE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase());
$('#week-nav').addEventListener('click', () => showView('week'));
$('#tasks-nav').addEventListener('click', () => showView('tasks'));
$('#all-tasks').addEventListener('click', () => showView('tasks'));
$('#new-task').addEventListener('click', () => openTask());
$('#previous-week').addEventListener('click', () => { selectedWeek = addDays(selectedWeek, -7); renderCalendar(); renderStats(); });
$('#next-week').addEventListener('click', () => { selectedWeek = addDays(selectedWeek, 7); renderCalendar(); renderStats(); });
$('#this-week').addEventListener('click', () => { selectedWeek = currentWeek(); renderCalendar(); renderStats(); });
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => button.closest('dialog').close());
$('#new-subject').addEventListener('click', () => {
  $('#subject-form').reset(); $('#subject-error').textContent = ''; $('#subject-dialog').showModal();
});
$('#subject-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('#subject-name').value.trim();
  if (!name) { $('#subject-error').textContent = 'Sisesta õppeaine nimi.'; return; }
  if (state.subjects.some((s) => s.toLocaleLowerCase() === name.toLocaleLowerCase())) { $('#subject-error').textContent = 'See õppeaine on juba olemas.'; return; }
  state.subjects.push(name);
  save(); renderSubjects();
  $('#task-subject').value = name;
  $('#subject-dialog').close();
  notify('Õppeaine lisatud.');
});
$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = new FormData(event.target);
  const title = values.get('title').trim();
  if (!title) { $('#task-error').textContent = 'Sisesta ülesande nimi.'; return; }
  if (!editingId && state.tasks.length >= 500) { $('#task-error').textContent = 'Ülesandeid võib olla kuni 500.'; return; }
  const existing = state.tasks.find((t) => t.id === editingId);
  const task = { id: editingId || crypto.randomUUID(), title, subject: values.get('subject'), deadline: values.get('deadline'), hours: Number(values.get('hours')), priority: values.get('priority'), done: existing?.done || false, demo: false };
  if (existing) state.tasks[state.tasks.indexOf(existing)] = task;
  else state.tasks.push(task);
  changed();
  $('#task-dialog').close();
  notify(existing ? 'Ülesanne uuendatud. Koosta graafik uuesti.' : 'Ülesanne lisatud. Koosta oma õpigraafik.');
});
$('#delete-task').addEventListener('click', () => {
  const snapshot = structuredClone(state);
  state.tasks = state.tasks.filter((t) => t.id !== editingId);
  changed();
  $('#task-dialog').close();
  notify('Ülesanne kustutatud.', () => { state = snapshot; save(); render(); });
});
$('#task-list').addEventListener('change', (event) => {
  const id = event.target.dataset.complete;
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = event.target.checked;
  changed();
  notify(task.done ? 'Tubli! Ülesanne on tehtud.' : 'Ülesanne on jälle tegemata.');
});
for (const element of [$('#task-list'), $('#calendar')]) element.addEventListener('click', (event) => {
  if (event.target.closest('[data-demo]') && !state.tasks.length) {
    const subjects = [...state.subjects];
    state = demoState();
    state.subjects = [...new Set([...state.subjects, ...subjects])];
    selectedWeek = currentWeek();
    save(); render();
    notify('Näidisnädal laaditud. Võid ülesandeid vabalt muuta.');
    return;
  }
  const button = event.target.closest('[data-edit]');
  if (button) openTask(button.dataset.edit);
});
$('#clear-demo').addEventListener('click', () => {
  const snapshot = structuredClone(state);
  state.tasks = state.tasks.filter((t) => !t.demo);
  changed();
  notify('Näidisülesanded eemaldatud.', () => { state = snapshot; save(); render(); });
});
$('#edit-time').addEventListener('click', () => {
  $('#time-error').textContent = '';
  $('#availability').innerHTML = DAYS.map((day, i) => {
    const a = state.availability[i];
    return `<div class="availability-row"><label><input type="checkbox" name="day-${i}" data-day="${i}" ${a.enabled ? 'checked' : ''}>${day}</label><input type="time" aria-label="${day}: algus" name="start-${i}" value="${esc(a.start)}" step="900" required ${a.enabled ? '' : 'disabled'}><span>–</span><input type="time" aria-label="${day}: lõpp" name="end-${i}" value="${esc(a.end)}" step="900" required ${a.enabled ? '' : 'disabled'}></div>`;
  }).join('');
  $('#time-dialog').showModal();
});
$('#availability').addEventListener('change', (event) => {
  if (event.target.dataset.day !== undefined) event.target.closest('.availability-row').querySelectorAll('input[type=time]').forEach((input) => { input.disabled = !event.target.checked; });
});
$('#availability-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const availability = DAYS.map((day, i) => {
      const enabled = $(`[name="day-${i}"]`).checked;
      const start = $(`[name="start-${i}"]`).value;
      const end = $(`[name="end-${i}"]`).value;
      if (enabled && (!start || !end || start >= end)) throw new Error(`${day}: lõpp peab olema algusest hilisem.`);
      return { enabled, start, end };
    });
    state.availability = availability;
    changed();
    $('#time-dialog').close();
    notify('Vaba aeg salvestatud. Koosta graafik uuesti.');
  } catch (error) { $('#time-error').textContent = error.message; }
});
$('#generate').addEventListener('click', async () => {
  if (generating) return;
  if (!pending().length) { notify('Lisa esmalt vähemalt üks tegemata ülesanne.'); openTask(); return; }
  const button = $('#generate');
  const revision = JSON.stringify(state);
  const week = selectedWeek;
  generating = true; button.disabled = true; button.lastElementChild.textContent = 'Koostan…';
  try {
    const now = new Date();
    const response = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks: state.tasks, availability: state.availability, week, today: dateKey(now), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Graafiku koostamine ebaõnnestus.');
    if (JSON.stringify(state) !== revision) { notify('Ülesanded muutusid koostamise ajal. Koosta graafik uuesti.'); return; }
    state.plan = { ...result, week, demo: false };
    save(); renderCalendar(); renderStats();
    notify(result.unscheduled.length ? 'Graafik valmis. Osa tööst jäi planeerimata.' : 'Õpigraafik on valmis. Head õppimist!');
  } catch (error) { notify(error instanceof TypeError ? 'Serveriga ei saa ühendust. Käivita python3 app.py ja proovi uuesti.' : error.message); }
  finally { generating = false; button.disabled = false; button.lastElementChild.textContent = 'Koosta õpigraafik'; }
});
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    const updated = JSON.parse(event.newValue);
    if (isState(updated)) { state = updated; render(); }
  } catch { /* Vigane salvestus ei asenda avatud andmeid. */ }
});
render();
save();
