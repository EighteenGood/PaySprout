const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/calculator.js');
const s = { ...C.DEFAULTS };
const date = (day, hour = 0, minute = 0, second = 0) => new Date(2026, 10, day, hour, minute, second);
const snap = (hour, minute = 0, record = {}) => C.snapshot(date(11, hour, minute), s, record);
test('November 2026 uses actual calendar days for single / double weekends', () => {
  assert.equal(C.monthInfo(date(11), s).workdays, 21);
  assert.equal(C.monthInfo(date(11), { ...s, restMode: 'single' }).workdays, 25);
  assert.equal(C.monthInfo(date(11), { ...s, restMode: 'custom', restDays: 6 }).workdays, 24);
});
test('before work, exact start, lunch edges and capped end of day', () => {
  assert.equal(snap(8).elapsedSeconds, 0);
  assert.equal(snap(9).status, 'working');
  assert.equal(snap(12).elapsedSeconds, 3 * 3600);
  assert.equal(snap(12, 30).elapsedSeconds, 3 * 3600);
  assert.equal(snap(12, 30).status, 'lunch');
  assert.equal(snap(13).status, 'working');
  assert.equal(snap(17).elapsedSeconds, 7 * 3600);
  assert.equal(snap(18).elapsedSeconds, 8 * 3600);
  assert.equal(snap(23).earned, C.monthInfo(date(11), s).dailyRate);
  assert.equal(snap(23).progress, 1);
});
test('income grows every second with no rounding in calculation', () => {
  const a = C.snapshot(date(11, 10, 0, 0), s), b = C.snapshot(date(11, 10, 0, 1), s);
  assert.ok(Math.abs(b.earned - a.earned - a.hourlyRate / 3600) < 1e-9);
});
test('weekends earn zero unless today is manually a workday', () => {
  assert.equal(C.snapshot(date(14, 15), s).earned, 0);
  assert.ok(C.snapshot(date(14, 15), s, { workday: true }).earned > 0);
  assert.equal(snap(15, 0, { workday: false }).earned, 0);
});
test('early clock-out freezes actual earned time, next date ignores the stop', () => {
  const stoppedAt = date(11, 11, 30).getTime();
  assert.equal(snap(16, 0, { stoppedAt }).elapsedSeconds, 2.5 * 3600);
  assert.equal(snap(16, 0, { stoppedAt }).status, 'done');
  assert.equal(C.snapshot(date(12, 10), s).elapsedSeconds, 3600);
  assert.equal(snap(16).elapsedSeconds, 6 * 3600);
});
test('starting before, inside and after lunch only deducts overlapping break', () => {
  assert.equal(C.schedule({ ...s, startTime: '12:30' }).end, 21 * 60);
  assert.equal(C.schedule({ ...s, startTime: '13:00' }).end, 21 * 60);
  assert.equal(C.schedule({ ...s, startTime: '06:00', dailyHours: 4 }).end, 10 * 60);
  assert.equal(C.schedule({ ...s, lunchEnabled: false }).end, 17 * 60);
  assert.equal(C.snapshot(date(11, 14), { ...s, startTime: '12:30' }).elapsedSeconds, 3600);
});
test('short shift ends exactly at lunch start without adding lunch', () => {
  const settings = { ...s, dailyHours: 3 };
  assert.equal(C.schedule(settings).end, 12 * 60);
  assert.equal(C.snapshot(date(11, 12, 30), settings).status, 'done');
});
test('leap year / February uses exact month length and clamps fixed rest days', () => {
  assert.equal(C.monthInfo(new Date(2028, 1, 1), s).days, 29);
  assert.equal(C.monthInfo(new Date(2027, 1, 1), { ...s, restMode: 'custom', restDays: 27 }).workdays, 1);
});
test('settings normalize corrupt values and reject unsupported overnight shifts', () => {
  const settings = C.normalizeSettings({ salary: -1, dailyHours: 'bad', startTime: '29:99', restMode: 'invalid' });
  assert.equal(settings.salary, 1); assert.equal(settings.dailyHours, 8); assert.equal(settings.startTime, '09:00'); assert.equal(settings.restMode, 'double');
  assert.ok(C.validateSettings({ ...s, startTime: '20:00' }));
  assert.equal(C.validateSettings(s), null);
});
test('payday short months and year rollover', () => {
  assert.equal(C.nextPayday(new Date(2027, 1, 28), 31), 0);
  assert.equal(C.nextPayday(new Date(2026, 11, 31), 10), 10);
  assert.equal(C.nextPayday(date(11), 10), 29);
});
test('fresh day resets elapsed time and daily rest override does not alter salary basis', () => {
  assert.equal(C.snapshot(date(12, 0), s).earned, 0);
  assert.equal(snap(15, 0, { workday: true }).workdays, 21);
  assert.equal(C.duration(3661.9), '01:01:01');
});
