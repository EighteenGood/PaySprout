'use strict';
const C = window.GrassCalculator;
let state, toastTimeout, formDirty = false, currentKey;
const $ = selector => document.querySelector(selector);
const money = value => value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statuses = { working: '正在生长', lunch: '午休充电中', before: '等待开工', done: '今日已收获', rest: '好好休息' };
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 2800); }
function render() {
  if (!state) return;
  const now = new Date(), key = C.dateKey(now), s = state.settings, record = state.records[key] || {}, snap = C.snapshot(now, s, record);
  $('#today-date').textContent = `${now.getMonth() + 1}月${now.getDate()}日 · ${['周日','周一','周二','周三','周四','周五','周六'][now.getDay()]}`;
  $('#schedule-label').textContent = `${C.timeLabel(snap.start)} — ${C.timeLabel(snap.end)} · ${s.lunchEnabled && snap.hasBreak ? '午休不计薪' : '连续工作'}`;
  $('#earned').textContent = money(snap.earned);
  $('#status-badge').textContent = statuses[snap.status];
  $('#daily-target').textContent = `¥${money(snap.dailyRate)}`;
  $('#progress-percent').textContent = `${(snap.progress * 100).toFixed(1)}%`;
  $('#day-progress').style.width = `${snap.progress * 100}%`;
  $('#worked-time').textContent = C.duration(snap.elapsedSeconds);
  $('#hourly-rate').textContent = money(snap.hourlyRate);
  $('#hours-note').textContent = `每天工作 ${s.dailyHours} 小时 · 午休${s.lunchEnabled ? '暂停' : '照常'}计时`;
  $('#minute-note').textContent = `每分钟 ¥${money(snap.hourlyRate / 60)} · 点滴积累`;
  $('#workdays').textContent = snap.workdays;
  $('#rest-note').textContent = `${now.getMonth() + 1}月共 ${snap.days} 天 · ${s.restMode === 'double' ? '双休' : s.restMode === 'single' ? '单休' : '固定月休'} ${snap.restDays} 天`;
  const payday = C.nextPayday(now, s.payday);
  $('#payday-days').textContent = payday;
  $('#payday-note').textContent = payday === 0 ? '今天发薪，快乐到账！' : `每月 ${s.payday} 日 · 期待下一份快乐`;
  const remaining = C.duration(snap.remainingSeconds);
  $('#remaining-label').textContent = snap.status === 'rest' ? '今天给自己放个假' : snap.status === 'before' ? `${s.startTime} 开始今天的收获` : snap.status === 'done' ? '辛苦了，去享受生活吧' : `距离今日目标还有 ${remaining}`;
  $('#earning-message').textContent = ({ rest: '休息也是生活的一部分，今天好好照顾自己。', before: '新的一天，新的收获。不着急，准备好再出发。', lunch: '吃饱才有力气长大，午休结束后继续积攒。', done: '今天的努力已收好，接下来是属于你的时间。', working: '每一分努力，都会慢慢长成收获。' })[snap.status];
  $('#toggle-widget').textContent = state.widgetVisible ? '隐藏桌面悬浮窗 ↙' : '显示桌面悬浮窗 ↗';
  $('#toggle-today').textContent = snap.workday ? '今天改为休息 →' : '今天需要上班 →';
  const stopped = Number.isFinite(record.stoppedAt);
  $('#clock-action').textContent = stopped ? '继续工作' : '下班打卡';
  $('#clock-action').disabled = !snap.workday || (!stopped && (snap.status === 'before' || snap.status === 'done'));
  $('#clock-action').dataset.action = stopped ? 'resume' : 'stop';
  $('#toggle-today').dataset.action = snap.workday ? 'rest' : 'work';
  // Rebuild only on a date or state change, keeping the live counter inexpensive.
  if (key !== currentKey) { currentKey = key; renderWeek(now); }
}
function renderWeek(now) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  const strip = $('#week-strip'); strip.replaceChildren();
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i), key = C.dateKey(day);
    const record = state.records[key] || {};
    const working = typeof record.workday === 'boolean' ? record.workday : C.isScheduledWorkday(day, state.settings);
    const cell = document.createElement('div');
    cell.className = `week-day${working ? '' : ' rest'}${key === C.dateKey(now) ? ' today' : ''}`;
    const name = document.createElement('div'); name.className = 'day-name'; name.textContent = ['一','二','三','四','五','六','日'][i];
    const date = document.createElement('div'); date.className = 'day-date'; date.textContent = day.getDate();
    const dot = document.createElement('span'); dot.className = 'day-dot';
    cell.title = `${day.getMonth() + 1}月${day.getDate()}日 · ${working ? '工作日' : '休息日'}${key === C.dateKey(now) ? ' · 今天' : ''}`;
    cell.append(name, date, dot); strip.append(cell);
  }
  $('#week-caption').textContent = state.settings.restMode === 'custom' ? '固定月休 · 具体休息日手动设置' : '本周排班';
}
function populateForm() {
  const form = $('#settings-form');
  for (const [key, value] of Object.entries(state.settings)) { const field = form.elements.namedItem(key); if (field) { if (field.type === 'checkbox') field.checked = value; else field.value = value; } }
  formDirty = false; $('#save-status').textContent = '设置保存在本机'; updatePreview();
}
function readForm() {
  const data = new FormData($('#settings-form')), raw = Object.fromEntries(data.entries());
  // Disabled break fields are omitted by FormData; preserve their chosen values.
  for (const key of ['lunchStart', 'lunchMinutes']) raw[key] = $('#settings-form').elements.namedItem(key).value;
  for (const key of ['lunchEnabled','alwaysOnTop','launchAtLogin']) raw[key] = $('#settings-form').elements.namedItem(key).checked;
  return C.normalizeSettings(raw);
}
function updatePreview() {
  const s = readForm(), plan = C.schedule(s), info = C.monthInfo(new Date(), s), error = C.validateSettings(s);
  $('#rest-days-field').hidden = s.restMode !== 'custom';
  $('#rest-mode-hint').textContent = s.restMode === 'custom' ? '按当月天数减月休天数估算时薪。固定月休不指定星期，默认每天上班；休息当天请在首页切换为「今天改为休息」。' : '单休／双休按当月日历计算工作日，暂不含法定节假日、调休及请假。';
  $('#calculation-preview').textContent = error || `预计 ${C.timeLabel(plan.end)} 下班 · 本月 ${info.workdays} 个工作日 · 时薪 ¥${money(info.hourlyRate)} · 每日目标 ¥${money(info.dailyRate)}`;
  $('#settings-form').elements.lunchStart.disabled = !s.lunchEnabled;
  $('#settings-form').elements.lunchMinutes.disabled = !s.lunchEnabled;
}
async function runAction(action) { try { await action(); } catch (e) { toast(e.message.replace(/^Error invoking remote method '[^']+': Error: /, '')); } }
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => {
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== `view-${button.dataset.view}`;
  for (const nav of document.querySelectorAll('[data-view]')) nav.classList.toggle('active', nav === button);
  if (button.dataset.view === 'settings' && state && !formDirty) populateForm();
  window.scrollTo(0, 0);
});
$('#settings-form').addEventListener('input', () => { formDirty = true; $('#save-status').textContent = '有尚未保存的修改'; updatePreview(); });
$('#settings-form').addEventListener('change', updatePreview);
$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault(); const settings = readForm(), error = C.validateSettings(settings);
  $('#form-error').textContent = error || ''; if (error) return;
  try { await window.grass.saveSettings(settings); formDirty = false; $('#save-status').textContent = '已保存，收入计算已更新'; toast('设置已保存，小草开始按你的节奏生长'); } catch (e) { $('#form-error').textContent = e.message.replace(/^Error invoking remote method '[^']+': Error: /, ''); }
});
$('#toggle-widget').addEventListener('click', () => runAction(() => window.grass.toggleWidget()));
$('#clock-action').addEventListener('click', () => runAction(async () => { const action = $('#clock-action').dataset.action; await window.grass.today(action); toast(action === 'stop' ? '今日已打卡，收获已为你保存' : '已恢复按今日排班计算收入'); }));
$('#toggle-today').addEventListener('click', () => runAction(async () => { const action = $('#toggle-today').dataset.action; await window.grass.today(action); toast(action === 'rest' ? '今天好好休息，计薪已暂停' : '今日已设为工作日'); }));
$('#reset-position').addEventListener('click', () => runAction(async () => { await window.grass.resetWidget(); toast('悬浮窗已回到屏幕右下角'); }));
$('#quit-app').addEventListener('click', () => window.grass.quit());
window.grass.onState(next => { state = next; currentKey = null; render(); });
window.grass.getState().then(initial => { state = initial; populateForm(); render(); }).catch(e => toast(`加载设置失败：${e.message}`));
setInterval(render, 250);
