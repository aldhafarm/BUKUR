// طبقة «أقل نص» لصفحة الكلمات (طلب المالك): أيقونات Material Symbols من Google بدل نصوص الأزرار،
// والاسم الكامل تلميحاً عند المرور، وإخفاء الشروح الطويلة. لا تغيّر منطق الصفحة: تعدّل العرض فقط.
import { icon } from '../icons.js';

const $ = (id) => document.getElementById(id);
const setTip = (el, tip) => { el.dataset.tip = tip; el.setAttribute('aria-label', tip); el.removeAttribute('title'); };

/** زر ← أيقونة (+ نص قصير اختياري)، مع الإبقاء على العناصر الحية داخله (مثل عدّاد <span>). */
function iconBtn(id, name, tip, short = '') {
  const b = $(id);
  if (!b) return;
  const keep = [...b.querySelectorAll('span[id]')];
  b.innerHTML = icon(name) + (short ? `<span class="cx-s">${short}</span>` : '');
  for (const k of keep) { b.append(' '); b.append(k); }
  b.classList.add('cx-ib');
  setTip(b, tip);
}

/** أزرار تغيّر الصفحة نصها لاحقاً (طي الإعدادات، المؤقت، المسح): نعيد الأيقونة كلما تغيّر النص. */
function iconLive(id, table) {
  const b = $(id);
  if (!b) return;
  let busy = false;
  const apply = () => {
    if (busy) return;
    const t = b.textContent.trim();
    const hit = table.find(([match]) => t.includes(match));
    if (!hit) return;
    busy = true;
    b.innerHTML = icon(hit[1]);
    b.classList.add('cx-ib');
    setTip(b, hit[2]);
    b.dataset.state = hit[0];
    busy = false;
  };
  new MutationObserver(apply).observe(b, { childList: true, characterData: true, subtree: true });
  apply();
}

/** نص قصير لعنصر <label> فيه مربع اختيار، والنص الكامل تلميحاً. */
function shortLabel(inputId, short) {
  const lab = $(inputId)?.closest('label');
  if (!lab) return;
  const full = lab.textContent.trim();
  for (const n of [...lab.childNodes]) if (n.nodeType === 3) n.remove();
  lab.append(` ${short}`);
  setTip(lab, full);
}

// ── البطاقات والتنقل
iconBtn('ord-seq', 'format_list_numbered', 'بالترتيب · Sequential');
iconBtn('ord-rnd', 'shuffle', 'عشوائي · Random');
iconBtn('deck-all', 'apps', 'كل الكلمات · All terms');
iconBtn('deck-off', 'star', 'ورقة المراجعة · Review sheet', '24');
iconBtn('deck-prac', 'replay', 'تدرّب أكثر · Practice more');
iconBtn('deck-mean', 'help', 'لم أعرف المعنى · Didn\'t know');
iconBtn('cv-term', 'title', 'الكلمة أولاً · Term first');
iconBtn('cv-def', 'notes', 'التعريف أولاً · Definition first');
iconBtn('dl-off', 'visibility_off', 'بلا تعريف · No definition');
iconBtn('dl-en', 'subject', 'التعريف بالإنجليزية', 'EN');
iconBtn('dl-ar', 'subject', 'التعريف بالعربية', 'ع');
iconBtn('dl-both', 'subject', 'بالاثنتين · Both', 'EN+ع');
iconBtn('prev', 'arrow_forward', 'السابق · ←');
iconBtn('next', 'arrow_back', 'التالي · →');
iconBtn('flPrac', 'replay', 'أضفها لـ«تدرّب أكثر» (P)');
iconBtn('flMean', 'help', 'لم أعرف معناها (M)');
iconBtn('sayEn', 'volume_up', 'انطقها بالإنجليزية (E)', 'EN');
iconBtn('sayEn2', 'volume_up', 'انطقها بالإنجليزية (E)', 'EN');
iconBtn('sayAr', 'volume_up', 'انطقها بالعربية (A)', 'ع');

// ── أوضاع الكتابة
iconBtn('pm-free', 'edit_note', 'حرّ: اكتب الكلمات سطراً سطراً');
iconBtn('pm-suggest', 'list', 'اقتراحات: القائمة تضيق مع كل حرف');
iconBtn('pm-trace', 'gesture', 'تتبّع: اكتب فوق الكلمة الباهتة');
iconBtn('pm-guided', 'keyboard', 'الحرف التالي: كمعلّم الطباعة');
iconBtn('pm-def', 'description', 'اكتب التعريف');
iconBtn('taSugOff', 'block', 'بلا اقتراحات');
iconBtn('taSugOn', 'lightbulb', 'اقتراحات في الصندوق');
iconBtn('gh-off', 'visibility_off', 'بلا نص باهت');
iconBtn('gh-sug', 'text_fields', 'أكمل الكلمة باهتاً');
iconBtn('gh-card', 'style', 'كلمة البطاقة باهتة');
iconBtn('clearType', 'delete_sweep', 'امسح النص');
iconBtn('defCheck', 'check', 'تحقّق (Enter)');
iconBtn('defShow', 'visibility', 'أظهر التعريف');
iconBtn('tgtSkip', 'skip_next', 'تخطَّ إلى البطاقة التالية');
iconLive('stToggle', [['Hide', 'keyboard_arrow_up', 'أخفِ الإعدادات'], ['Show', 'tune', 'أظهر الإعدادات']]);
iconLive('apPlay', [['Start', 'play_arrow', 'شغّل المؤقت'], ['Pause', 'pause', 'أوقف المؤقت']]);
iconLive('resetProg', [['again', 'error', 'اضغط مرة ثانية للمسح'], ['Reset', 'restart_alt', 'امسح التقدّم المحفوظ']]);

