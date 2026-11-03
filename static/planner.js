// Andmemudel ja kuupäevaabilised, mida kasutajaliidese joonistamine ei muuda.
export const DAYS = ['Esmaspäev', 'Teisipäev', 'Kolmapäev', 'Neljapäev', 'Reede', 'Laupäev', 'Pühapäev'];
export const PRIORITIES = { high: 'Kõrge', medium: 'Keskmine', low: 'Madal' };
export const COLORS = [
  { dot: '#bca0fa', event: '#ede4ff' },
  { dot: '#91c9ff', event: '#e0edff' },
  { dot: '#ffb57e', event: '#ffead8' },
  { dot: '#8bcab4', event: '#e3f4ee' },
  { dot: '#edabc5', event: '#fbe5ef' },
];
export const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const parseDate = (value) => new Date(`${value}T12:00:00`);
export const addDays = (value, amount) => {
  const date = parseDate(value);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
};
export const currentWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return dateKey(date);
};
export const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const hours = (minutes) => `${Number((minutes / 60).toFixed(2)).toLocaleString('et-EE')} h`;
export const shortDate = (value) => parseDate(value).toLocaleDateString('et-EE', { day: 'numeric', month: 'short' });
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function weekLabel(week) {
  const start = parseDate(week), end = parseDate(addDays(week, 6));
  return `${shortDate(week)} – ${shortDate(dateKey(end))} ${end.getFullYear()}${start.getFullYear() === end.getFullYear() ? '' : ` (${start.getFullYear()})`}`;
}
export function emptyState() {
  return { subjects: ['Matemaatika', 'Programmeerimine', 'Inglise keel'], tasks: [], availability: DAYS.map((_, i) => ({ enabled: i < 5, start: '16:00', end: '19:00' })), plan: null };
}
export function demoState() {
  const state = emptyState();
  const week = currentWeek();
  state.tasks = [
    { id: 'example-math', title: 'Lineaaralgebra harjutused', subject: 'Matemaatika', deadline: week, hours: 2, priority: 'high', done: false, demo: true },
    { id: 'example-python', title: 'Pythoni kodutöö', subject: 'Programmeerimine', deadline: addDays(week, 4), hours: 3.5, priority: 'medium', done: false, demo: true },
    { id: 'example-essay', title: 'Essee mustand', subject: 'Inglise keel', deadline: addDays(week, 2), hours: 1.5, priority: 'medium', done: false, demo: true },
    { id: 'example-revision', title: 'Kordamine', subject: 'Matemaatika', deadline: addDays(week, 3), hours: 1, priority: 'low', done: false, demo: true },
  ];
  // Kujunduse näidisnädal. Nupp „Koosta” asendab selle Pythoni tulemusega.
  state.plan = { week, demo: true, unscheduled: [], sessions: [
    { taskId: 'example-math', date: week, start: '16:00', end: '18:00', minutes: 120 },
    { taskId: 'example-python', date: addDays(week, 1), start: '16:00', end: '18:00', minutes: 120 },
    { taskId: 'example-essay', date: addDays(week, 2), start: '16:00', end: '17:30', minutes: 90 },
    { taskId: 'example-revision', date: addDays(week, 3), start: '17:00', end: '18:00', minutes: 60 },
    { taskId: 'example-python', date: addDays(week, 4), start: '16:00', end: '17:30', minutes: 90 },
  ] };
  return state;
}
export function isState(value) {
  return value && Array.isArray(value.subjects) && value.subjects.every((s) => typeof s === 'string')
    && Array.isArray(value.tasks) && value.tasks.every((t) => typeof t.id === 'string' && typeof t.title === 'string' && typeof t.subject === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.deadline) && Number.isFinite(t.hours) && t.hours > 0 && t.priority in PRIORITIES)
    && Array.isArray(value.availability) && value.availability.length === 7 && value.availability.every((a) => typeof a.enabled === 'boolean' && /^\d{2}:\d{2}$/.test(a.start) && /^\d{2}:\d{2}$/.test(a.end));
}
