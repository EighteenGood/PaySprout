(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GrassCalculator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DEFAULTS = Object.freeze({ salary: 10000, dailyHours: 8, restMode: 'double', restDays: 8, startTime: '09:00', lunchEnabled: true, lunchStart: '12:00', lunchMinutes: 60, payday: 10, alwaysOnTop: true, launchAtLogin: false });
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const minutes = value => Number(value.split(':')[0]) * 60 + Number(value.split(':')[1]);
  function normalizeSettings(raw = {}) {
    const s = { ...DEFAULTS, ...raw };
    s.salary = clamp(s.salary, 1, 100000000, DEFAULTS.salary);
    s.dailyHours = clamp(s.dailyHours, 0.5, 16, DEFAULTS.dailyHours);
    s.restDays = Math.round(clamp(s.restDays, 0, 27, DEFAULTS.restDays));
    s.restMode = ['single', 'double', 'custom'].includes(s.restMode) ? s.restMode : DEFAULTS.restMode;
    s.startTime = validTime(s.startTime) ? s.startTime : DEFAULTS.startTime;
    s.lunchStart = validTime(s.lunchStart) ? s.lunchStart : DEFAULTS.lunchStart;
    s.lunchMinutes = Math.round(clamp(s.lunchMinutes, 15, 180, DEFAULTS.lunchMinutes));
    s.payday = Math.round(clamp(s.payday, 1, 31, DEFAULTS.payday));
    for (const key of ['lunchEnabled', 'alwaysOnTop', 'launchAtLogin']) s[key] = typeof s[key] === 'boolean' ? s[key] : DEFAULTS[key];
    return Object.fromEntries(Object.keys(DEFAULTS).map(key => [key, s[key]]));
  }
  function isScheduledWorkday(date, settings) {
    if (settings.restMode === 'custom') return true;
    return date.getDay() !== 0 && (settings.restMode !== 'double' || date.getDay() !== 6);
  }
  function monthInfo(date, settings) {
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    let workdays = 0;
    for (let d = 1; d <= days; d++) if (isScheduledWorkday(new Date(date.getFullYear(), date.getMonth(), d), settings)) workdays++;
    if (settings.restMode === 'custom') workdays = Math.max(1, days - settings.restDays);
    return { days, workdays, restDays: days - workdays, dailyRate: settings.salary / workdays, hourlyRate: settings.salary / workdays / settings.dailyHours };
  }
  function schedule(settings) {
    const start = minutes(settings.startTime);
    const target = settings.dailyHours * 60;
    const lunchStart = minutes(settings.lunchStart);
    const lunchEnd = lunchStart + settings.lunchMinutes;
    // A break only delays the end if it overlaps paid working time.
    const breakStart = Math.max(start, lunchStart);
    const hasBreak = settings.lunchEnabled && lunchEnd > start && breakStart < start + target;
    const breakDuration = hasBreak ? lunchEnd - breakStart : 0;
    return { start, end: start + target + breakDuration, breakStart, breakEnd: lunchEnd, hasBreak, target };
  }
  function validateSettings(settings) {
    if (schedule(settings).end > 24 * 60) return '当前上下班安排跨过了午夜，请提前上班时间或减少每日工时。本版本支持当天内的班次。';
    return null;
  }
  function snapshot(date, settings, record = {}) {
    const info = monthInfo(date, settings);
    const plan = schedule(settings);
    const workday = typeof record.workday === 'boolean' ? record.workday : isScheduledWorkday(date, settings);
    const current = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60000;
    let effective = current;
    if (Number.isFinite(record.stoppedAt)) {
      const stop = new Date(record.stoppedAt);
      if (dateKey(stop) === dateKey(date)) effective = Math.min(current, stop.getHours() * 60 + stop.getMinutes() + stop.getSeconds() / 60 + stop.getMilliseconds() / 60000);
    }
    const clipped = Math.max(plan.start, Math.min(plan.end, effective));
    const breakTaken = plan.hasBreak ? Math.max(0, Math.min(clipped, plan.breakEnd) - plan.breakStart) : 0;
    const elapsedMinutes = workday ? Math.max(0, Math.min(plan.target, clipped - plan.start - breakTaken)) : 0;
    let status = 'working';
    if (!workday) status = 'rest';
    else if (effective < plan.start) status = 'before';
    else if (Number.isFinite(record.stoppedAt) || current >= plan.end) status = 'done';
    else if (plan.hasBreak && current >= plan.breakStart && current < plan.breakEnd) status = 'lunch';
    return { ...info, ...plan, workday, status, elapsedSeconds: elapsedMinutes * 60, earned: elapsedMinutes / 60 * info.hourlyRate, progress: elapsedMinutes / plan.target, remainingSeconds: Math.max(0, plan.target - elapsedMinutes) * 60 };
  }
  function timeLabel(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }
  function duration(seconds) {
    const value = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value % 3600 / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }
  function nextPayday(date, day) {
    let y = date.getFullYear(), m = date.getMonth();
    const today = new Date(y, m, date.getDate());
    let pay = new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
    if (pay < today) { m++; pay = new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate())); }
    return Math.round((Date.UTC(pay.getFullYear(), pay.getMonth(), pay.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  }
  return { DEFAULTS, normalizeSettings, validateSettings, dateKey, isScheduledWorkday, monthInfo, schedule, snapshot, timeLabel, duration, nextPayday };
});
