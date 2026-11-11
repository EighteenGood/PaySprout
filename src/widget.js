'use strict';
let state;
const C = window.GrassCalculator;
function render() {
  if (!state) return;
  const now = new Date(), snap = C.snapshot(now, state.settings, state.records[C.dateKey(now)]);
  document.querySelector('#widget-earned').textContent = snap.earned.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.querySelector('#widget-time').textContent = C.duration(snap.elapsedSeconds);
  document.querySelector('#widget-status').textContent = ({working:'● 正在生长',lunch:'午休充电中',before:'等待开工',done:'今日已收获',rest:'今天好好休息'})[snap.status];
  document.querySelector('#widget-percent').textContent = `${(snap.progress * 100).toFixed(1)}%`;
  document.querySelector('#widget-fill').style.width = `${snap.progress * 100}%`;
}
window.grass.onState(next => { state = next; render(); });
window.grass.getState().then(initial => { state = initial; render(); });
document.querySelector('#open-main').addEventListener('click', () => window.grass.openMain());
document.querySelector('#hide-widget').addEventListener('click', () => window.grass.hideWidget());
setInterval(render, 250);
