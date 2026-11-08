// أيقونات البكور: Material Symbols Sharp من Google Fonts فقط (قرار المالك: «لا تستخدم أي أيقونات أخرى»).
// تُحمَّل كخط متغيّر بمحاوره (opsz, wght, FILL, GRAD)، فيُضبط شكلها كله من CSS عند التصميم الموحّد:
//   --ms-fill (0/1) · --ms-wght (100..700) · --ms-grad (-50..200) · --ms-opsz (20..48)
// القائمة NAMES هي الأيقونات المستعملة فقط (icon_names يقلّل حجم الخط)؛ أضف الاسم هنا قبل استعماله.
// ملاحظة: الخط يُجلب من fonts.googleapis.com؛ بلا اتصال لا تظهر الأيقونات (ويظهر اسمها مقصوصاً).

export const NAMES = [
  'ac_unit', 'account_tree', 'add', 'alarm', 'approval', 'apps', 'arrow_back', 'arrow_downward', 'arrow_drop_down', 'arrow_forward', 'arrow_upward', 'aspect_ratio', 'autorenew', 'bed', 'bedtime', 'block', 'bolt', 'brightness_4', 'brightness_6', 'calendar_month', 'calendar_view_day', 'calendar_view_month', 'calendar_view_week', 'change_history', 'check', 'check_box_outline_blank', 'chevron_left', 'chevron_right', 'church', 'circle', 'close', 'dark_mode', 'date_range', 'delete', 'delete_sweep', 'description', 'diamond', 'download', 'drag_indicator', 'eco', 'edit_note', 'error', 'explore', 'fast_forward', 'filter_vintage', 'flip', 'format_list_numbered', 'format_quote', 'gesture', 'grid_view', 'hearing', 'help', 'home', 'horizontal_rule', 'hourglass_bottom', 'inbox', 'info', 'keyboard', 'keyboard_arrow_down', 'keyboard_arrow_up', 'light_mode', 'lightbulb', 'list', 'list_alt', 'local_fire_department', 'location_on', 'menu_book', 'move_to_inbox', 'music_off', 'navigation', 'notes', 'notifications', 'notifications_off', 'open_in_full', 'open_in_new', 'pan_tool', 'partly_cloudy_day', 'pause', 'percent', 'play_arrow', 'playlist_add', 'public', 'radio_button_checked', 'radio_button_unchecked', 'refresh', 'replay', 'restart_alt', 'rotate_left', 'rotate_right', 'schedule', 'school', 'sentiment_dissatisfied', 'sentiment_neutral', 'sentiment_satisfied', 'settings', 'shuffle', 'skip_next', 'snooze', 'spellcheck', 'star', 'style', 'subject', 'swords', 'sync', 'text_fields', 'timer', 'title', 'today', 'translate', 'tune', 'undo', 'upload', 'vaccines', 'view_agenda', 'view_week', 'visibility', 'visibility_off', 'volume_up', 'wb_sunny', 'wb_twilight', 'widgets', 'width_full', 'width_normal', 'width_wide',
];

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
