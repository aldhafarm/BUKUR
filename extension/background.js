import { alarmsFor, badgeFor } from './badge.js';

// الضغط على أيقونة الإضافة يفتح القائمة الجانبية.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// ── شارة المؤقت: رقم الدقائق المتبقية ولون المرحلة فوق الأيقونة، ويبقى وإن أُغلقت القائمة.
// الحالة تُحفظ في chrome.storage.session (تبقى ما بقي المتصفح مفتوحاً، ولا تُكتب على القرص)،
// والتحديث بمنبّهات chrome.alarms (أقل فترة نصف دقيقة) فلا يعمل شيء في الخلفية بين التحديثات.

const APP_ORIGIN = 'https://bukur.mind8x.com';

async function paint() {
  const { timer } = await chrome.storage.session.get('timer');
  const { text, color } = badgeFor(timer, Date.now());
  await chrome.action.setBadgeText({ text });
  if (text) await chrome.action.setBadgeBackgroundColor({ color });
  if (text === '✓') await chrome.alarms.clear('bukur-tick'); // انتهت: تبقى ✓ حتى تبدأ جلسة جديدة
}

async function setTimer(state) {
  await chrome.storage.session.set({ timer: state ?? null });
  await chrome.alarms.clearAll();
  for (const a of alarmsFor(state)) await chrome.alarms.create(a.name, a.info);
  await paint();
}

/** حالة سليمة الشكل فقط — لا نثق بأي رسالة دون فحص. */
function valid(s) {
  if (!s || typeof s !== 'object' || !['up', 'down'].includes(s.kind) || !['idle', 'running', 'paused'].includes(s.status)) return null;
  const num = (v) => (v == null ? null : Number.isFinite(v) ? v : NaN);
  const out = { kind: s.kind, status: s.status, phase: ['focus', 'short', 'long'].includes(s.phase) ? s.phase : 'focus',
    endsAt: num(s.endsAt), remainingMs: num(s.remainingMs), phaseMs: num(s.phaseMs), startedAt: num(s.startedAt), elapsedMs: num(s.elapsedMs) };
  return Object.values(out).some(Number.isNaN) ? null : out;
}

// من القائمة الجانبية (panel.js بعد التحقق من مصدر الإطار)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id || msg?.type !== 'timer') return;
  const s = valid(msg.state);
  if (s) setTimer(s);
});
// من البكور في تبويب كامل (externally_connectable يقصرها على نطاق البكور، ونتحقق مرة أخرى)
chrome.runtime.onMessageExternal.addListener((msg, sender) => {
  if (new URL(sender.url ?? 'about:blank').origin !== APP_ORIGIN || msg?.type !== 'timer') return;
  const s = valid(msg.state);
  if (s) setTimer(s);
});

chrome.alarms.onAlarm.addListener(() => { paint(); });
chrome.runtime.onStartup.addListener(() => { paint(); });