// ── عناوين صفوف الإعدادات: أيقونة + تلميح بدل الكلمة
const ROW_ICON = { Cards: 'style', 'Card shows': 'flip', 'Next card': 'skip_next', Sound: 'volume_up', 'Typing mode': 'keyboard',
  'Typing box': 'edit_note', 'Practice list': 'playlist_add', Mistakes: 'error', Listening: 'hearing' };
const ROW_AR = { Cards: 'البطاقات', 'Card shows': 'ما تعرضه البطاقة', 'Next card': 'الانتقال للتالية', Sound: 'الصوت', 'Typing mode': 'وضع الكتابة',
  'Typing box': 'صندوق الكتابة', 'Practice list': 'قائمة التدريب', Mistakes: 'الأخطاء', Listening: 'الاستماع' };
for (const l of document.querySelectorAll('.stlabel')) {
  const t = l.textContent.trim();
  if (!ROW_ICON[t]) continue;
  l.innerHTML = icon(ROW_ICON[t]);
  l.classList.add('cx-row');
  setTip(l, `${ROW_AR[t]} · ${t}`);
}

// ── مربعات الاختيار: كلمة أو كلمتان، والجملة الكاملة تلميحاً
shortLabel('sylShow', 'مقاطع'); shortLabel('flipAr', 'العربية عند القلب'); shortLabel('sylSay', 'مقطعاً مقطعاً');
shortLabel('skipDone', 'أخفِ ما كتبته'); shortLabel('autoAdd', 'إضافة تلقائية'); shortLabel('autoRemove', 'إزالة تلقائية');
shortLabel('mkSound', 'صوت'); shortLabel('mkShake', 'اهتزاز'); shortLabel('apHide', 'استمع واكتب');

// ── نصوص قصيرة داخل عناصر فيها قوائم منسدلة
for (const [id, short, full] of [['repWrap', 'تكرار', 'كرّر النطق'], ['secsWrap', 'ثوانٍ', 'مدة الكتابة قبل الانتقال']]) {
  const el = $(id);
  if (!el) continue;
  for (const n of [...el.childNodes]) if (n.nodeType === 3 && n.textContent.trim()) n.textContent = `${short} `;
  setTip(el, full);
}
// وصف الإعدادات الطويل تحتها يُخفى؛ ويبقى ظاهراً حين يحمل حالة المؤقت أو التكرار
const status = $('apStatus');
if (status) {
  const upd = () => status.classList.toggle('cx-hide', !/left|listening|paused|Typed/i.test(status.textContent));
  new MutationObserver(upd).observe(status, { childList: true, characterData: true, subtree: true });
  upd();
}
// اختيار القائمة: القائمة المنسدلة وحدها تكفي
for (const l of document.querySelectorAll('.decksel > .label')) l.classList.add('cx-hide');
document.getElementById('deckSel')?.setAttribute('aria-label', 'قائمة التدريب');

// ── قوائم منسدلة أقصر
const ADV = { manual: 'الأزرار ← →', 'enter-ok': 'Enter إن صحّت', enter: 'Enter دائماً', timer: 'مؤقت', 'timer-enter': 'مؤقت أو Enter' };
for (const o of $('advMode')?.options ?? []) if (ADV[o.value]) o.textContent = ADV[o.value];
const LANG = { off: 'بلا صوت', en: 'EN', enar: 'EN ثم ع', ar: 'ع فقط' };
for (const o of $('apLang')?.options ?? []) if (LANG[o.value]) o.textContent = LANG[o.value];

// ── عناوين أقصر، وإخفاء الشروح الطويلة (تبقى التلميحات)
$('pTitle').textContent = 'الكتابة';
$('stTitle').textContent = 'الإعدادات';
$('prTitle').textContent = 'التقدّم';
for (const sel of ['#modeHelp', '#taSugHelp', '#ghHelp', '.keys', '.hint', 'header .sub', '.progress > .tiny:last-child', '.pmode .tiny:not(#tgtInfo)'])
  for (const el of document.querySelectorAll(sel)) el.classList.add('cx-hide');
for (const h of document.querySelectorAll('.sub4 .tiny')) h.classList.add('cx-hide');

// ── الأنماط
const st = document.createElement('style');
st.textContent = `
.ic{width:1.15em;height:1.15em;fill:currentColor;display:block;flex:none}
.cx-ib{display:inline-flex!important;align-items:center;justify-content:center;gap:4px}
.cx-s{font-size:.8em;font-weight:600}
.cx-hide{display:none!important}
.chk,.inl,.flstat{font-family:var(--f-ar);letter-spacing:0}
.cx-row{display:inline-grid;place-items:center;padding-top:6px;color:var(--accent)}
.cx-row .ic{width:20px;height:20px}
.strow{grid-template-columns:32px minmax(0,1fr)!important}
@media (max-width:520px){.strow{grid-template-columns:28px minmax(0,1fr)!important}}
.seg button{min-width:38px}
.nav{grid-template-columns:auto 1fr auto!important}
.nav button{min-width:56px}
[data-tip]{position:relative}
[data-tip]:hover::after,[data-tip]:focus-visible::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
 padding:4px 8px;border-radius:6px;background:var(--ink);color:var(--bg);font:500 12px/1.4 var(--f-ar),sans-serif;white-space:nowrap;pointer-events:none;z-index:30;letter-spacing:0;text-transform:none}
.stlabel[data-tip]:hover::after{left:0;transform:none}
`;
document.head.appendChild(st);
