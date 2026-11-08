// أيقونات البكور: Material Symbols Sharp من Google Fonts فقط (قرار المالك: «لا تستخدم أي أيقونات أخرى»).
// تُحمَّل كخط متغيّر بمحاوره (opsz, wght, FILL, GRAD)، فيُضبط شكلها كله من CSS عند التصميم الموحّد:
//   --ms-fill (0/1) · --ms-wght (100..700) · --ms-grad (-50..200) · --ms-opsz (20..48)
// القائمة NAMES هي الأيقونات المستعملة فقط (icon_names يقلّل حجم الخط)؛ أضف الاسم هنا قبل استعماله.
// ملاحظة: الخط يُجلب من fonts.googleapis.com؛ بلا اتصال لا تظهر الأيقونات (ويظهر اسمها مقصوصاً).

export const NAMES = [
  'account_tree', 'add', 'alarm', 'approval', 'apps', 'arrow_back', 'arrow_forward', 'aspect_ratio', 'autorenew', 'bedtime', 'block', 'calendar_month', 'check', 'chevron_left', 'chevron_right', 'circle', 'close', 'delete', 'delete_sweep', 'description', 'download', 'drag_indicator', 'edit_note', 'error', 'fast_forward', 'flip', 'format_list_numbered', 'format_quote', 'gesture', 'hearing', 'help', 'info', 'keyboard', 'keyboard_arrow_down', 'keyboard_arrow_up', 'lightbulb', 'list', 'list_alt', 'local_fire_department', 'menu_book', 'music_off', 'notes', 'notifications', 'notifications_off', 'open_in_full', 'open_in_new', 'pause', 'percent', 'play_arrow', 'playlist_add', 'refresh', 'replay', 'restart_alt', 'schedule', 'school', 'sentiment_dissatisfied', 'sentiment_neutral', 'sentiment_satisfied', 'settings', 'shuffle', 'skip_next', 'spellcheck', 'star', 'style', 'subject', 'sync', 'text_fields', 'timer', 'title', 'today', 'translate', 'tune', 'undo', 'upload', 'visibility', 'visibility_off', 'volume_up', 'wb_sunny', 'widgets', 'width_full', 'width_normal', 'width_wide'];

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
  + `&icon_names=${[...NAMES].sort().join(',')}&display=block`;

// يُضاف رابط الخط مرة واحدة لكل صفحة تستورد هذا الملف (الحاضنة وصفحة الكلمات)
if (typeof document !== 'undefined' && !document.querySelector('link[data-ms]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_URL;
  link.dataset.ms = '';
  document.head.append(link);
  const st = document.createElement('style');
  st.textContent = `.ic{font-family:'Material Symbols Sharp';font-weight:normal;font-style:normal;font-size:1.25em;line-height:1;
    letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;direction:ltr;width:1em;height:1em;overflow:hidden;flex:none;
    -webkit-font-smoothing:antialiased;font-feature-settings:'liga';user-select:none;
    font-variation-settings:'FILL' var(--ms-fill,0),'wght' var(--ms-wght,400),'GRAD' var(--ms-grad,0),'opsz' var(--ms-opsz,24)}
    .ic.fill{--ms-fill:1}`;
  document.head.append(st);
}

const known = new Set(NAMES);
/** أيقونة باسمها في Material Symbols. اسم غير مسجّل في NAMES يُنبَّه عليه في وحدة التحكم. */
export function icon(name, cls = '') {
  if (!known.has(name) && typeof console !== 'undefined') console.warn(`أيقونة غير مسجّلة في NAMES: ${name}`);
  return `<span class="ic${cls ? ` ${cls}` : ''}" aria-hidden="true">${name}</span>`;
}

/** سمات التلميح لزر أيقونة: الاسم يظهر فوقه عند المرور، ويقرؤه قارئ الشاشة. */
export const tip = (text) => `data-tip="${text}" aria-label="${text}"`;

/** يضبط زراً بأيقونة (+ نص قصير اختياري) وتلميح — لا يعيد البناء إن لم يتغيّر شيء (يُستدعى في كل رسم). */
export function setIconBtn(btn, name, tipText, short = '') {
  const key = `${name}|${tipText}|${short}`;
  if (!btn || btn.dataset.ik === key) return;
  btn.dataset.ik = key;
  btn.innerHTML = icon(name) + (short ? `<span>${short}</span>` : '');
  btn.dataset.tip = tipText;
  btn.setAttribute('aria-label', tipText);
  btn.removeAttribute('title');
}
