// أصوات المؤقت — بلا ملفات (Web Audio). المتصفح يسمح بالصوت بعد لمسة المستخدم، و«ابدأ» لمسة.
let audio = null;

/** «تكّة» قصيرة عند كل وقفة أثناء الضبط (طلب المالك: صوت متقطع كالتكويك) — ضجيج قصير جداً مُرشَّح. */
let lastTick = 0;
export function tick() {
  const now = performance.now();
  if (now - lastTick < 28) return; // لا أكثر من ~٣٥ تكّة/ث عند السحب السريع
  lastTick = now;
  try {
    audio ??= new AudioContext();
    audio.resume?.();
    const t = audio.currentTime;
    const len = Math.floor(audio.sampleRate * 0.012);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
    const src = audio.createBufferSource();
    src.buffer = buf;
    const bp = audio.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.2;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.35, t);
    src.connect(bp).connect(gain).connect(audio.destination);
    src.start(t);
  } catch { /* بلا صوت */ }
  try { navigator.vibrate?.(4); } catch { /* بلا اهتزاز */ }
}
export function chime(kind) {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const notes = kind === 'focus' ? [660, 880, 990] : [880, 660, 520]; // صاعدة: عُد للتركيز · هابطة: استرح
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + i * 0.28);
      gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.28 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.28 + 0.25);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + i * 0.28);
      osc.stop(t + i * 0.28 + 0.26);
    });
  } catch { /* لا صوت متاح — تكفي الرسالة */ }
}

/** نغمة خفيفة واحدة لتنبيه المراحل — أهدأ من نغمة الانتهاء. */
export function softCue() {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  } catch { /* بلا صوت */ }
}


/** يفتح الصوت عند لمسة المستخدم (يُستدعى من «ابدأ») حتى تعمل النغمات لاحقاً. */
export function unlockAudio() {
  try { audio ??= new AudioContext(); audio.resume?.(); } catch { /* بلا صوت */ }
}
