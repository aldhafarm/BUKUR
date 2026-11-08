import { useState, useEffect, useRef, useMemo } from 'react';

export default function BUKURWatch() {
  // ═══════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  const [time, setTime] = useState(new Date());
  const [bezelRotation, setBezelRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [bezelMode, setBezelMode] = useState('awake'); // 'awake' | 'gmt'
  const [dialMode, setDialMode] = useState('daynight'); // 'clean' | 'daynight'
  const [dialNightMode, setDialNightMode] = useState('auto'); // 'auto' | '18-06' | '20-04'
  const [nightColorMode, setNightColorMode] = useState('auto'); // 'auto' | 'summer' | 'winter' | 'spring' | 'autumn'
  const [showSunrise, setShowSunrise] = useState(true); // Show sunrise period on dial
  const [showSunset, setShowSunset] = useState(true); // Show sunset period on dial
  const [showAwakeProgress, setShowAwakeProgress] = useState(false);
  const [awakeTrackingHours, setAwakeTrackingHours] = useState(16); // Hours to track from wake time
  const [dailyWakeHour, setDailyWakeHour] = useState(5); // BUKUR Hour 5 = 13:00
  const [dailyWakeMinute, setDailyWakeMinute] = useState(0);
  const [nightGradientMode, setNightGradientMode] = useState('radial'); // 'static' | 'radial'
  const [showSettings, setShowSettings] = useState(false);
  const [dialContent, setDialContent] = useState('full1'); // 'full0' | 'full1' | 'full2' | 'full3' | 'full4' | 'full6'
  const [showDialNumbers, setShowDialNumbers] = useState(true); // Show/hide dial numbers
  const [dialFlipped, setDialFlipped] = useState(false); // false = 00 at top, true = 00 at bottom
  const [handsDirection, setHandsDirection] = useState('clockwise'); // 'clockwise' | 'counterclockwise'
  
  // Sleep Tracking
  const [wakeUpTime, setWakeUpTime] = useState(null); // Recorded wake up time { hour, minute, timestamp }
  const [sleepTime, setSleepTime] = useState(null); // Recorded sleep time { hour, minute, timestamp }
  const [alarmHour, setAlarmHour] = useState(6); // Standard hour (6 AM default)
  const [alarmMinute, setAlarmMinute] = useState(0);
  const [sleepDurationHours, setSleepDurationHours] = useState(8); // Desired sleep hours
  
  // GMT Complication
  const [gmtEnabled, setGmtEnabled] = useState(false);
  const [gmtOffset, setGmtOffset] = useState(0); // -12 to +14 hours offset
  const [isDraggingGMT, setIsDraggingGMT] = useState(false);
  
  // Arabic Hour Name Display
  const [showArabicHourName, setShowArabicHourName] = useState(false);
  
  // Hour Mode (24 or 12 hour)
  const [hourMode, setHourMode] = useState('24'); // '24' | '12'
  
  // Minute/Second markers (60 dots)
  const [showMinuteMarkers, setShowMinuteMarkers] = useState(false);
  const [showSecondMarkers, setShowSecondMarkers] = useState(false);
  
  // Show/Hide hands
  const [showMinuteHand, setShowMinuteHand] = useState(true);
  const [showSecondHand, setShowSecondHand] = useState(true);
  const [handStyle, setHandStyle] = useState('dauphine'); // Hand style: baton, sword, dauphine, leaf, mercedes, alpha, arrow, breguet, cathedral, snowflake, syringe, skeleton
  
  // Language setting
  const [language, setLanguage] = useState('ar'); // 'ar' | 'en'
  const [showPrayerTimes, setShowPrayerTimes] = useState(false); // Dropdown for prayer/daily times
  const [bezelContent, setBezelContent] = useState(['hours24']); // Array of: 'hours24' | 'hours12' | 'minutes' | 'seconds' | 'months' | 'weeks' | 'days' | 'compass'
  const [showBezel, setShowBezel] = useState(true); // Show/hide bezel completely
  const svgRef = useRef(null);
  const lastAngleRef = useRef(0);
  
  // Compass states
  const [compassHeading, setCompassHeading] = useState(0); // Device heading in degrees (0 = North)
  const [showNorthIndicator, setShowNorthIndicator] = useState(true);
  const [showQiblaIndicator, setShowQiblaIndicator] = useState(true);
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [compassPermission, setCompassPermission] = useState('unknown'); // 'unknown' | 'granted' | 'denied'
  
  // Saved locations
  const [savedHomeLocation, setSavedHomeLocation] = useState(null); // { lat, lng }
  const [showHomeIndicator, setShowHomeIndicator] = useState(true);
  const [targetLocation, setTargetLocation] = useState({ lat: '', lng: '' }); // Custom target
  const [showTargetIndicator, setShowTargetIndicator] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // BUKUR TIME SYSTEM
  // Formula: BUKUR_Hour = (Standard_Hour - 8 + 24) mod 24
  // 08:00 AM = Hour 0 (beginning of BUKUR day)
  // 07:59 AM = Hour 24 (end of BUKUR day)
  // ═══════════════════════════════════════════════════════════════
  const getBUKURHour = (date) => {
    const standardHour = date.getHours();
    return (standardHour - 8 + 24) % 24;
  };

  const getStandardFromBUKUR = (bukurHour) => {
    return (bukurHour + 8) % 24;
  };

  // ═══════════════════════════════════════════════════════════════
  // BUKUR PHASES (5 phases matching B-U-K-U-R)
  // ═══════════════════════════════════════════════════════════════
  const getBUKURPhase = (bukurHour) => {
    if (bukurHour >= 0 && bukurHour < 5) return { name: 'البَدء', nameEn: 'Al-Bad\'', color: '#D4AF37', phase: 1 };
    if (bukurHour >= 5 && bukurHour < 10) return { name: 'الوُصلة', nameEn: 'Al-Wuslah', color: '#8B5CF6', phase: 2 };
    if (bukurHour >= 10 && bukurHour < 14) return { name: 'الكَشف', nameEn: 'Al-Kashf', color: '#DC2626', phase: 3 };
    if (bukurHour >= 14 && bukurHour < 18) return { name: 'الوَقفة', nameEn: 'Al-Waqfah', color: '#2563EB', phase: 4 };
    return { name: 'الرُجوع', nameEn: 'Al-Ruju\'', color: '#059669', phase: 5 };
  };

  // ═══════════════════════════════════════════════════════════════
  // 24 ARABIC HOUR NAMES
  // ═══════════════════════════════════════════════════════════════
  const arabicHourNames = [
    'ساعة الصفر', 'ساعة البداية', 'ساعة النشاط', 'ساعة العمل', 'ساعة الذروة',
    'ساعة الجسر', 'ساعة الوصل', 'ساعة الإبداع', 'ساعة التأمل', 'ساعة الراحة',
    'ساعة الغروب', 'ساعة الأُفُق', 'ساعة المراجعة', 'ساعة السكينة', 'ساعة الهدوء',
    'ساعة الليل', 'ساعة العمق', 'ساعة الصمت', 'ساعة السر', 'ساعة الفجر',
    'ساعة السَحَر', 'ساعة النور', 'ساعة الإشراق', 'ساعة الختم'
  ];

  const englishHourNames = [
    'Hour Zero', 'Hour of Beginning', 'Hour of Activity', 'Hour of Work', 'Hour of Peak',
    'Hour of Bridge', 'Hour of Connection', 'Hour of Creativity', 'Hour of Reflection', 'Hour of Rest',
    'Hour of Sunset', 'Hour of Horizon', 'Hour of Review', 'Hour of Serenity', 'Hour of Calm',
    'Hour of Night', 'Hour of Depth', 'Hour of Silence', 'Hour of Secret', 'Hour of Dawn',
    'Hour of Pre-Dawn', 'Hour of Light', 'Hour of Sunrise', 'Hour of Seal'
  ];

  // ═══════════════════════════════════════════════════════════════
  // TRANSLATIONS
  // ═══════════════════════════════════════════════════════════════
  const t = {
    // Header
    title: language === 'ar' ? 'اَلْبُكُورُ' : 'BUKUR',
    subtitle: language === 'ar' ? 'ساعة البُكُور' : 'BUKUR WATCH',
    
    // Status
    bukurHour: language === 'ar' ? 'ساعة البُكُور' : 'BUKUR Hour',
    phase: language === 'ar' ? 'المرحلة' : 'Phase',
    
    // Awake
    awakeSince: language === 'ar' ? 'مستيقظ منذ' : 'Awake for',
    status: language === 'ar' ? 'الحالة' : 'Status',
    h: language === 'ar' ? 'س' : 'h',
    m: language === 'ar' ? 'د' : 'm',
    
    // GMT
    timezone: language === 'ar' ? 'المنطقة' : 'Timezone',
    time: language === 'ar' ? 'الوقت' : 'Time',
    
    // Settings
    settings: language === 'ar' ? 'الإعدادات ⚙️' : 'Settings ⚙️',
    hideSettings: language === 'ar' ? 'إخفاء الإعدادات' : 'Hide Settings',
    
    // Language
    languageLabel: language === 'ar' ? 'اللغة:' : 'Language:',
    arabic: 'العربية',
    english: 'English',
    
    // Bezel
    bezelContent: language === 'ar' ? 'محتوى الإطار:' : 'Bezel Content:',
    noBezel: language === 'ar' ? 'بدون إطار' : 'No Bezel',
    withBezel: language === 'ar' ? 'مع إطار' : 'With Bezel',
    hours24: language === 'ar' ? '٢٤س' : '24h',
    hours12: language === 'ar' ? '١٢س' : '12h',
    minutes: language === 'ar' ? 'دقائق' : 'Min',
    seconds: language === 'ar' ? 'ثواني' : 'Sec',
    days: language === 'ar' ? 'أيام' : 'Days',
    weeks: language === 'ar' ? 'أسابيع' : 'Weeks',
    months: language === 'ar' ? 'شهور' : 'Months',
    
    // Compass
    compass: language === 'ar' ? 'بوصلة' : 'Compass',
    compassSettings: language === 'ar' ? 'إعدادات البوصلة:' : 'Compass Settings:',
    northIndicator: language === 'ar' ? 'اتجاه الشمال' : 'North Direction',
    qiblaIndicator: language === 'ar' ? 'اتجاه القبلة' : 'Qibla Direction',
    enableCompass: language === 'ar' ? 'تفعيل البوصلة' : 'Enable Compass',
    compassPermissionNeeded: language === 'ar' ? 'يحتاج إذن الوصول للبوصلة' : 'Compass permission needed',
    requestPermission: language === 'ar' ? 'طلب الإذن' : 'Request Permission',
    north: language === 'ar' ? 'ش' : 'N',
    south: language === 'ar' ? 'ج' : 'S',
    east: language === 'ar' ? 'شر' : 'E',
    west: language === 'ar' ? 'غ' : 'W',
    qibla: language === 'ar' ? 'قبلة' : 'Qibla',
    mecca: language === 'ar' ? 'مكة' : 'Mecca',
    
    // Location markers
    saveCurrentLocation: language === 'ar' ? 'حفظ موقعي الحالي' : 'Save My Location',
    homeLocation: language === 'ar' ? 'موقعي الدائم' : 'My Home Location',
    showHomeIndicator: language === 'ar' ? 'إظهار موقعي' : 'Show My Location',
    targetLocation: language === 'ar' ? 'الوجهة المستهدفة' : 'Target Destination',
    enterCoordinates: language === 'ar' ? 'أدخل الإحداثيات:' : 'Enter Coordinates:',
    latitude: language === 'ar' ? 'خط العرض' : 'Latitude',
    longitude: language === 'ar' ? 'خط الطول' : 'Longitude',
    showTargetIndicator: language === 'ar' ? 'إظهار الوجهة' : 'Show Target',
    clearTarget: language === 'ar' ? 'مسح الوجهة' : 'Clear Target',
    locationSaved: language === 'ar' ? 'تم حفظ الموقع!' : 'Location Saved!',
    noLocationSaved: language === 'ar' ? 'لم يُحفظ موقع بعد' : 'No location saved yet',
    
    // Dial
    dialNumbers: language === 'ar' ? 'أرقام الميناء:' : 'Dial Numbers:',
    showDialNumbers: language === 'ar' ? 'أرقام الميناء:' : 'Dial Numbers:',
    withNumbers: language === 'ar' ? 'مع أرقام' : 'With Numbers',
    noNumbers: language === 'ar' ? 'بدون أرقام' : 'No Numbers',
    onlyInfinity: language === 'ar' ? '∞ فقط' : '∞ only',
    allNumbers: language === 'ar' ? 'الكل' : 'All',
    
    // Hour mode
    hourSystem: language === 'ar' ? 'نظام الساعة:' : 'Hour System:',
    h24System: language === 'ar' ? '٢٤ ساعة (افتراضي)' : '24 hour (default)',
    h12System: language === 'ar' ? '١٢ ساعة' : '12 hour',
    
    // Dial flip
    dialFlip: language === 'ar' ? 'قلب الميناء:' : 'Flip Dial:',
    infinityTop: language === 'ar' ? '∞ في الأعلى (افتراضي)' : '∞ at top (default)',
    infinityBottom: language === 'ar' ? '∞ في الأسفل' : '∞ at bottom',
    
    // Hands direction
    handsDir: language === 'ar' ? 'اتجاه العقارب:' : 'Hands Direction:',
    clockwise: language === 'ar' ? 'مع عقارب الساعة ↻' : 'Clockwise ↻',
    counterclockwise: language === 'ar' ? 'عكس عقارب الساعة ↺' : 'Counter-clockwise ↺',
    
    // Arabic hour name
    arabicHourName: language === 'ar' ? 'اسم الساعة:' : 'Hour Name:',
    hidden: language === 'ar' ? 'مخفي' : 'Hidden',
    
    // Markers
    minuteMarkers: language === 'ar' ? 'مؤشرات الدقائق:' : 'Minute Markers:',
    secondMarkers: language === 'ar' ? 'مؤشرات الثواني:' : 'Second Markers:',
    trackMinute: language === 'ar' ? 'تتبع الدقيقة الحالية' : 'Track current minute',
    trackSecond: language === 'ar' ? 'تتبع الثانية الحالية' : 'Track current second',
    
    // Hands visibility
    minuteHand: language === 'ar' ? 'عقرب الدقائق:' : 'Minute Hand:',
    secondHand: language === 'ar' ? 'عقرب الثواني:' : 'Second Hand:',
    visible: language === 'ar' ? 'ظاهر' : 'Visible',
    
    // Dial mode
    dialMode: language === 'ar' ? 'الميناء:' : 'Dial Mode:',
    clean: language === 'ar' ? 'نظيف' : 'Clean',
    dayNight: language === 'ar' ? 'ليل/نهار' : 'Day/Night',
    
    // Night period
    nightPeriod: language === 'ar' ? 'فترة الليل:' : 'Night Period:',
    autoNight: language === 'ar' ? 'تلقائي' : 'Auto',
    
    // Night color
    nightColor: language === 'ar' ? 'لون الليل:' : 'Night Color:',
    summer: language === 'ar' ? 'صيف' : 'Summer',
    winter: language === 'ar' ? 'شتاء' : 'Winter',
    spring: language === 'ar' ? 'ربيع' : 'Spring',
    autumn: language === 'ar' ? 'خريف' : 'Autumn',
    
    // Sunrise & Sunset
    sunriseSunset: language === 'ar' ? 'الشروق والغروب:' : 'Sunrise & Sunset:',
    showSunrise: language === 'ar' ? 'فترة الشروق' : 'Sunrise Period',
    showSunset: language === 'ar' ? 'فترة الغروب' : 'Sunset Period',
    sunriseTime: language === 'ar' ? 'الشروق' : 'Sunrise',
    sunsetTime: language === 'ar' ? 'الغروب' : 'Sunset',
    
    // Wake time
    wakeTime: language === 'ar' ? 'وقت الاستيقاظ:' : 'Wake Time:',
    hour: language === 'ar' ? 'الساعة' : 'Hour',
    minute: language === 'ar' ? 'الدقيقة' : 'Minute',
    
    // Sleep Tracking
    sleepTracking: language === 'ar' ? 'تتبع النوم' : 'Sleep Tracking',
    iWokeUp: language === 'ar' ? '☀️ استيقظت' : '☀️ I Woke Up',
    goingToSleep: language === 'ar' ? '🌙 ذاهب للنوم' : '🌙 Going to Sleep',
    wokeUpAt: language === 'ar' ? 'استيقظت الساعة:' : 'Woke up at:',
    sleptAt: language === 'ar' ? 'نمت الساعة:' : 'Slept at:',
    sleepDuration: language === 'ar' ? 'مدة النوم:' : 'Sleep Duration:',
    notRecorded: language === 'ar' ? 'لم يُسجّل بعد' : 'Not recorded yet',
    clearSleepData: language === 'ar' ? 'مسح البيانات' : 'Clear Data',
    
    // Alarms & Sleep Settings
    alarmSettings: language === 'ar' ? '⏰ إعدادات المنبه والنوم' : '⏰ Alarm & Sleep Settings',
    alarmTime: language === 'ar' ? 'وقت المنبه:' : 'Alarm Time:',
    desiredSleepHours: language === 'ar' ? 'ساعات النوم المطلوبة:' : 'Desired Sleep Hours:',
    awakeTrackingHours: language === 'ar' ? 'ساعات اليقظة للمتابعة:' : 'Awake Hours to Track:',
    recommendedBedtime: language === 'ar' ? 'وقت النوم الموصى به:' : 'Recommended Bedtime:',
    hoursUnit: language === 'ar' ? 'ساعات' : 'hours',
    
    // Awake progress
    awakeProgress: language === 'ar' ? 'مؤشر اليقظة:' : 'Awake Progress:',
    
    // GMT
    gmtComplication: language === 'ar' ? 'تعقيدة GMT:' : 'GMT Complication:',
    gmtDesc: language === 'ar' ? 'عقرب منطقة زمنية ثانية' : 'Second timezone hand',
    timeDiff: language === 'ar' ? 'الفارق الزمني:' : 'Time Offset:',
    hourUnit: language === 'ar' ? 'ساعة' : 'hour',
    quickSelect: language === 'ar' ? 'اختيار سريع:' : 'Quick Select:',
    
    // Hand Styles
    handStyle: language === 'ar' ? 'شكل العقارب' : 'Hand Style',
    handStyleBaton: language === 'ar' ? 'باتون (عصا)' : 'Baton',
    handStyleSword: language === 'ar' ? 'سيف' : 'Sword',
    handStyleDauphine: language === 'ar' ? 'دوفين' : 'Dauphine',
    handStyleLeaf: language === 'ar' ? 'ورقة' : 'Leaf',
    handStyleMercedes: language === 'ar' ? 'مرسيدس' : 'Mercedes',
    handStyleAlpha: language === 'ar' ? 'ألفا' : 'Alpha',
    handStyleArrow: language === 'ar' ? 'سهم' : 'Arrow',
    handStyleBreguet: language === 'ar' ? 'بريغيه' : 'Breguet',
    handStyleCathedral: language === 'ar' ? 'كاتدرائية' : 'Cathedral',
    handStyleSnowflake: language === 'ar' ? 'ندفة ثلج' : 'Snowflake',
    handStyleSyringe: language === 'ar' ? 'حقنة' : 'Syringe',
    handStyleSkeleton: language === 'ar' ? 'هيكلي' : 'Skeleton',
    
    // Reset
    resetBezel: language === 'ar' ? 'إعادة ضبط الإطار ↺' : 'Reset Bezel ↺',
    
    // Footer
    footerText: language === 'ar' ? '∞ = 8 = البداية من النور' : '∞ = 8 = Beginning from Light',
  };

  const getHourName = (hour) => {
    return language === 'ar' ? arabicHourNames[hour] : englishHourNames[hour];
  };

  // ═══════════════════════════════════════════════════════════════
  // GMT TIMEZONE DATA
  // ═══════════════════════════════════════════════════════════════
  const timezones = [
    { offset: -12, city: 'بيكر', cityEn: 'Baker Island' },
    { offset: -11, city: 'ساموا', cityEn: 'Samoa' },
    { offset: -10, city: 'هاواي', cityEn: 'Hawaii' },
    { offset: -9, city: 'ألاسكا', cityEn: 'Alaska' },
    { offset: -8, city: 'لوس أنجلوس', cityEn: 'Los Angeles' },
    { offset: -7, city: 'دنفر', cityEn: 'Denver' },
    { offset: -6, city: 'شيكاغو', cityEn: 'Chicago' },
    { offset: -5, city: 'نيويورك', cityEn: 'New York' },
    { offset: -4, city: 'كراكاس', cityEn: 'Caracas' },
    { offset: -3, city: 'ساو باولو', cityEn: 'São Paulo' },
    { offset: -2, city: 'الأطلسي', cityEn: 'Mid-Atlantic' },
    { offset: -1, city: 'الأزور', cityEn: 'Azores' },
    { offset: 0, city: 'لندن', cityEn: 'London (GMT)' },
    { offset: 1, city: 'باريس', cityEn: 'Paris' },
    { offset: 2, city: 'القاهرة', cityEn: 'Cairo' },
    { offset: 3, city: 'الرياض', cityEn: 'Riyadh' },
    { offset: 4, city: 'دبي', cityEn: 'Dubai' },
    { offset: 5, city: 'كراتشي', cityEn: 'Karachi' },
    { offset: 6, city: 'دكا', cityEn: 'Dhaka' },
    { offset: 7, city: 'بانكوك', cityEn: 'Bangkok' },
    { offset: 8, city: 'بكين', cityEn: 'Beijing' },
    { offset: 9, city: 'طوكيو', cityEn: 'Tokyo' },
    { offset: 10, city: 'سيدني', cityEn: 'Sydney' },
    { offset: 11, city: 'نوميا', cityEn: 'Nouméa' },
    { offset: 12, city: 'أوكلاند', cityEn: 'Auckland' },
    { offset: 13, city: 'تونغا', cityEn: 'Tonga' },
    { offset: 14, city: 'كيريتيماتي', cityEn: 'Kiritimati' },
  ];

  const getTimezoneByOffset = (offset) => {
    return timezones.find(tz => tz.offset === offset) || { city: 'غير معروف', cityEn: 'Unknown' };
  };

  // ═══════════════════════════════════════════════════════════════
  // TIME UPDATE
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 50); // 50ms for smooth animation
    return () => clearInterval(timer);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // LOCAL STORAGE PERSISTENCE
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bukur-watch-settings');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.bezelRotation !== undefined) setBezelRotation(s.bezelRotation);
        if (s.dialMode) setDialMode(s.dialMode);
        if (s.dialNightMode) setDialNightMode(s.dialNightMode);
        if (s.nightColorMode) setNightColorMode(s.nightColorMode);
        if (s.showSunrise !== undefined) setShowSunrise(s.showSunrise);
        if (s.showSunset !== undefined) setShowSunset(s.showSunset);
        if (s.nightGradientMode) setNightGradientMode(s.nightGradientMode);
        if (s.dailyWakeHour !== undefined) setDailyWakeHour(s.dailyWakeHour);
        if (s.dailyWakeMinute !== undefined) setDailyWakeMinute(s.dailyWakeMinute);
        if (s.showAwakeProgress !== undefined) setShowAwakeProgress(s.showAwakeProgress);
        if (s.awakeTrackingHours !== undefined) setAwakeTrackingHours(s.awakeTrackingHours);
        if (s.bezelContent) {
          const bezels = Array.isArray(s.bezelContent) ? s.bezelContent : [s.bezelContent];
          // Ensure compass is always first (outermost)
          if (bezels.includes('compass')) {
            const sortedBezels = ['compass', ...bezels.filter(b => b !== 'compass')];
            setBezelContent(sortedBezels);
          } else {
            setBezelContent(bezels);
          }
        }
        if (s.showBezel !== undefined) setShowBezel(s.showBezel);
        if (s.dialContent) setDialContent(s.dialContent);
        if (s.showDialNumbers !== undefined) setShowDialNumbers(s.showDialNumbers);
        if (s.dialFlipped !== undefined) setDialFlipped(s.dialFlipped);
        if (s.handsDirection) setHandsDirection(s.handsDirection);
        if (s.gmtEnabled !== undefined) setGmtEnabled(s.gmtEnabled);
        if (s.gmtOffset !== undefined) setGmtOffset(s.gmtOffset);
        if (s.showArabicHourName !== undefined) setShowArabicHourName(s.showArabicHourName);
        if (s.hourMode) setHourMode(s.hourMode);
        if (s.showMinuteMarkers !== undefined) setShowMinuteMarkers(s.showMinuteMarkers);
        if (s.showSecondMarkers !== undefined) setShowSecondMarkers(s.showSecondMarkers);
        if (s.showMinuteHand !== undefined) setShowMinuteHand(s.showMinuteHand);
        if (s.showSecondHand !== undefined) setShowSecondHand(s.showSecondHand);
        if (s.handStyle) setHandStyle(s.handStyle);
        if (s.language) setLanguage(s.language);
        if (s.showNorthIndicator !== undefined) setShowNorthIndicator(s.showNorthIndicator);
        if (s.showQiblaIndicator !== undefined) setShowQiblaIndicator(s.showQiblaIndicator);
        if (s.savedHomeLocation) setSavedHomeLocation(s.savedHomeLocation);
        if (s.showHomeIndicator !== undefined) setShowHomeIndicator(s.showHomeIndicator);
        if (s.targetLocation) setTargetLocation(s.targetLocation);
        if (s.showTargetIndicator !== undefined) setShowTargetIndicator(s.showTargetIndicator);
        // Sleep tracking
        if (s.wakeUpTime) setWakeUpTime(s.wakeUpTime);
        if (s.sleepTime) setSleepTime(s.sleepTime);
        if (s.alarmHour !== undefined) setAlarmHour(s.alarmHour);
        if (s.alarmMinute !== undefined) setAlarmMinute(s.alarmMinute);
        if (s.sleepDurationHours !== undefined) setSleepDurationHours(s.sleepDurationHours);
      }
    } catch (e) { console.log('Storage read error'); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('bukur-watch-settings', JSON.stringify({
        bezelRotation, dialMode, dialNightMode, nightColorMode, showSunrise, showSunset, nightGradientMode,
        dailyWakeHour, dailyWakeMinute, showAwakeProgress, awakeTrackingHours, bezelContent, showBezel, dialContent, showDialNumbers, dialFlipped, handsDirection,
        gmtEnabled, gmtOffset, showArabicHourName, hourMode, showMinuteMarkers, showSecondMarkers,
        showMinuteHand, showSecondHand, handStyle, language, showNorthIndicator, showQiblaIndicator,
        savedHomeLocation, showHomeIndicator, targetLocation, showTargetIndicator,
        wakeUpTime, sleepTime, alarmHour, alarmMinute, sleepDurationHours
      }));
    } catch (e) { console.log('Storage write error'); }
  }, [bezelRotation, dialMode, dialNightMode, nightColorMode, showSunrise, showSunset, nightGradientMode, dailyWakeHour, dailyWakeMinute, showAwakeProgress, awakeTrackingHours, bezelContent, showBezel, dialContent, showDialNumbers, dialFlipped, handsDirection, gmtEnabled, gmtOffset, showArabicHourName, hourMode, showMinuteMarkers, showSecondMarkers, showMinuteHand, showSecondHand, handStyle, language, showNorthIndicator, showQiblaIndicator, savedHomeLocation, showHomeIndicator, targetLocation, showTargetIndicator, wakeUpTime, sleepTime, alarmHour, alarmMinute, sleepDurationHours]);

  // ═══════════════════════════════════════════════════════════════
  // BEZEL ROTATION HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const getAngleFromCenter = (clientX, clientY) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  const handlePointerDown = (e) => {
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
    const outerRadius = rect.width / 2;
    const innerRadius = outerRadius * 0.4;
    if (distance > innerRadius && distance < outerRadius) {
      setIsDragging(true);
      lastAngleRef.current = getAngleFromCenter(clientX, clientY);
      e.preventDefault();
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    const currentAngle = getAngleFromCenter(clientX, clientY);
    let delta = currentAngle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    setBezelRotation(prev => prev + delta);
    lastAngleRef.current = currentAngle;
  };

  const handlePointerUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
      return () => {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [isDragging]);

  // ═══════════════════════════════════════════════════════════════
  // CALCULATIONS
  // ═══════════════════════════════════════════════════════════════
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  
  // GMT calculations (UTC-based)
  const utcHours = time.getUTCHours();
  const utcMinutes = time.getUTCMinutes();
  const gmtDisplayHours = (utcHours + gmtOffset + 24) % 24;
  
  const bukurHour = getBUKURHour(time);
  const currentPhase = getBUKURPhase(bukurHour);

  // Awake time calculation - use alarm time as wake time for tracking
  // MUST be calculated before hourAngle for 24h mode
  const wakeStandardHour = alarmHour; // Now using alarm time directly
  const wakeTimeToday = new Date(time);
  wakeTimeToday.setHours(wakeStandardHour, alarmMinute, 0, 0);
  if (time < wakeTimeToday) {
    wakeTimeToday.setDate(wakeTimeToday.getDate() - 1);
  }
  const awakeMs = time - wakeTimeToday;
  const awakeHoursDecimal = awakeMs / (1000 * 60 * 60); // Decimal hours for smooth hand movement
  const awakeHours = Math.floor(awakeHoursDecimal);
  const awakeMinutes = Math.floor((awakeMs % (1000 * 60 * 60)) / (1000 * 60));

  // Hand angles (based on hour mode)
  // 24h: uses awake hours (starts from wake time), 15° per hour
  // 12h: uses standard hour, 30° per hour, 0.5° per minute
  const hourAngle = hourMode === '12' 
    ? ((hours % 12) * 30) + (minutes * 0.5) - 90
    : (awakeHoursDecimal * 15) - 90;  // Uses awake hours for 24h bezel alignment
  const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90;
  const secondAngle = (seconds * 6) - 90;
  
  // Calculate BUKUR hour from alarm time (for display)
  const alarmBukurHour = (alarmHour - 8 + 24) % 24;

  // Status based on awake hours (relative to tracking hours)
  const getAwakeStatus = () => {
    const quarter = awakeTrackingHours / 4;
    const half = awakeTrackingHours / 2;
    const threeQuarter = (awakeTrackingHours * 3) / 4;
    
    if (awakeHours < quarter) return { text: 'نشيط', textEn: 'Active', color: '#22c55e', emoji: '⚡' };
    if (awakeHours < half) return { text: 'متيقظ', textEn: 'Alert', color: '#eab308', emoji: '👁️' };
    if (awakeHours < threeQuarter) return { text: 'متعب', textEn: 'Tired', color: '#f97316', emoji: '😴' };
    return { text: 'نَم!', textEn: 'Sleep!', color: '#ef4444', emoji: '🛏️' };
  };
  const awakeStatus = getAwakeStatus();

  // Night zone calculation
  // Auto night mode: calculate approximate sunset/sunrise based on month
  const getAutoNightTimes = () => {
    const month = time.getMonth(); // 0-11
    // Approximate sunset/sunrise times by month (Northern Hemisphere)
    // Summer: later sunset, earlier sunrise (shorter nights)
    // Winter: earlier sunset, later sunrise (longer nights)
    const nightTimes = [
      { start: 17, end: 7 },  // Jan - sunset ~17:00, sunrise ~7:00
      { start: 18, end: 7 },  // Feb
      { start: 18, end: 6 },  // Mar
      { start: 19, end: 6 },  // Apr
      { start: 20, end: 5 },  // May
      { start: 21, end: 5 },  // Jun - summer, sunset ~21:00
      { start: 21, end: 5 },  // Jul
      { start: 20, end: 6 },  // Aug
      { start: 19, end: 6 },  // Sep
      { start: 18, end: 7 },  // Oct
      { start: 17, end: 7 },  // Nov
      { start: 17, end: 7 },  // Dec - winter, sunset ~17:00
    ];
    return nightTimes[month];
  };
  
  const getNightBounds = () => {
    if (dialNightMode === 'auto') {
      const autoTimes = getAutoNightTimes();
      return { start: autoTimes.start, end: autoTimes.end };
    } else if (dialNightMode === '18-06') {
      return { start: 18, end: 6 };
    } else {
      return { start: 20, end: 4 };
    }
  };
  
  const nightBounds = getNightBounds();
  const nightStart = nightBounds.start;
  const nightEnd = nightBounds.end;
  const isNightHour = (h) => {
    if (nightStart > nightEnd) return h >= nightStart || h < nightEnd;
    return h >= nightStart && h < nightEnd;
  };
  
  // Check if current time is night
  const currentHourForNight = time.getHours();
  const isNightTime = isNightHour(currentHourForNight);
  
  // Sunrise and Sunset times calculation based on month
  // Returns { sunriseStart, sunriseEnd, sunsetStart, sunsetEnd } in 24h format
  const getSunriseSunsetTimes = () => {
    const month = time.getMonth(); // 0-11
    // Approximate times by month (Northern Hemisphere)
    // Sunrise duration ~30-45 min, Sunset duration ~30-45 min
    const times = [
      { sunriseStart: 7, sunriseEnd: 8, sunsetStart: 16.5, sunsetEnd: 17.5 },   // Jan
      { sunriseStart: 6.5, sunriseEnd: 7.5, sunsetStart: 17.5, sunsetEnd: 18.5 }, // Feb
      { sunriseStart: 6, sunriseEnd: 7, sunsetStart: 18, sunsetEnd: 19 },       // Mar
      { sunriseStart: 5.5, sunriseEnd: 6.5, sunsetStart: 19, sunsetEnd: 20 },   // Apr
      { sunriseStart: 5, sunriseEnd: 6, sunsetStart: 19.5, sunsetEnd: 20.5 },   // May
      { sunriseStart: 4.5, sunriseEnd: 5.5, sunsetStart: 20.5, sunsetEnd: 21.5 }, // Jun
      { sunriseStart: 5, sunriseEnd: 6, sunsetStart: 20.5, sunsetEnd: 21.5 },   // Jul
      { sunriseStart: 5.5, sunriseEnd: 6.5, sunsetStart: 19.5, sunsetEnd: 20.5 }, // Aug
      { sunriseStart: 6, sunriseEnd: 7, sunsetStart: 18.5, sunsetEnd: 19.5 },   // Sep
      { sunriseStart: 6.5, sunriseEnd: 7.5, sunsetStart: 17.5, sunsetEnd: 18.5 }, // Oct
      { sunriseStart: 7, sunriseEnd: 8, sunsetStart: 16.5, sunsetEnd: 17.5 },   // Nov
      { sunriseStart: 7.5, sunriseEnd: 8.5, sunsetStart: 16, sunsetEnd: 17 },   // Dec
    ];
    return times[month];
  };
  
  const sunriseSunsetTimes = getSunriseSunsetTimes();
  
  // Saturated colors for sunrise (warm orange/gold) and sunset (warm red/purple)
  const sunriseColor = '#f59e0b'; // Amber/Orange
  const sunsetColor = '#ef4444';  // Red/Orange
  
  // Get current season based on month
  const getCurrentSeason = () => {
    const month = time.getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'spring';   // Mar, Apr, May
    if (month >= 5 && month <= 7) return 'summer';   // Jun, Jul, Aug
    if (month >= 8 && month <= 10) return 'autumn';  // Sep, Oct, Nov
    return 'winter';                                  // Dec, Jan, Feb
  };
  
  // Night colors for each season
  const seasonNightColors = {
    summer: '#1e3a5f',   // أزرق داكن فاتح - Light dark blue
    winter: '#4a1c2c',   // عنابي داكن - Dark burgundy/maroon
    spring: '#1a3d2e',   // أخضر ملكي داكن - Dark royal green
    autumn: '#3d2914',   // عودي داكن - Dark oud/brown
  };
  
  // Get night color based on mode
  const getNightColor = () => {
    if (nightColorMode === 'auto') {
      const currentSeason = getCurrentSeason();
      return seasonNightColors[currentSeason];
    }
    return seasonNightColors[nightColorMode] || seasonNightColors.summer;
  };
  
  const currentSeason = getCurrentSeason();
  const nightColor = getNightColor();

  // ═══════════════════════════════════════════════════════════════
  // DAILY TIMES (Prayer/Activity Times)
  // ═══════════════════════════════════════════════════════════════
  
  // Calculate daily times based on month (approximate for Northern Hemisphere)
  const getDailyTimes = () => {
    const month = time.getMonth(); // 0-11
    
    // Times vary by month (approximate)
    const dailyTimes = [
      // Jan: Winter - short days
      { ishraq: 7.5, duha: 9, dhuhr: 12, asr: 15, aseel: 16.5, maghrib: 17.5, isha: 19 },
      // Feb
      { ishraq: 7, duha: 9, dhuhr: 12, asr: 15.5, aseel: 17, maghrib: 18, isha: 19.5 },
      // Mar
      { ishraq: 6.5, duha: 8.5, dhuhr: 12, asr: 15.5, aseel: 17.5, maghrib: 18.5, isha: 20 },
      // Apr
      { ishraq: 6, duha: 8, dhuhr: 12, asr: 16, aseel: 18, maghrib: 19.5, isha: 21 },
      // May
      { ishraq: 5.5, duha: 7.5, dhuhr: 12, asr: 16.5, aseel: 18.5, maghrib: 20, isha: 21.5 },
      // Jun: Summer - long days
      { ishraq: 5, duha: 7, dhuhr: 12, asr: 16.5, aseel: 19, maghrib: 21, isha: 22.5 },
      // Jul
      { ishraq: 5, duha: 7, dhuhr: 12, asr: 16.5, aseel: 19, maghrib: 21, isha: 22.5 },
      // Aug
      { ishraq: 5.5, duha: 7.5, dhuhr: 12, asr: 16, aseel: 18.5, maghrib: 20, isha: 21.5 },
      // Sep
      { ishraq: 6, duha: 8, dhuhr: 12, asr: 15.5, aseel: 17.5, maghrib: 19, isha: 20.5 },
      // Oct
      { ishraq: 6.5, duha: 8.5, dhuhr: 12, asr: 15, aseel: 17, maghrib: 18, isha: 19.5 },
      // Nov
      { ishraq: 7, duha: 9, dhuhr: 12, asr: 14.5, aseel: 16, maghrib: 17, isha: 18.5 },
      // Dec: Winter
      { ishraq: 7.5, duha: 9, dhuhr: 12, asr: 14.5, aseel: 16, maghrib: 17, isha: 18.5 },
    ];
    
    return dailyTimes[month];
  };
  
  const dailyTimes = getDailyTimes();
  
  // Format decimal hour to HH:MM
  const formatDecimalTime = (decimalHour) => {
    const hours = Math.floor(decimalHour);
    const minutes = Math.round((decimalHour - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Get all daily times as array for iteration
  const getDailyTimesArray = () => {
    return [
      { id: 'ishraq', name: 'الإشراق', nameEn: 'Ishraq', time: dailyTimes.ishraq, icon: '🌅', color: '#fbbf24' },
      { id: 'duha', name: 'الضحى', nameEn: 'Duha', time: dailyTimes.duha, icon: '☀️', color: '#f59e0b' },
      { id: 'dhuhr', name: 'الظهر', nameEn: 'Dhuhr', time: dailyTimes.dhuhr, icon: '🌞', color: '#eab308' },
      { id: 'asr', name: 'العصر', nameEn: 'Asr', time: dailyTimes.asr, icon: '🌤️', color: '#f97316' },
      { id: 'aseel', name: 'الأصيل', nameEn: 'Aseel', time: dailyTimes.aseel, icon: '🌇', color: '#ea580c' },
      { id: 'maghrib', name: 'المغرب', nameEn: 'Maghrib', time: dailyTimes.maghrib, icon: '🌆', color: '#dc2626' },
      { id: 'isha', name: 'العشاء', nameEn: 'Isha', time: dailyTimes.isha, icon: '🌙', color: '#7c3aed' },
    ];
  };
  
  // Calculate time remaining until next prayer/time
  const getNextDailyTime = () => {
    const now = time.getHours() + time.getMinutes() / 60;
    const times = getDailyTimesArray();
    
    // Find next time
    for (const t of times) {
      if (t.time > now) {
        const remainingHours = Math.floor(t.time - now);
        const remainingMinutes = Math.round(((t.time - now) - remainingHours) * 60);
        return {
          ...t,
          remainingHours,
          remainingMinutes,
          isPast: false
        };
      }
    }
    
    // If all times have passed, next is tomorrow's Ishraq
    const ishraq = times[0];
    const hoursUntilMidnight = 24 - now;
    const totalRemaining = hoursUntilMidnight + ishraq.time;
    const remainingHours = Math.floor(totalRemaining);
    const remainingMinutes = Math.round((totalRemaining - remainingHours) * 60);
    
    return {
      ...ishraq,
      remainingHours,
      remainingMinutes,
      isPast: false,
      isTomorrow: true
    };
  };
  
  const nextDailyTime = getNextDailyTime();
  const dailyTimesArray = getDailyTimesArray();

  // ═══════════════════════════════════════════════════════════════
  // SLEEP TRACKING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  // Record wake up time
  const recordWakeUp = () => {
    const now = new Date();
    setWakeUpTime({
      hour: now.getHours(),
      minute: now.getMinutes(),
      timestamp: now.getTime()
    });
  };
  
  // Record sleep time
  const recordSleep = () => {
    const now = new Date();
    setSleepTime({
      hour: now.getHours(),
      minute: now.getMinutes(),
      timestamp: now.getTime()
    });
  };
  
  // Calculate sleep duration between sleep time and wake up time
  const calculateSleepDuration = () => {
    if (!sleepTime || !wakeUpTime) return null;
    
    let durationMs = wakeUpTime.timestamp - sleepTime.timestamp;
    // If wake up is before sleep (next day), add 24 hours
    if (durationMs < 0) {
      durationMs += 24 * 60 * 60 * 1000;
    }
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };
  
  // Calculate recommended bedtime based on alarm and desired sleep hours
  const calculateRecommendedBedtime = () => {
    let bedtimeHour = alarmHour - sleepDurationHours;
    let bedtimeMinute = alarmMinute;
    
    // Handle negative hours (previous day)
    if (bedtimeHour < 0) {
      bedtimeHour += 24;
    }
    
    return { hour: bedtimeHour, minute: bedtimeMinute };
  };
  
  // Format time for display
  const formatTime = (hour, minute) => {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  };
  
  // Clear sleep data
  const clearSleepData = () => {
    setWakeUpTime(null);
    setSleepTime(null);
  };
  
  const sleepDuration = calculateSleepDuration();
  const recommendedBedtime = calculateRecommendedBedtime();

  // ═══════════════════════════════════════════════════════════════
  // COMPASS & QIBLA CALCULATION
  // ═══════════════════════════════════════════════════════════════
  
  // Mecca coordinates (Kaaba)
  const MECCA_LAT = 21.4225;
  const MECCA_LNG = 39.8262;
  
  // Calculate Qibla direction from user location
  const calculateQiblaDirection = (userLat, userLng) => {
    const lat1 = userLat * Math.PI / 180;
    const lat2 = MECCA_LAT * Math.PI / 180;
    const diffLng = (MECCA_LNG - userLng) * Math.PI / 180;
    
    const x = Math.cos(lat2) * Math.sin(diffLng);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(diffLng);
    
    let qibla = Math.atan2(x, y) * 180 / Math.PI;
    return (qibla + 360) % 360; // Normalize to 0-360
  };
  
  // Calculate direction from current location to any target location
  const calculateDirectionTo = (fromLat, fromLng, toLat, toLng) => {
    const lat1 = fromLat * Math.PI / 180;
    const lat2 = toLat * Math.PI / 180;
    const diffLng = (toLng - fromLng) * Math.PI / 180;
    
    const x = Math.cos(lat2) * Math.sin(diffLng);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(diffLng);
    
    let bearing = Math.atan2(x, y) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
  };
  
  // Calculate distance between two points (in km)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Get user location
  useEffect(() => {
    if (bezelContent.includes('compass') && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // موقع افتراضي محايد (الرياض) إن لم يُتح الموقع — لا إحداثيات شخصية في مستودع عام
          setUserLocation({ lat: 24.7136, lng: 46.6753 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [bezelContent]);
  
  // Request compass permission and listen to device orientation (iOS)
  const requestCompassPermission = async () => {
    const orientationHandler = (event) => {
      let heading = 0;
      if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
        heading = event.webkitCompassHeading;
      } else if (event.absolute === true && event.alpha !== null) {
        heading = (360 - event.alpha) % 360;
      } else if (event.alpha !== null) {
        heading = (360 - event.alpha) % 360;
      }
      if (!isNaN(heading)) {
        setCompassHeading(Math.round(heading));
      }
    };
    
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires permission
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        setCompassPermission(permission);
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', orientationHandler, true);
          window.addEventListener('deviceorientationabsolute', orientationHandler, true);
          console.log('iOS compass permission granted');
        }
      } catch (error) {
        console.log('Compass permission error:', error);
        setCompassPermission('denied');
      }
    } else {
      // Non-iOS or older browsers
      setCompassPermission('granted');
      window.addEventListener('deviceorientation', orientationHandler, true);
      window.addEventListener('deviceorientationabsolute', orientationHandler, true);
    }
  };
  
  // Setup compass listener - auto-start when compass bezel is selected
  useEffect(() => {
    if (!bezelContent.includes('compass')) return;
    
    let orientationHandler = (event) => {
      let heading = 0;
      
      // Try different methods to get compass heading
      if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
        // iOS Safari - most reliable for true north
        heading = event.webkitCompassHeading;
      } else if (event.absolute === true && event.alpha !== null) {
        // Android with absolute orientation (true north)
        heading = (360 - event.alpha) % 360;
      } else if (event.alpha !== null) {
        // Fallback - relative orientation
        heading = (360 - event.alpha) % 360;
      }
      
      // Only update if we got a valid heading
      if (!isNaN(heading)) {
        setCompassHeading(Math.round(heading));
      }
    };
    
    const startCompass = async () => {
      // Check if DeviceOrientationEvent exists
      if (typeof DeviceOrientationEvent === 'undefined') {
        console.log('DeviceOrientationEvent not supported');
        setCompassPermission('denied');
        return;
      }
      
      // iOS 13+ requires permission request triggered by user action
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        setCompassPermission('unknown'); // Will show button for iOS
      } else {
        // Android/Desktop - try to start listening automatically
        setCompassPermission('granted');
        
        // Try absolute orientation first (gives true north on Android)
        window.addEventListener('deviceorientationabsolute', orientationHandler, true);
        window.addEventListener('deviceorientation', orientationHandler, true);
        
        console.log('Compass listeners attached');
      }
    };
    
    startCompass();
    
    return () => {
      window.removeEventListener('deviceorientationabsolute', orientationHandler, true);
      window.removeEventListener('deviceorientation', orientationHandler, true);
    };
  }, [bezelContent]);
  
  // Calculate Qibla direction relative to device heading
  const qiblaDirection = userLocation 
    ? calculateQiblaDirection(userLocation.lat, userLocation.lng)
    : 135; // Default approximate direction from center of world
  
  // Calculate Home direction (from current location to saved home)
  const homeDirection = (userLocation && savedHomeLocation)
    ? calculateDirectionTo(userLocation.lat, userLocation.lng, savedHomeLocation.lat, savedHomeLocation.lng)
    : null;
  
  const homeDistance = (userLocation && savedHomeLocation)
    ? calculateDistance(userLocation.lat, userLocation.lng, savedHomeLocation.lat, savedHomeLocation.lng)
    : null;
  
  // Calculate Target direction (from current location to custom target)
  const targetLat = parseFloat(targetLocation.lat);
  const targetLng = parseFloat(targetLocation.lng);
  const hasValidTarget = !isNaN(targetLat) && !isNaN(targetLng) && targetLat >= -90 && targetLat <= 90 && targetLng >= -180 && targetLng <= 180;
  
  const targetDirection = (userLocation && hasValidTarget)
    ? calculateDirectionTo(userLocation.lat, userLocation.lng, targetLat, targetLng)
    : null;
  
  const targetDistance = (userLocation && hasValidTarget)
    ? calculateDistance(userLocation.lat, userLocation.lng, targetLat, targetLng)
    : null;

  // ═══════════════════════════════════════════════════════════════
  // RENDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  // Render compass bezel
  const renderCompassBezel = (outerR, innerR, bezelIndex) => {
    const markers = [];
    const textRadius = outerR - 11;
    const tickOuterR = outerR - 2;
    const tickInnerR = innerR + 4;
    
    // Compass directions - angles are fixed, the whole bezel rotates
    const directions = [
      { angle: 0, label: t.north, isMain: true },     // North at top
      { angle: 45, label: 'NE', isMain: false },
      { angle: 90, label: t.east, isMain: true },     // East
      { angle: 135, label: 'SE', isMain: false },
      { angle: 180, label: t.south, isMain: true },   // South
      { angle: 225, label: 'SW', isMain: false },
      { angle: 270, label: t.west, isMain: true },    // West
      { angle: 315, label: 'NW', isMain: false },
    ];
    
    // All compass elements go inside this array, then wrapped in rotating group
    const compassElements = [];
    
    // Background ring
    compassElements.push(
      <circle
        key={`compass-bg-${bezelIndex}`}
        cx="200"
        cy="200"
        r={(outerR + innerR) / 2}
        fill="none"
        stroke="#1f2937"
        strokeWidth={outerR - innerR}
      />
    );
    
    // Draw degree marks every 10 degrees - SKIP main directions (they have labels)
    for (let deg = 0; deg < 360; deg += 10) {
      const isMain = deg % 90 === 0;      // N, E, S, W
      const isMedium = deg % 45 === 0 && !isMain;  // NE, SE, SW, NW
      
      // Skip ticks at main direction positions (0, 90, 180, 270) - labels only
      if (isMain) continue;
      
      // Fixed angle - bezel itself rotates
      const angleRad = (deg - 90) * Math.PI / 180;
      
      const tickLength = isMedium ? 5 : 3;
      const tickWidth = isMedium ? 1.5 : 1;
      const tickColor = isMedium ? '#6b7280' : '#4b5563';
      
      compassElements.push(
        <line
          key={`compass-tick-${deg}`}
          x1={200 + (tickOuterR - tickLength) * Math.cos(angleRad)}
          y1={200 + (tickOuterR - tickLength) * Math.sin(angleRad)}
          x2={200 + tickOuterR * Math.cos(angleRad)}
          y2={200 + tickOuterR * Math.sin(angleRad)}
          stroke={tickColor}
          strokeWidth={tickWidth}
        />
      );
    }
    
    // Draw direction labels - LARGER and CLEARER
    directions.forEach(({ angle, label, isMain }) => {
      // Fixed angle - bezel itself rotates
      const angleRad = (angle - 90) * Math.PI / 180;
      const isNorth = angle === 0;
      
      compassElements.push(
        <text
          key={`compass-dir-${angle}`}
          x={200 + textRadius * Math.cos(angleRad)}
          y={200 + textRadius * Math.sin(angleRad)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={isMain ? 14 : 9}
          fontWeight={isMain ? '800' : '600'}
          fill={isNorth ? '#DC2626' : (isMain ? '#f5f5f4' : '#9ca3af')}
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {label}
        </text>
      );
    });
    
    // Wrap all compass elements in a rotating group based on device heading
    // When device points North, compassHeading = 0, so bezel stays at 0
    // When device points East, compassHeading = 90, bezel rotates -90 so N points left (actual North)
    markers.push(
      <g key={`compass-rotating-${bezelIndex}`} transform={`rotate(${-compassHeading}, 200, 200)`}>
        {compassElements}
      </g>
    );
    
    // Fixed indicators (outside the rotating group)
    
    // North indicator (red triangle) - FIXED at top (12 o'clock)
    // This shows the user "you are facing this direction"
    // When bezel rotates, N aligns with this marker when facing North
    if (showNorthIndicator) {
      const northR = outerR + 8;
      markers.push(
        <polygon
          key="north-indicator"
          points={`200,${200 - northR - 6} ${200 - 4},${200 - northR + 4} ${200 + 4},${200 - northR + 4}`}
          fill="#DC2626"
        />
      );
    }
    
    // Qibla indicator (Kaaba symbol) - points to Mecca (fixed position based on direction)
    if (showQiblaIndicator && userLocation) {
      const qiblaAngle = (qiblaDirection - compassHeading - 90) * Math.PI / 180;
      const qiblaR = outerR + 10;
      const qx = 200 + qiblaR * Math.cos(qiblaAngle);
      const qy = 200 + qiblaR * Math.sin(qiblaAngle);
      
      // Kaaba-shaped indicator (square with slight 3D effect)
      markers.push(
        <g key="qibla-indicator">
          {/* Kaaba base - dark square */}
          <rect
            x={qx - 5}
            y={qy - 5}
            width="10"
            height="10"
            fill="#1a1a1a"
            stroke="#D4AF37"
            strokeWidth="1.5"
            rx="1"
          />
          {/* Gold stripe (Kiswa band) */}
          <line
            x1={qx - 5}
            y1={qy}
            x2={qx + 5}
            y2={qy}
            stroke="#D4AF37"
            strokeWidth="2"
          />
        </g>
      );
    }
    
    // Home indicator (house symbol) - points to saved home location
    if (showHomeIndicator && savedHomeLocation && homeDirection !== null) {
      const homeAngle = (homeDirection - compassHeading - 90) * Math.PI / 180;
      const homeR = outerR + 10;
      const hx = 200 + homeR * Math.cos(homeAngle);
      const hy = 200 + homeR * Math.sin(homeAngle);
      
      // House-shaped indicator
      markers.push(
        <g key="home-indicator">
          {/* House base */}
          <rect
            x={hx - 4}
            y={hy - 2}
            width="8"
            height="6"
            fill="#3b82f6"
            rx="1"
          />
          {/* House roof */}
          <polygon
            points={`${hx},${hy - 7} ${hx - 5},${hy - 2} ${hx + 5},${hy - 2}`}
            fill="#3b82f6"
          />
          {/* Door */}
          <rect
            x={hx - 1.5}
            y={hy}
            width="3"
            height="4"
            fill="#1e3a8a"
          />
        </g>
      );
    }
    
    // Target indicator (crosshair/arrow) - points to custom target
    if (showTargetIndicator && hasValidTarget && targetDirection !== null) {
      const targetAngle = (targetDirection - compassHeading - 90) * Math.PI / 180;
      const targetR = outerR + 10;
      const tx = 200 + targetR * Math.cos(targetAngle);
      const ty = 200 + targetR * Math.sin(targetAngle);
      
      // Target crosshair indicator
      markers.push(
        <g key="target-indicator">
          {/* Outer circle */}
          <circle
            cx={tx}
            cy={ty}
            r="6"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
          {/* Inner dot */}
          <circle
            cx={tx}
            cy={ty}
            r="2"
            fill="#ef4444"
          />
          {/* Crosshairs */}
          <line x1={tx - 8} y1={ty} x2={tx - 4} y2={ty} stroke="#ef4444" strokeWidth="1.5" />
          <line x1={tx + 4} y1={ty} x2={tx + 8} y2={ty} stroke="#ef4444" strokeWidth="1.5" />
          <line x1={tx} y1={ty - 8} x2={tx} y2={ty - 4} stroke="#ef4444" strokeWidth="1.5" />
          <line x1={tx} y1={ty + 4} x2={tx} y2={ty + 8} stroke="#ef4444" strokeWidth="1.5" />
        </g>
      );
    }
    
    return markers;
  };
  
  const renderBezel = () => {
    // If bezel is hidden, return nothing
    if (!showBezel) return { compassMarkers: [], rotatableMarkers: [] };
    
    const compassMarkers = [];
    const rotatableMarkers = [];
    
    // Get current values for fading effect
    const currentHour24 = time.getHours();
    const currentBukurHour = (currentHour24 - 8 + 24) % 24; // BUKUR hour (0 = 8:00 AM)
    const currentHour12 = currentHour24 % 12;
    const currentMinute = time.getMinutes();
    const currentSecond = time.getSeconds();
    const currentDay = time.getDate();
    const currentWeek = Math.ceil((Math.floor((time - new Date(time.getFullYear(), 0, 1)) / (24 * 60 * 60 * 1000)) + 1) / 7);
    const currentMonth = time.getMonth() + 1; // 1-12
    
    // Render each selected bezel
    const selectedBezels = Array.isArray(bezelContent) ? bezelContent : [bezelContent];
    const bezelCount = selectedBezels.length;
    
    selectedBezels.forEach((bezelType, bezelIndex) => {
      // Calculate radius for this bezel (outer to inner)
      const baseOuterRadius = 198;
      const baseInnerRadius = 176;
      const bezelHeight = 22;
      const gap = 2;
      
      const outerR = baseOuterRadius - (bezelIndex * (bezelHeight + gap));
      const innerR = outerR - bezelHeight;
      
      // Handle compass bezel separately - FIXED, not rotatable
      if (bezelType === 'compass') {
        compassMarkers.push(...renderCompassBezel(outerR, innerR, bezelIndex));
        return;
      }
      
      const textRadius = outerR - 10;
      const tickOuterR = outerR - 2;
      const tickInnerR = innerR + 4;
      
      // Get bezel config - hours24 uses awake hours for fading!
      const getBezelConfig = (type) => {
        // For hours24, use awake hours (capped at 24) for the fading effect
        const awakeHoursCapped = Math.min(Math.floor(awakeHours), 24);
        
        switch (type) {
          case 'hours24': return { total: 24, current: awakeHoursCapped, mainInterval: 6, label: '24h' };
          case 'hours12': return { total: 12, current: currentHour12, mainInterval: 3, label: '12h' };
          case 'minutes': return { total: 60, current: currentMinute, mainInterval: 5, label: 'min' };
          case 'seconds': return { total: 60, current: currentSecond, mainInterval: 5, label: 'sec' };
          case 'days': return { total: 31, current: currentDay - 1, mainInterval: 5, label: 'day' };
          case 'weeks': return { total: 52, current: currentWeek - 1, mainInterval: 4, label: 'wk' };
          case 'months': return { total: 12, current: currentMonth - 1, mainInterval: 3, label: 'mo' };
          default: return { total: 24, current: awakeHoursCapped, mainInterval: 6, label: '24h' };
        }
      };
      
      const config = getBezelConfig(bezelType);
      const angleStep = 360 / config.total;
      
      // Direction multiplier for counter-clockwise AND dial flip
      const bezelDirMultiplier = handsDirection === 'counterclockwise' ? -1 : 1;
      const rotationOffset = dialFlipped ? 180 : 0;
      
      // Create arc path for passed time background - uses SAME formula as numbers
      const createArcPath = (currentIndex, inner, outer) => {
        // Use exact same angle formula as the numbers:
        // angle = ((i * angleStep - 90) * dir) + offset
        
        // Start at position 0
        const startBaseAngle = (0 * angleStep) - 90;
        const startAngle = (startBaseAngle * bezelDirMultiplier) + rotationOffset;
        
        // End at current position
        const endBaseAngle = (currentIndex * angleStep) - 90;
        const endAngle = (endBaseAngle * bezelDirMultiplier) + rotationOffset;
        
        const startRad = startAngle * Math.PI / 180;
        const endRad = endAngle * Math.PI / 180;
        
        const x1 = 200 + outer * Math.cos(startRad);
        const y1 = 200 + outer * Math.sin(startRad);
        const x2 = 200 + outer * Math.cos(endRad);
        const y2 = 200 + outer * Math.sin(endRad);
        const x3 = 200 + inner * Math.cos(endRad);
        const y3 = 200 + inner * Math.sin(endRad);
        const x4 = 200 + inner * Math.cos(startRad);
        const y4 = 200 + inner * Math.sin(startRad);
        
        const sweepDegrees = currentIndex * angleStep;
        const largeArc = sweepDegrees > 180 ? 1 : 0;
        // Sweep direction: 1 for clockwise, 0 for counter-clockwise
        const sweepFlag = bezelDirMultiplier === 1 ? 1 : 0;
        
        return `M ${x1} ${y1} A ${outer} ${outer} 0 ${largeArc} ${sweepFlag} ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArc} ${1 - sweepFlag} ${x4} ${y4} Z`;
      };
      
      // Add bezel ring background
      rotatableMarkers.push(
        <circle
          key={`bezel-bg-${bezelIndex}`}
          cx="200"
          cy="200"
          r={(outerR + innerR) / 2}
          fill="none"
          stroke="#3f3f46"
          strokeWidth={bezelHeight}
          opacity="0.3"
        />
      );
      
      // Add dark background arc for passed time
      if (config.current > 0) {
        rotatableMarkers.push(
          <path
            key={`passed-bg-${bezelIndex}`}
            d={createArcPath(config.current, innerR, outerR)}
            fill="rgba(0, 0, 0, 0.5)"
            stroke="none"
          />
        );
      }
      
      // Display value function
      const displayValue = (i) => {
        switch (bezelType) {
          case 'hours24':
            // Start from wake time (alarmHour)
            // i=0 shows ∞ (wake time), i=1 shows next hour, etc.
            if (i === 0) return '∞';
            const actualHour = (alarmHour + i) % 24;
            return actualHour.toString().padStart(2, '0');
          case 'hours12':
            return i.toString().padStart(2, '0');
          case 'minutes':
          case 'seconds':
            return i % 5 === 0 ? i.toString().padStart(2, '0') : '';
          case 'months':
            return (i + 1).toString();
          case 'weeks':
            const weekNum = i + 1;
            return (weekNum % 4 === 0 || weekNum === 1) ? weekNum.toString() : '';
          case 'days':
            const dayNum = i + 1;
            return (dayNum % 5 === 0 || dayNum === 1 || dayNum === 31) ? dayNum.toString() : '';
          default:
            return i.toString();
        }
      };
      
      // Check if passed/current
      const hasPassed = (i) => i < config.current;
      const isCurrent = (i) => i === config.current;
      
      for (let i = 0; i < config.total; i++) {
        // Apply direction multiplier AND rotation offset (same formula as dial/hands)
        const baseAngle = (i * angleStep) - 90;
        const angle = ((baseAngle * bezelDirMultiplier) + rotationOffset) * Math.PI / 180;
        const isMain = i % config.mainInterval === 0;
        const x = 200 + textRadius * Math.cos(angle);
        const y = 200 + textRadius * Math.sin(angle);
        
        const passed = hasPassed(i);
        const current = isCurrent(i);
        
        const getTextColor = () => {
          if (current) return '#22c55e';
          if (passed) return '#52525b';
          if (i === 0 && bezelType === 'hours24') return '#DC2626';
          return isMain ? '#f5f5f5' : '#a1a1aa';
        };
        
        const getTickColor = () => {
          if (current) return '#22c55e';
          if (passed) return '#3f3f46';
          return isMain ? '#f5f5f5' : '#71717a';
        };
        
        const textRotation = (baseAngle * bezelDirMultiplier) + rotationOffset + 90;
        const display = displayValue(i);
        
        // Tick marks for dense bezels
        if (bezelType === 'minutes' || bezelType === 'seconds' || bezelType === 'weeks' || bezelType === 'days') {
          const tInner = isMain ? tickInnerR : tickInnerR + 3;
          rotatableMarkers.push(
            <line
              key={`tick-${bezelIndex}-${i}`}
              x1={200 + tInner * Math.cos(angle)}
              y1={200 + tInner * Math.sin(angle)}
              x2={200 + tickOuterR * Math.cos(angle)}
              y2={200 + tickOuterR * Math.sin(angle)}
              stroke={getTickColor()}
              strokeWidth={current ? 3 : (isMain ? 2 : 1)}
            />
          );
        }
        
        if (display) {
          // Adjust font size based on bezel type and ring count
          let fontSize = isMain ? 12 : 9;
          if (bezelType === 'weeks') fontSize = isMain ? 8 : 6;
          if (bezelType === 'days') fontSize = isMain ? 9 : 7;
          if (bezelCount > 2) fontSize = Math.max(fontSize - 2, 6);
          
          rotatableMarkers.push(
            <g key={`text-${bezelIndex}-${i}`} transform={`rotate(${textRotation}, ${x}, ${y})`}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={current ? fontSize + 1 : fontSize}
                fontWeight={current ? '900' : (isMain ? '700' : '500')}
                fill={getTextColor()}
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {display}
              </text>
            </g>
          );
        }
      }
    });
    
    return { compassMarkers, rotatableMarkers };
  };

  const renderDial = () => {
    // Shrink dial when multiple bezels are selected (only if bezel is shown)
    const bezelCount = showBezel ? (Array.isArray(bezelContent) ? bezelContent.length : 1) : 0;
    const dialRadius = 155 - (bezelCount > 0 ? (bezelCount - 1) * 24 : 0);
    
    if (dialMode === 'clean') {
      return <circle cx="200" cy="200" r={dialRadius} fill="#f5f5f4" />;
    }
    
    // Day/Night split mode - clear division
    // Night hours based on dialNightMode setting (uses nightStart/nightEnd from getNightBounds)
    const nightStartHour = nightStart;
    const nightEndHour = nightEnd;
    
    // Calculate night duration in hours
    let nightDuration = nightEndHour - nightStartHour;
    if (nightDuration < 0) nightDuration += 24;
    
    // Each hour = 15 degrees (360/24)
    // Rotation offset for flipped dial
    const rotationOffset = dialFlipped ? 180 : 0;
    const directionMultiplier = handsDirection === 'counterclockwise' ? -1 : 1;
    
    // Calculate start and sweep angles
    // Start from 12 o'clock position (-90 degrees)
    // Match the hand angle formula: (base * direction) + offset
    const nightStartBaseAngle = (nightStartHour * 15) - 90;
    const nightStartAngle = (nightStartBaseAngle * directionMultiplier) + rotationOffset;
    const sweepAngle = nightDuration * 15 * directionMultiplier;
    
    // Create arc path using arc command
    const createArc = (startAngleDeg, sweepAngleDeg, radius) => {
      const startRad = startAngleDeg * Math.PI / 180;
      const endRad = (startAngleDeg + sweepAngleDeg) * Math.PI / 180;
      
      const x1 = 200 + radius * Math.cos(startRad);
      const y1 = 200 + radius * Math.sin(startRad);
      const x2 = 200 + radius * Math.cos(endRad);
      const y2 = 200 + radius * Math.sin(endRad);
      
      // Large arc flag: 1 if sweep > 180 degrees
      const largeArc = Math.abs(sweepAngleDeg) > 180 ? 1 : 0;
      // Sweep flag: 1 for clockwise, 0 for counter-clockwise
      const sweepFlag = sweepAngleDeg > 0 ? 1 : 0;
      
      return `M 200 200 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${x2} ${y2} Z`;
    };
    
    return (
      <>
        {/* Base circle - day color (white) */}
        <circle cx="200" cy="200" r={dialRadius} fill="#f5f5f4" />
        
        {/* Night section - seasonal color */}
        <path
          d={createArc(nightStartAngle, sweepAngle, dialRadius)}
          fill={nightColor}
        />
        
        {/* Sunrise section - warm orange/gold gradient */}
        {showSunrise && (
          <>
            {(() => {
              const sunriseDuration = sunriseSunsetTimes.sunriseEnd - sunriseSunsetTimes.sunriseStart;
              const sunriseStartBaseAngle = (sunriseSunsetTimes.sunriseStart * 15) - 90;
              const sunriseStartAngle = (sunriseStartBaseAngle * directionMultiplier) + rotationOffset;
              const sunriseSweepAngle = sunriseDuration * 15 * directionMultiplier;
              return (
                <path
                  d={createArc(sunriseStartAngle, sunriseSweepAngle, dialRadius)}
                  fill="url(#sunriseGradient)"
                  opacity="0.7"
                />
              );
            })()}
          </>
        )}
        
        {/* Sunset section - warm red/purple gradient */}
        {showSunset && (
          <>
            {(() => {
              const sunsetDuration = sunriseSunsetTimes.sunsetEnd - sunriseSunsetTimes.sunsetStart;
              const sunsetStartBaseAngle = (sunriseSunsetTimes.sunsetStart * 15) - 90;
              const sunsetStartAngle = (sunsetStartBaseAngle * directionMultiplier) + rotationOffset;
              const sunsetSweepAngle = sunsetDuration * 15 * directionMultiplier;
              return (
                <path
                  d={createArc(sunsetStartAngle, sunsetSweepAngle, dialRadius)}
                  fill="url(#sunsetGradient)"
                  opacity="0.7"
                />
              );
            })()}
          </>
        )}
        
        {/* Subtle border */}
        <circle cx="200" cy="200" r={dialRadius} fill="none" stroke="#d4d4d4" strokeWidth="0.5" />
        
        {/* Gradient definitions */}
        <defs>
          <radialGradient id="sunriseGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="sunsetGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.5" />
          </radialGradient>
        </defs>
      </>
    );
  };

  const renderHourMarkers = () => {
    // If dial numbers are hidden, return nothing
    if (!showDialNumbers) return null;
    
    const markers = [];
    const bezelCount = showBezel ? (Array.isArray(bezelContent) ? bezelContent.length : 1) : 0;
    const baseRadius = 145 - (bezelCount > 0 ? (bezelCount - 1) * 24 : 0);
    
    // Rotation offset: 0 for normal (00 at top), 180 for flipped (00 at bottom)
    const rotationOffset = dialFlipped ? 180 : 0;
    
    // Direction multiplier: 1 for clockwise, -1 for counter-clockwise
    const directionMultiplier = handsDirection === 'counterclockwise' ? -1 : 1;
    
    // Total marks and angle step based on hour mode
    const totalMarks = hourMode === '12' ? 12 : 24;
    const angleStep = hourMode === '12' ? 30 : 15; // 360/12 or 360/24
    
    // Determine which numbers to show based on dialContent (adjusted for 12h mode)
    const getVisibleNumbers = () => {
      if (hourMode === '12') {
        switch (dialContent) {
          case 'full0': return [0]; // Only 12
          case 'full1': return Array.from({ length: 12 }, (_, i) => i); // All
          case 'full2': return [0, 6]; // 12 and 6
          case 'full3': return [0, 4, 8]; // 12, 4, 8
          case 'full4': return [0, 3, 6, 9]; // 12, 3, 6, 9
          case 'full6': return [0, 2, 4, 6, 8, 10]; // Every 2
          default: return [0, 3, 6, 9];
        }
      } else {
        switch (dialContent) {
          case 'full0': return [0];
          case 'full1': return Array.from({ length: 24 }, (_, i) => i);
          case 'full2': return [0, 12];
          case 'full3': return [0, 8, 16];
          case 'full4': return [0, 6, 12, 18];
          case 'full6': return [0, 4, 8, 12, 16, 20];
          default: return [0, 6, 12, 18];
        }
      }
    };
    
    const visibleNumbers = getVisibleNumbers();
    const isMainHour = (i) => {
      if (hourMode === '12') {
        switch (dialContent) {
          case 'full0': return i === 0;
          case 'full1': return i % 3 === 0;
          case 'full2': return true;
          case 'full3': return true;
          case 'full4': return true;
          case 'full6': return true;
          default: return i % 3 === 0;
        }
      } else {
        switch (dialContent) {
          case 'full0': return i === 0;
          case 'full1': return i % 6 === 0;
          case 'full2': return true;
          case 'full3': return true;
          case 'full4': return true;
          case 'full6': return true;
          default: return i % 6 === 0;
        }
      }
    };
    
    // Check if hour falls in night zone (for color adjustment)
    const isHourInNightZone = (hourIndex) => {
      if (dialMode !== 'daynight') return false;
      // Convert 12h index to 24h if needed
      const hour24 = hourMode === '12' ? (hourIndex === 0 ? 0 : hourIndex * 2) : hourIndex;
      return isNightHour(hour24);
    };
    
    for (let i = 0; i < totalMarks; i++) {
      // Apply direction multiplier to angle calculation - match hand angle formula
      const baseAngle = (i * angleStep) - 90;
      const angle = ((baseAngle * directionMultiplier) + rotationOffset) * Math.PI / 180;
      const isMain = isMainHour(i);
      const outerR = baseRadius;
      const innerR = isMain ? baseRadius - 15 : baseRadius - 8;
      
      // Determine if this hour is in night zone for color
      const inNightZone = isHourInNightZone(i);
      
      // Tick mark colors - lighter in night zone
      const tickColor = visibleNumbers.includes(i) 
        ? (inNightZone ? '#fbbf24' : '#D4AF37')  // Gold / Bright yellow
        : (inNightZone ? '#a1a1aa' : '#71717a'); // Light gray / Dark gray
      
      // Always show tick marks
      markers.push(
        <line
          key={i}
          x1={200 + innerR * Math.cos(angle)}
          y1={200 + innerR * Math.sin(angle)}
          x2={200 + outerR * Math.cos(angle)}
          y2={200 + outerR * Math.sin(angle)}
          stroke={tickColor}
          strokeWidth={visibleNumbers.includes(i) ? 3 : 1.5}
        />
      );
      
      // Only show numbers for visible hours
      if (visibleNumbers.includes(i)) {
        const numR = baseRadius - 27;
        let num;
        if (hourMode === '12') {
          num = i === 0 ? '∞' : i.toString();
        } else {
          num = i === 0 ? '∞' : i.toString().padStart(2, '0');
        }
        
        // Number colors - lighter in night zone
        const numColor = i === 0 
          ? (inNightZone ? '#f87171' : '#DC2626')  // Red / Light red for ∞
          : (inNightZone ? '#e5e7eb' : '#374151'); // Light gray / Dark gray for numbers
        
        markers.push(
          <text
            key={`num-${i}`}
            x={200 + numR * Math.cos(angle)}
            y={200 + numR * Math.sin(angle)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={i === 0 ? 16 : 13}
            fontWeight="600"
            fill={numColor}
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {num}
          </text>
        );
      }
    }
    return markers;
  };

  // Render 60 minute/second markers as TICK MARKS near dial edge
  const renderMinuteSecondMarkers = () => {
    const markers = [];
    const bezelCount = showBezel ? (Array.isArray(bezelContent) ? bezelContent.length : 1) : 0;
    const baseRadius = 145 - (bezelCount > 0 ? (bezelCount - 1) * 24 : 0);
    
    // Track position near the edge of dial
    const outerRadius = baseRadius - 2;
    
    // Rotation offset for flipped dial
    const rotationOffset = dialFlipped ? 180 : 0;
    
    // Direction multiplier: 1 for clockwise, -1 for counter-clockwise
    const directionMultiplier = handsDirection === 'counterclockwise' ? -1 : 1;
    
    // Only render if either markers are enabled
    if (showMinuteMarkers || showSecondMarkers) {
      // Smooth moving second indicator
      if (showSecondMarkers) {
        const milliseconds = time.getMilliseconds();
        const smoothSeconds = seconds + (milliseconds / 1000);
        const smoothSecondAngle = (smoothSeconds * 6) - 90; // 6 degrees per second
        const smoothAngle = ((smoothSecondAngle * directionMultiplier) + rotationOffset) * Math.PI / 180;
        
        const indicatorOuterRadius = outerRadius + 2;
        const indicatorInnerRadius = outerRadius - 14;
        
        markers.push(
          <line
            key="smooth-second"
            x1={200 + indicatorInnerRadius * Math.cos(smoothAngle)}
            y1={200 + indicatorInnerRadius * Math.sin(smoothAngle)}
            x2={200 + indicatorOuterRadius * Math.cos(smoothAngle)}
            y2={200 + indicatorOuterRadius * Math.sin(smoothAngle)}
            stroke="#DC2626"
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      }
      
      // Smooth moving minute indicator
      if (showMinuteMarkers) {
        const smoothMinutes = minutes + (seconds / 60);
        const smoothMinuteAngle = (smoothMinutes * 6) - 90; // 6 degrees per second (same as seconds track)
        const smoothAngle = ((smoothMinuteAngle * directionMultiplier) + rotationOffset) * Math.PI / 180;
        
        const indicatorOuterRadius = outerRadius - 2;
        const indicatorInnerRadius = outerRadius - 12;
        
        markers.push(
          <line
            key="smooth-minute"
            x1={200 + indicatorInnerRadius * Math.cos(smoothAngle)}
            y1={200 + indicatorInnerRadius * Math.sin(smoothAngle)}
            x2={200 + indicatorOuterRadius * Math.cos(smoothAngle)}
            y2={200 + indicatorOuterRadius * Math.sin(smoothAngle)}
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      }
      
      // Add numbers at 0, 15, 30, 45 - OUTSIDE the dial near edges
      const numberRadius = outerRadius + 12; // Outside the tick marks
      const numberedPositions = [
        { value: 0, label: '0' },
        { value: 15, label: '15' },
        { value: 30, label: '30' },
        { value: 45, label: '45' }
      ];
      
      // Check if current time is in night period
      const isCurrentlyNight = dialMode === 'daynight' && isNightHour(hours);
      
      numberedPositions.forEach(({ value, label }) => {
        const baseAngle = (value * 6) - 90;
        const angle = ((baseAngle * directionMultiplier) + rotationOffset) * Math.PI / 180;
        
        // Make 30 (bottom) and nearby numbers brighter during night
        const isBottomHalf = value === 30 || value === 15 || value === 45;
        const numColor = isCurrentlyNight && isBottomHalf ? '#d4d4d8' : '#71717a';
        
        markers.push(
          <text
            key={`num-${value}`}
            x={200 + numberRadius * Math.cos(angle)}
            y={200 + numberRadius * Math.sin(angle)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fontWeight="600"
            fill={numColor}
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {label}
          </text>
        );
      });
    }
    
    return markers;
  };

  const renderHands = () => {
    const bezelCount = showBezel ? (Array.isArray(bezelContent) ? bezelContent.length : 1) : 0;
    const scaleFactor = 1 - (bezelCount > 0 ? (bezelCount - 1) * 0.15 : 0);
    
    // Rotation offset for flipped dial
    const rotationOffset = dialFlipped ? 180 : 0;
    
    // Direction multiplier: 1 for clockwise, -1 for counter-clockwise
    const directionMultiplier = handsDirection === 'counterclockwise' ? -1 : 1;
    
    const hourHandLength = 70 * scaleFactor;
    const minuteHandLength = 100 * scaleFactor;
    const secondHandLength = 110 * scaleFactor;
    const gmtHandLength = 85 * scaleFactor;
    
    // Tail lengths (extending into the center area)
    const minuteTailLength = 25 * scaleFactor;
    const secondTailLength = 30 * scaleFactor;
    
    // Apply rotation offset and direction to hand angles
    const adjustedHourAngle = (hourAngle * directionMultiplier) + rotationOffset;
    const adjustedMinuteAngle = (minuteAngle * directionMultiplier) + rotationOffset;
    const adjustedSecondAngle = (secondAngle * directionMultiplier) + rotationOffset;
    
    // GMT hand calculation - use UTC as base, then add target timezone offset
    const utcHours = time.getUTCHours();
    const utcMinutes = time.getUTCMinutes();
    const gmtHours = (utcHours + gmtOffset + 24) % 24;
    // GMT angle based on hour mode
    const gmtAngle = hourMode === '12'
      ? ((gmtHours % 12) * 30) + (utcMinutes * 0.5) - 90
      : (gmtHours * 15) + (utcMinutes * 0.25) - 90;
    const adjustedGmtAngle = (gmtAngle * directionMultiplier) + rotationOffset;
    
    // Colors
    const hourColor = isNightTime ? '#C9A227' : '#D4AF37';
    const minuteColor = isNightTime ? '#4B5563' : '#374151';
    const secondColor = '#DC2626';
    const gmtColor = '#f97316';
    
    // Helper function to render a hand based on style
    const renderHand = (angle, length, tailLength, width, color, type = 'minute') => {
      const radians = angle * Math.PI / 180;
      const tipX = 200 + length * Math.cos(radians);
      const tipY = 200 + length * Math.sin(radians);
      const tailX = 200 - tailLength * Math.cos(radians);
      const tailY = 200 - tailLength * Math.sin(radians);
      
      // Perpendicular vectors for width
      const perpX = -Math.sin(radians);
      const perpY = Math.cos(radians);
      
      switch (handStyle) {
        case 'baton':
          // Simple rectangular stick
          return (
            <line 
              x1={tailX} y1={tailY} 
              x2={tipX} y2={tipY} 
              stroke={color} 
              strokeWidth={width} 
              strokeLinecap="round" 
            />
          );
        
        case 'sword': {
          // Thin at base, wide in middle, sharp tip
          const swordMidLength = length * 0.5;
          const swordMidX = 200 + swordMidLength * Math.cos(radians);
          const swordMidY = 200 + swordMidLength * Math.sin(radians);
          const swordWidth = width * 1.5;
          return (
            <polygon
              points={`
                200,200
                ${swordMidX + perpX * swordWidth},${swordMidY + perpY * swordWidth}
                ${tipX},${tipY}
                ${swordMidX - perpX * swordWidth},${swordMidY - perpY * swordWidth}
              `}
              fill={color}
              stroke={isNightTime ? '#1a1a1a' : '#000'}
              strokeWidth="0.5"
            />
          );
        }
        
        case 'dauphine': {
          // Triangular, faceted - elegant tapered shape
          const dauphineWidth = width * 1.2;
          return (
            <g>
              <polygon
                points={`
                  ${200 + perpX * dauphineWidth},${200 + perpY * dauphineWidth}
                  ${tipX},${tipY}
                  ${200 - perpX * dauphineWidth},${200 - perpY * dauphineWidth}
                `}
                fill={color}
                stroke={isNightTime ? '#1a1a1a' : '#000'}
                strokeWidth="0.5"
              />
              {/* Center facet line */}
              <line 
                x1="200" y1="200" 
                x2={tipX} y2={tipY} 
                stroke={isNightTime ? '#fff3' : '#0003'} 
                strokeWidth="1" 
              />
            </g>
          );
        }
        
        case 'leaf': {
          // Wider midsection, taper at both ends
          const leafMid = length * 0.4;
          const leafMidX = 200 + leafMid * Math.cos(radians);
          const leafMidY = 200 + leafMid * Math.sin(radians);
          const leafWidth = width * 2;
          return (
            <path
              d={`M 200,200 
                  Q ${leafMidX + perpX * leafWidth},${leafMidY + perpY * leafWidth} ${tipX},${tipY}
                  Q ${leafMidX - perpX * leafWidth},${leafMidY - perpY * leafWidth} 200,200`}
              fill={color}
              stroke={isNightTime ? '#1a1a1a' : '#000'}
              strokeWidth="0.5"
            />
          );
        }
        
        case 'mercedes': {
          // Three-pointed star on hour hand, regular for others
          if (type === 'hour') {
            const starRadius = width * 2;
            const starX = 200 + (length - starRadius * 2) * Math.cos(radians);
            const starY = 200 + (length - starRadius * 2) * Math.sin(radians);
            return (
              <g>
                <line x1="200" y1="200" x2={starX} y2={starY} stroke={color} strokeWidth={width} strokeLinecap="round" />
                {/* Mercedes star */}
                <circle cx={starX} cy={starY} r={starRadius} fill={color} stroke={isNightTime ? '#1a1a1a' : '#000'} strokeWidth="0.5" />
                {[0, 120, 240].map((deg, i) => {
                  const lineAngle = (angle + deg) * Math.PI / 180;
                  return (
                    <line
                      key={i}
                      x1={starX}
                      y1={starY}
                      x2={starX + starRadius * 0.9 * Math.cos(lineAngle)}
                      y2={starY + starRadius * 0.9 * Math.sin(lineAngle)}
                      stroke={isNightTime ? '#1a1a1a' : '#000'}
                      strokeWidth="1.5"
                    />
                  );
                })}
              </g>
            );
          }
          return <line x1={tailX} y1={tailY} x2={tipX} y2={tipY} stroke={color} strokeWidth={width} strokeLinecap="round" />;
        }
        
        case 'alpha': {
          // A-shaped: wide base, narrow neck, tapered tip
          const alphaBaseWidth = width * 2;
          const alphaNeckDist = length * 0.15;
          const alphaNeckX = 200 + alphaNeckDist * Math.cos(radians);
          const alphaNeckY = 200 + alphaNeckDist * Math.sin(radians);
          return (
            <polygon
              points={`
                ${200 + perpX * alphaBaseWidth},${200 + perpY * alphaBaseWidth}
                ${200 - perpX * alphaBaseWidth},${200 - perpY * alphaBaseWidth}
                ${alphaNeckX - perpX * width * 0.5},${alphaNeckY - perpY * width * 0.5}
                ${tipX},${tipY}
                ${alphaNeckX + perpX * width * 0.5},${alphaNeckY + perpY * width * 0.5}
              `}
              fill={color}
              stroke={isNightTime ? '#1a1a1a' : '#000'}
              strokeWidth="0.5"
            />
          );
        }
        
        case 'arrow': {
          // Straight with arrow head at tip
          const arrowHeadSize = width * 2.5;
          const arrowBaseX = 200 + (length - arrowHeadSize) * Math.cos(radians);
          const arrowBaseY = 200 + (length - arrowHeadSize) * Math.sin(radians);
          return (
            <g>
              <line x1={tailX} y1={tailY} x2={arrowBaseX} y2={arrowBaseY} stroke={color} strokeWidth={width} strokeLinecap="round" />
              <polygon
                points={`
                  ${tipX},${tipY}
                  ${arrowBaseX + perpX * arrowHeadSize},${arrowBaseY + perpY * arrowHeadSize}
                  ${arrowBaseX - perpX * arrowHeadSize},${arrowBaseY - perpY * arrowHeadSize}
                `}
                fill={color}
                stroke={isNightTime ? '#1a1a1a' : '#000'}
                strokeWidth="0.5"
              />
            </g>
          );
        }
        
        case 'breguet': {
          // Thin with hollow circle near tip (Pomme style)
          const breguetCircleR = width * 1.5;
          const breguetCircleDist = length - breguetCircleR * 3;
          const breguetCircleX = 200 + breguetCircleDist * Math.cos(radians);
          const breguetCircleY = 200 + breguetCircleDist * Math.sin(radians);
          return (
            <g>
              <line x1="200" y1="200" x2={breguetCircleX - breguetCircleR * Math.cos(radians)} y2={breguetCircleY - breguetCircleR * Math.sin(radians)} stroke={color} strokeWidth={width * 0.7} />
              <circle cx={breguetCircleX} cy={breguetCircleY} r={breguetCircleR} fill="none" stroke={color} strokeWidth={width * 0.7} />
              <line x1={breguetCircleX + breguetCircleR * Math.cos(radians)} y1={breguetCircleY + breguetCircleR * Math.sin(radians)} x2={tipX} y2={tipY} stroke={color} strokeWidth={width * 0.5} />
            </g>
          );
        }
        
        case 'cathedral': {
          // Gothic stained glass window style
          const catWidth = width * 1.5;
          const catMid1 = length * 0.3;
          const catMid2 = length * 0.6;
          const catMid1X = 200 + catMid1 * Math.cos(radians);
          const catMid1Y = 200 + catMid1 * Math.sin(radians);
          const catMid2X = 200 + catMid2 * Math.cos(radians);
          const catMid2Y = 200 + catMid2 * Math.sin(radians);
          return (
            <g>
              <polygon
                points={`
                  200,200
                  ${catMid1X + perpX * catWidth},${catMid1Y + perpY * catWidth}
                  ${catMid1X + perpX * catWidth * 1.5},${catMid1Y + perpY * catWidth * 1.5}
                  ${catMid2X + perpX * catWidth},${catMid2Y + perpY * catWidth}
                  ${tipX},${tipY}
                  ${catMid2X - perpX * catWidth},${catMid2Y - perpY * catWidth}
                  ${catMid1X - perpX * catWidth * 1.5},${catMid1Y - perpY * catWidth * 1.5}
                  ${catMid1X - perpX * catWidth},${catMid1Y - perpY * catWidth}
                `}
                fill={color}
                stroke={isNightTime ? '#1a1a1a' : '#000'}
                strokeWidth="0.5"
              />
              {/* Gothic window cutout effect */}
              <ellipse
                cx={catMid1X}
                cy={catMid1Y}
                rx={catWidth * 0.6}
                ry={length * 0.08}
                transform={`rotate(${angle}, ${catMid1X}, ${catMid1Y})`}
                fill={isNightTime ? '#1f2937' : '#e5e7eb'}
              />
            </g>
          );
        }
        
        case 'snowflake': {
          // Tudor-style diamond/snowflake shape on hour hand
          if (type === 'hour') {
            const sfSize = width * 2.5;
            const sfDist = length * 0.5;
            const sfX = 200 + sfDist * Math.cos(radians);
            const sfY = 200 + sfDist * Math.sin(radians);
            return (
              <g>
                <line x1="200" y1="200" x2={sfX - sfSize * Math.cos(radians)} y2={sfY - sfSize * Math.sin(radians)} stroke={color} strokeWidth={width} strokeLinecap="round" />
                {/* Snowflake/diamond shape */}
                <polygon
                  points={`
                    ${sfX - sfSize * Math.cos(radians)},${sfY - sfSize * Math.sin(radians)}
                    ${sfX + perpX * sfSize},${sfY + perpY * sfSize}
                    ${sfX + sfSize * Math.cos(radians)},${sfY + sfSize * Math.sin(radians)}
                    ${sfX - perpX * sfSize},${sfY - perpY * sfSize}
                  `}
                  fill={color}
                  stroke={isNightTime ? '#1a1a1a' : '#000'}
                  strokeWidth="0.5"
                />
                <line x1={sfX + sfSize * Math.cos(radians)} y1={sfY + sfSize * Math.sin(radians)} x2={tipX} y2={tipY} stroke={color} strokeWidth={width} strokeLinecap="round" />
              </g>
            );
          }
          return <line x1={tailX} y1={tailY} x2={tipX} y2={tipY} stroke={color} strokeWidth={width} strokeLinecap="round" />;
        }
        
        case 'syringe': {
          // Straight body with needle point at tip
          const syringeWidth = width * 1.2;
          const syringeNeedleStart = length * 0.75;
          const syringeNeedleX = 200 + syringeNeedleStart * Math.cos(radians);
          const syringeNeedleY = 200 + syringeNeedleStart * Math.sin(radians);
          return (
            <g>
              {/* Body */}
              <polygon
                points={`
                  ${200 + perpX * syringeWidth},${200 + perpY * syringeWidth}
                  ${200 - perpX * syringeWidth},${200 - perpY * syringeWidth}
                  ${syringeNeedleX - perpX * syringeWidth},${syringeNeedleY - perpY * syringeWidth}
                  ${syringeNeedleX + perpX * syringeWidth},${syringeNeedleY + perpY * syringeWidth}
                `}
                fill={color}
                stroke={isNightTime ? '#1a1a1a' : '#000'}
                strokeWidth="0.5"
              />
              {/* Needle */}
              <line x1={syringeNeedleX} y1={syringeNeedleY} x2={tipX} y2={tipY} stroke={color} strokeWidth={width * 0.5} strokeLinecap="round" />
            </g>
          );
        }
        
        case 'skeleton': {
          // Outline only, hollow middle
          const skelWidth = width * 1.5;
          return (
            <g>
              <polygon
                points={`
                  ${200 + perpX * skelWidth},${200 + perpY * skelWidth}
                  ${200 - perpX * skelWidth},${200 - perpY * skelWidth}
                  ${tipX - perpX * width * 0.5},${tipY - perpY * width * 0.5}
                  ${tipX + perpX * width * 0.5},${tipY + perpY * width * 0.5}
                `}
                fill="none"
                stroke={color}
                strokeWidth={width * 0.5}
              />
            </g>
          );
        }
        
        default:
          // Default to baton
          return <line x1={tailX} y1={tailY} x2={tipX} y2={tipY} stroke={color} strokeWidth={width} strokeLinecap="round" />;
      }
    };
    
    return (
      <>
        {/* GMT hand - orange/red color, rendered first (behind other hands) */}
        {gmtEnabled && (
          <g style={{ cursor: 'pointer' }}>
            <line 
              x1="200" 
              y1="200" 
              x2={200 + gmtHandLength * Math.cos(adjustedGmtAngle * Math.PI / 180)} 
              y2={200 + gmtHandLength * Math.sin(adjustedGmtAngle * Math.PI / 180)} 
              stroke={gmtColor} 
              strokeWidth="4" 
              strokeLinecap="round"
            />
            <circle 
              cx={200 + gmtHandLength * Math.cos(adjustedGmtAngle * Math.PI / 180)} 
              cy={200 + gmtHandLength * Math.sin(adjustedGmtAngle * Math.PI / 180)} 
              r="6" 
              fill={gmtColor} 
              stroke="#fff" 
              strokeWidth="1"
            />
          </g>
        )}
        
        {/* Hour hand */}
        {renderHand(adjustedHourAngle, hourHandLength, 0, 6, hourColor, 'hour')}
        
        {/* Minute hand with tail */}
        {showMinuteHand && renderHand(adjustedMinuteAngle, minuteHandLength, minuteTailLength, 4, minuteColor, 'minute')}
        
        {/* Second hand with tail */}
        {showSecondHand && renderHand(adjustedSecondAngle, secondHandLength, secondTailLength, 2, secondColor, 'second')}
        
        {/* Center cap */}
        <circle cx="200" cy="200" r="8" fill={hourColor} />
        <circle cx="200" cy="200" r="4" fill={gmtEnabled ? gmtColor : (showSecondHand ? secondColor : hourColor)} />
      </>
    );
  };

  const renderAwakeProgress = () => {
    if (!showAwakeProgress) return null;
    const bezelCount = showBezel ? (Array.isArray(bezelContent) ? bezelContent.length : 1) : 0;
    const progressRadius = 165 - (bezelCount > 0 ? (bezelCount - 1) * 24 : 0);
    const progress = Math.min(awakeHours / awakeTrackingHours, 1);
    const circumference = 2 * Math.PI * progressRadius;
    
    // Match bezel/dial direction and flip settings
    const dirMultiplier = handsDirection === 'counterclockwise' ? -1 : 1;
    const flipOffset = dialFlipped ? 180 : 0;
    
    // Start angle: -90 = 12 o'clock, with flip offset
    const startAngle = -90 + flipOffset;
    
    // Calculate arc angles
    const progressAngle = progress * 360 * dirMultiplier;
    const startRad = (startAngle) * Math.PI / 180;
    const endRad = (startAngle + progressAngle) * Math.PI / 180;
    
    // Arc points
    const x1 = 200 + progressRadius * Math.cos(startRad);
    const y1 = 200 + progressRadius * Math.sin(startRad);
    const x2 = 200 + progressRadius * Math.cos(endRad);
    const y2 = 200 + progressRadius * Math.sin(endRad);
    
    // Large arc flag
    const largeArc = progress > 0.5 ? 1 : 0;
    // Sweep direction
    const sweepFlag = dirMultiplier === 1 ? 1 : 0;
    
    if (progress === 0) return null;
    
    return (
      <path
        d={`M ${x1} ${y1} A ${progressRadius} ${progressRadius} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`}
        fill="none"
        stroke={awakeStatus.color}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.7"
      />
    );
  };

  // Watch case is always circle

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  
  // Pre-calculate bezel data to avoid calling renderBezel() twice
  const bezelData = renderBezel();
  
  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'Amiri, serif' }}>
          {t.title}
        </h1>
        <p className="text-zinc-400 text-sm tracking-widest">{t.subtitle}</p>
      </div>

      {/* Watch SVG */}
      <svg
        ref={svgRef}
        viewBox="0 0 400 400"
        className="w-80 h-80 md:w-96 md:h-96 cursor-grab active:cursor-grabbing"
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        <defs>
          <linearGradient id="caseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#525252" />
            <stop offset="50%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#27272a" />
          </linearGradient>
          <linearGradient id="bezelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#52525b" />
            <stop offset="50%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#27272a" />
          </linearGradient>
        </defs>

        {/* Case - Circle only */}
        <circle cx="200" cy="200" r="195" fill="url(#caseGradient)" />

        {/* Rotatable Bezels (NOT compass) */}
        <g transform={`rotate(${bezelRotation}, 200, 200)`}>
          <circle cx="200" cy="200" r="175" fill="url(#bezelGradient)" stroke="#18181b" strokeWidth="2" />
          {bezelData.rotatableMarkers}
        </g>
        
        {/* Fixed Compass Bezel - does NOT rotate with drag */}
        {bezelData.compassMarkers}

        {/* Dial */}
        {renderDial()}
        {renderAwakeProgress()}
        {renderHourMarkers()}
        {renderMinuteSecondMarkers()}

        {/* Brand text - positioned lower to leave space for dial numbers */}
        <text x="200" y="125" textAnchor="middle" fontSize="14" fontWeight="700" fill="#333" style={{ fontFamily: 'Amiri, serif' }}>
          اَلْبُكُورُ
        </text>
        
        <text x="200" y="142" textAnchor="middle" fontSize="11" fontWeight="600" fill="#555" style={{ fontFamily: 'system-ui', letterSpacing: '3px' }}>
          BUKUR
        </text>

        {/* Phase indicator - lighter color during night mode */}
        <text 
          x="200" 
          y="260" 
          textAnchor="middle" 
          fontSize="12" 
          fill={dialMode === 'daynight' && isNightHour(hours) ? '#fff' : currentPhase.color} 
          fontWeight="600"
          style={{ textShadow: dialMode === 'daynight' && isNightHour(hours) ? '0 0 4px ' + currentPhase.color : 'none' }}
        >
          {language === 'ar' ? currentPhase.name : currentPhase.nameEn}
        </text>
        
        {/* Hour Name - under phase name in bottom half */}
        {showArabicHourName && (
          <text 
            x="200" 
            y="278" 
            textAnchor="middle" 
            fontSize="9" 
            fill={dialMode === 'daynight' && isNightHour(hours) ? '#fbbf24' : '#D4AF37'}
            fontWeight="500"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {getHourName(bukurHour)}
          </text>
        )}

        {/* Hands */}
        {renderHands()}
      </svg>

      {/* Status Display */}
      <div className="mt-4 text-center">
        <div className="text-zinc-400 text-sm mb-1">
          {t.bukurHour}: <span className="text-amber-400 font-bold">{bukurHour}</span> | {getHourName(bukurHour)}
        </div>
        <div className="text-zinc-500 text-xs">
          {time.toLocaleTimeString('en-US', { hour12: false })} • {t.phase}: {language === 'ar' ? currentPhase.name : currentPhase.nameEn}
        </div>
      </div>

      {/* Sleep Tracking Buttons */}
      <div className="mt-4 flex gap-3 w-80">
        <button
          onClick={recordWakeUp}
          className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
        >
          <span className="text-lg">☀️</span>
          {language === 'ar' ? 'استيقظت' : 'I Woke Up'}
        </button>
        <button
          onClick={recordSleep}
          className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg"
        >
          <span className="text-lg">🌙</span>
          {language === 'ar' ? 'ذاهب للنوم' : 'Going to Sleep'}
        </button>
      </div>
      
      {/* Sleep Data Display */}
      {(wakeUpTime || sleepTime) && (
        <div className="mt-2 bg-zinc-800 rounded-xl p-3 w-80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs">{t.sleepTracking}</span>
            <button 
              onClick={clearSleepData}
              className="text-red-400 text-xs hover:text-red-300"
            >
              {t.clearSleepData}
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Sleep Time */}
            <div className="bg-indigo-900/30 rounded-lg p-2 text-center">
              <span className="text-indigo-300 text-xs block mb-1">🌙 {language === 'ar' ? 'نمت' : 'Slept'}</span>
              <span className="text-white font-bold">
                {sleepTime ? formatTime(sleepTime.hour, sleepTime.minute) : '--:--'}
              </span>
            </div>
            
            {/* Wake Time */}
            <div className="bg-amber-900/30 rounded-lg p-2 text-center">
              <span className="text-amber-300 text-xs block mb-1">☀️ {language === 'ar' ? 'استيقظت' : 'Woke Up'}</span>
              <span className="text-white font-bold">
                {wakeUpTime ? formatTime(wakeUpTime.hour, wakeUpTime.minute) : '--:--'}
              </span>
            </div>
          </div>
          
          {/* Sleep Duration */}
          {sleepDuration && (
            <div className="mt-2 text-center bg-green-900/30 rounded-lg p-2">
              <span className="text-green-300 text-xs block mb-1">😴 {t.sleepDuration}</span>
              <span className="text-white font-bold text-lg">
                {sleepDuration.hours}{t.h} {sleepDuration.minutes}{t.m}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Awake Time Display */}
      <div className="mt-4 bg-zinc-800 rounded-xl p-4 w-80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-sm">{t.awakeSince}:</span>
          <span className="text-white font-bold">{awakeHours}{t.h} {awakeMinutes}{t.m}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-sm">{t.status}:</span>
          <span className="font-bold flex items-center gap-2" style={{ color: awakeStatus.color }}>
            {awakeStatus.emoji} {language === 'ar' ? awakeStatus.text : awakeStatus.textEn}
          </span>
        </div>
      </div>

      {/* GMT Display */}
      {gmtEnabled && (
        <div className="mt-2 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 w-80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-orange-400 text-lg">🌍</span>
              <div>
                <span className="text-orange-400 font-bold">
                  {language === 'ar' ? getTimezoneByOffset(gmtOffset).city : getTimezoneByOffset(gmtOffset).cityEn}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-orange-400 font-mono text-xl">
                {String(gmtDisplayHours).padStart(2, '0')}:{String(utcMinutes).padStart(2, '0')}
              </span>
              <p className="text-orange-300/60 text-xs">
                UTC{gmtOffset >= 0 ? '+' : ''}{gmtOffset}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Daily Times (Prayer Times) - Collapsible */}
      <div className="mt-2 w-80">
        {/* Header - Click to expand/collapse */}
        <button
          onClick={() => setShowPrayerTimes(!showPrayerTimes)}
          className="w-full bg-violet-900/30 border border-violet-500/30 rounded-xl p-3 flex items-center justify-between hover:bg-violet-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{nextDailyTime.icon}</span>
            <div className={`text-${language === 'ar' ? 'right' : 'left'}`}>
              <span className="text-violet-300 font-bold text-sm">
                {language === 'ar' ? 'القادم:' : 'Next:'} {language === 'ar' ? nextDailyTime.name : nextDailyTime.nameEn}
              </span>
              <p className="text-violet-400/70 text-xs">
                {language === 'ar' 
                  ? `بعد ${nextDailyTime.remainingHours}س ${nextDailyTime.remainingMinutes}د`
                  : `in ${nextDailyTime.remainingHours}h ${nextDailyTime.remainingMinutes}m`
                }
                {nextDailyTime.isTomorrow && (language === 'ar' ? ' (غداً)' : ' (tomorrow)')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-violet-300 font-mono text-lg">
              {formatDecimalTime(nextDailyTime.time)}
            </span>
            <span className={`text-violet-400 transition-transform ${showPrayerTimes ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
        </button>
        
        {/* Expanded List */}
        {showPrayerTimes && (
          <div className="mt-1 bg-zinc-800/90 border border-zinc-700 rounded-xl overflow-hidden">
            {dailyTimesArray.map((item, index) => {
              const now = time.getHours() + time.getMinutes() / 60;
              const isPast = item.time <= now;
              const isNext = item.id === nextDailyTime.id;
              
              return (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between p-3 ${
                    index !== dailyTimesArray.length - 1 ? 'border-b border-zinc-700/50' : ''
                  } ${isNext ? 'bg-violet-900/30' : ''} ${isPast ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">{item.icon}</span>
                    <div>
                      <span className={`font-bold text-sm ${isNext ? 'text-violet-300' : 'text-zinc-300'}`}>
                        {language === 'ar' ? item.name : item.nameEn}
                      </span>
                      {isNext && (
                        <p className="text-violet-400 text-xs">
                          {language === 'ar' 
                            ? `⏱️ بعد ${nextDailyTime.remainingHours}س ${nextDailyTime.remainingMinutes}د`
                            : `⏱️ in ${nextDailyTime.remainingHours}h ${nextDailyTime.remainingMinutes}m`
                          }
                        </p>
                      )}
                      {isPast && !isNext && (
                        <p className="text-zinc-500 text-xs">
                          {language === 'ar' ? '✓ انتهى' : '✓ Passed'}
                        </p>
                      )}
                    </div>
                  </div>
                  <span 
                    className={`font-mono text-sm ${isNext ? 'text-violet-300' : isPast ? 'text-zinc-500' : 'text-zinc-400'}`}
                    style={{ color: isNext ? item.color : undefined }}
                  >
                    {formatDecimalTime(item.time)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="mt-4 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm hover:bg-zinc-700"
      >
        {showSettings ? t.hideSettings : t.settings}
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 bg-zinc-800 rounded-xl p-4 w-80 space-y-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {/* Language Toggle */}
          <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
            <div>
              <span className="text-zinc-400 text-sm">{t.languageLabel}</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setLanguage('ar')}
                className={`px-3 py-1 rounded text-sm ${language === 'ar' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
              >
                {t.arabic}
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded text-sm ${language === 'en' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
              >
                {t.english}
              </button>
            </div>
          </div>

          {/* Bezel Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{language === 'ar' ? 'الإطار:' : 'Bezel:'}</span>
              <p className="text-zinc-500 text-xs">
                {showBezel ? t.withBezel : t.noBezel}
              </p>
            </div>
            <button
              onClick={() => setShowBezel(!showBezel)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${showBezel ? 'bg-amber-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${showBezel ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {showBezel ? '◉' : '○'}
              </div>
            </button>
          </div>

          {/* Bezel Content Selector - Multi-select (only show if bezel is enabled) */}
          {showBezel && (
            <div>
              <label className="text-zinc-400 text-sm block mb-2">{t.bezelContent}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'hours24', label: language === 'ar' ? '24 ساعة' : '24 Hours', sub: '00-23' },
                  { id: 'hours12', label: language === 'ar' ? '12 ساعة' : '12 Hours', sub: '00-11' },
                  { id: 'minutes', label: t.minutes, sub: '00-60' },
                  { id: 'seconds', label: t.seconds, sub: '00-60' },
                  { id: 'days', label: t.days, sub: '1-31' },
                  { id: 'weeks', label: t.weeks, sub: '1-52' },
                  { id: 'months', label: t.months, sub: '1-12' },
                  { id: 'compass', label: t.compass, sub: 'N-S-E-W' },
                ].map((item) => {
                  const isSelected = bezelContent.includes(item.id);
                  const orderNum = isSelected ? bezelContent.indexOf(item.id) + 1 : null;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isSelected) {
                          // Remove if more than one selected
                          if (bezelContent.length > 1) {
                            setBezelContent(bezelContent.filter(b => b !== item.id));
                          }
                        } else {
                          // Add (max 4 bezels)
                          if (bezelContent.length < 4) {
                            let newBezels;
                            if (item.id === 'compass') {
                              // Compass always goes first (outermost)
                              newBezels = ['compass', ...bezelContent];
                            } else {
                              // Other bezels added after compass if exists
                              if (bezelContent.includes('compass')) {
                                newBezels = ['compass', ...bezelContent.filter(b => b !== 'compass'), item.id];
                              } else {
                                newBezels = [...bezelContent, item.id];
                              }
                            }
                            setBezelContent(newBezels);
                          }
                        }
                      }}
                      className={`px-3 py-2 rounded text-sm relative ${
                        isSelected 
                          ? 'bg-amber-600 text-white ring-2 ring-amber-400' 
                          : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                      } ${bezelContent.length >= 4 && !isSelected ? 'opacity-50' : ''}`}
                    >
                      {isSelected && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                          {orderNum}
                        </span>
                      )}
                      {item.label}<br/><span className="text-xs opacity-70">{item.sub}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-zinc-500 text-xs mt-2">
                {language === 'ar' 
                  ? '✓ اضغط للإضافة/الإزالة • الحد الأقصى 4 إطارات • البوصلة دائماً الإطار الخارجي' 
                  : '✓ Click to add/remove • Max 4 bezels • Compass always outermost'}
              </p>
            </div>
          )}
          
          {/* Compass Settings - only show if compass bezel is selected */}
          {showBezel && bezelContent.includes('compass') && (
            <div className="border border-zinc-700 rounded-lg p-3">
              <label className="text-zinc-400 text-sm block mb-3">{t.compassSettings}</label>
              
              {/* Compass status indicator */}
              <div className="mb-3 p-2 rounded bg-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${compassPermission === 'granted' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                  <span className="text-zinc-300 text-xs">
                    {compassPermission === 'granted' 
                      ? (language === 'ar' ? 'البوصلة نشطة' : 'Compass Active')
                      : (language === 'ar' ? 'استخدم شريط المحاكاة أدناه' : 'Use simulation slider below')
                    }
                  </span>
                </div>
                <p className="text-zinc-500 text-xs">
                  {language === 'ar' 
                    ? 'على الهاتف: تدور تلقائياً • على الكمبيوتر: استخدم الشريط'
                    : 'Mobile: auto-rotate • Desktop: use slider'
                  }
                </p>
              </div>
              
              {/* Permission button for iOS */}
              {compassPermission === 'unknown' && (
                <button
                  onClick={requestCompassPermission}
                  className="w-full mb-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-500 transition-colors flex items-center justify-center gap-2"
                >
                  <span>🧭</span>
                  {t.requestPermission}
                </button>
              )}
              
              {/* Manual compass heading slider */}
              <div className="mb-3">
                <label className="text-zinc-400 text-xs block mb-1">
                  {language === 'ar' ? 'اتجاه البوصلة:' : 'Compass Heading:'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={compassHeading}
                  onChange={(e) => setCompassHeading(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-zinc-500 text-xs mt-1">
                  <span>{language === 'ar' ? 'ش' : 'N'} 0°</span>
                  <span>{language === 'ar' ? 'شر' : 'E'} 90°</span>
                  <span>{language === 'ar' ? 'ج' : 'S'} 180°</span>
                  <span>{language === 'ar' ? 'غ' : 'W'} 270°</span>
                </div>
              </div>
              
              {/* North indicator toggle */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-xs">N</span>
                  <span className="text-zinc-300 text-sm">{t.northIndicator}</span>
                </div>
                <button
                  onClick={() => setShowNorthIndicator(!showNorthIndicator)}
                  className={`w-12 h-6 rounded-full transition-colors ${showNorthIndicator ? 'bg-red-600' : 'bg-zinc-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showNorthIndicator ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              {/* Qibla indicator toggle */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-zinc-900 border border-amber-500 rounded-sm flex items-center justify-center">
                    <span className="w-3 h-0.5 bg-amber-500"></span>
                  </span>
                  <span className="text-zinc-300 text-sm">{t.qiblaIndicator}</span>
                </div>
                <button
                  onClick={() => setShowQiblaIndicator(!showQiblaIndicator)}
                  className={`w-12 h-6 rounded-full transition-colors ${showQiblaIndicator ? 'bg-amber-600' : 'bg-zinc-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showQiblaIndicator ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              {/* Divider */}
              <div className="border-t border-zinc-700 my-3"></div>
              
              {/* Save current location button */}
              <div className="mb-3">
                <button
                  onClick={() => {
                    if (userLocation) {
                      setSavedHomeLocation({ ...userLocation });
                    }
                  }}
                  disabled={!userLocation}
                  className={`w-full px-3 py-2 rounded text-sm flex items-center justify-center gap-2 ${
                    userLocation ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <span>📍</span>
                  {t.saveCurrentLocation}
                </button>
                {savedHomeLocation && (
                  <p className="text-green-400 text-xs mt-1 text-center">
                    ✓ {t.locationSaved} ({savedHomeLocation.lat.toFixed(4)}°, {savedHomeLocation.lng.toFixed(4)}°)
                  </p>
                )}
              </div>
              
              {/* Home indicator toggle */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs">🏠</span>
                  <span className="text-zinc-300 text-sm">{t.showHomeIndicator}</span>
                </div>
                <button
                  onClick={() => setShowHomeIndicator(!showHomeIndicator)}
                  disabled={!savedHomeLocation}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    !savedHomeLocation ? 'bg-zinc-700 cursor-not-allowed' :
                    showHomeIndicator ? 'bg-blue-600' : 'bg-zinc-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showHomeIndicator && savedHomeLocation ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {!savedHomeLocation && (
                <p className="text-zinc-500 text-xs mb-2">{t.noLocationSaved}</p>
              )}
              {savedHomeLocation && homeDistance !== null && (
                <p className="text-blue-400 text-xs mb-2">
                  {language === 'ar' 
                    ? `المسافة: ${homeDistance.toFixed(1)} كم • الاتجاه: ${Math.round(homeDirection)}°`
                    : `Distance: ${homeDistance.toFixed(1)} km • Bearing: ${Math.round(homeDirection)}°`
                  }
                </p>
              )}
              
              {/* Divider */}
              <div className="border-t border-zinc-700 my-3"></div>
              
              {/* Target location input */}
              <div className="mb-3">
                <label className="text-zinc-400 text-sm block mb-2">{t.targetLocation}</label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <label className="text-zinc-500 text-xs block mb-1">{t.latitude}</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="24.7136"
                      value={targetLocation.lat}
                      onChange={(e) => setTargetLocation({ ...targetLocation, lat: e.target.value })}
                      className="w-full px-2 py-1 bg-zinc-700 rounded text-white text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-zinc-500 text-xs block mb-1">{t.longitude}</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="46.6753"
                      value={targetLocation.lng}
                      onChange={(e) => setTargetLocation({ ...targetLocation, lng: e.target.value })}
                      className="w-full px-2 py-1 bg-zinc-700 rounded text-white text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setTargetLocation({ lat: '', lng: '' })}
                  className="text-red-400 text-xs hover:text-red-300"
                >
                  {t.clearTarget}
                </button>
              </div>
              
              {/* Target indicator toggle */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-red-500 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  </span>
                  <span className="text-zinc-300 text-sm">{t.showTargetIndicator}</span>
                </div>
                <button
                  onClick={() => setShowTargetIndicator(!showTargetIndicator)}
                  disabled={!hasValidTarget}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    !hasValidTarget ? 'bg-zinc-700 cursor-not-allowed' :
                    showTargetIndicator ? 'bg-red-600' : 'bg-zinc-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showTargetIndicator && hasValidTarget ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {hasValidTarget && targetDistance !== null && (
                <p className="text-red-400 text-xs mb-2">
                  {language === 'ar' 
                    ? `المسافة: ${targetDistance.toFixed(1)} كم • الاتجاه: ${Math.round(targetDirection)}°`
                    : `Distance: ${targetDistance.toFixed(1)} km • Bearing: ${Math.round(targetDirection)}°`
                  }
                </p>
              )}
              
              {/* Compass heading display */}
              <div className="mt-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {Math.round(compassHeading)}°
                </div>
                <div className="text-zinc-500 text-xs">
                  {language === 'ar' ? 'اتجاه البوصلة' : 'Compass Heading'}
                </div>
                {userLocation && (
                  <>
                    <div className="text-emerald-400 text-sm mt-2 font-semibold">
                      {language === 'ar' ? `القبلة: ${Math.round(qiblaDirection)}°` : `Qibla: ${Math.round(qiblaDirection)}°`}
                    </div>
                    <div className="text-zinc-500 text-xs mt-1">
                      {language === 'ar' ? 'موقعك:' : 'Your location:'}
                    </div>
                    <div className="text-zinc-400 text-xs">
                      {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
                    </div>
                  </>
                )}
                {!userLocation && (
                  <div className="text-yellow-500 text-xs mt-2">
                    {language === 'ar' ? 'جاري تحديد الموقع...' : 'Getting location...'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dial Numbers Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.showDialNumbers}</span>
              <p className="text-zinc-500 text-xs">
                {showDialNumbers ? t.withNumbers : t.noNumbers}
              </p>
            </div>
            <button
              onClick={() => setShowDialNumbers(!showDialNumbers)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${showDialNumbers ? 'bg-amber-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${showDialNumbers ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {showDialNumbers ? '◉' : '○'}
              </div>
            </button>
          </div>

          {/* Dial Content Selector - Inner dial numbers (only show if dial numbers enabled) */}
          {showDialNumbers && (
            <div>
              <label className="text-zinc-400 text-sm block mb-2">{language === 'ar' ? 'نمط الأرقام:' : 'Number Style:'}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDialContent('full0')}
                  className={`px-3 py-2 rounded text-sm ${dialContent === 'full0' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                >
                  {language === 'ar' ? 'ساعة كاملة ٠' : 'Full 0'}<br/><span className="text-xs opacity-70">{t.onlyInfinity}</span>
                </button>
                <button
                  onClick={() => setDialContent('full1')}
                  className={`px-3 py-2 rounded text-sm ${dialContent === 'full1' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                >
                  {language === 'ar' ? 'ساعة كاملة ١' : 'Full 1'}<br/><span className="text-xs opacity-70">00-23</span>
                </button>
                <button
                  onClick={() => setDialContent('full2')}
                  className={`px-3 py-2 rounded text-sm ${dialContent === 'full2' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                >
                  {language === 'ar' ? 'ساعة كاملة ٢' : 'Full 2'}<br/><span className="text-xs opacity-70">00 - 12</span>
                </button>
                <button
                  onClick={() => setDialContent('full3')}
                  className={`px-3 py-2 rounded text-sm ${dialContent === 'full3' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                >
                  {language === 'ar' ? 'ساعة كاملة ٣' : 'Full 3'}<br/><span className="text-xs opacity-70">00 - 08 - 16</span>
                </button>
                <button
                  onClick={() => setDialContent('full4')}
                  className={`px-3 py-2 rounded text-sm ${dialContent === 'full4' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                >
                  {language === 'ar' ? 'ساعة كاملة ٤' : 'Full 4'}<br/><span className="text-xs opacity-70">00 - 06 - 12 - 18</span>
                </button>
                <button
                  onClick={() => setDialContent('full6')}
                  className={`px-3 py-2 rounded text-sm ${dialContent === 'full6' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}`}
                >
                  {language === 'ar' ? 'ساعة كاملة ٦' : 'Full 6'}<br/><span className="text-xs opacity-70">00-04-08-12-16-20</span>
                </button>
              </div>
            </div>
          )}

          {/* Hour Mode Toggle (24/12) */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.hourSystem}</span>
              <p className="text-zinc-500 text-xs">
                {hourMode === '24' ? t.h24System : t.h12System}
              </p>
            </div>
            <button
              onClick={() => setHourMode(hourMode === '24' ? '12' : '24')}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${hourMode === '12' ? 'bg-amber-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs font-bold ${hourMode === '12' ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {hourMode === '24' ? '24' : '12'}
              </div>
            </button>
          </div>

          {/* Dial Flip Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.dialFlip}</span>
              <p className="text-zinc-500 text-xs">
                {dialFlipped ? t.infinityBottom : t.infinityTop}
              </p>
            </div>
            <button
              onClick={() => setDialFlipped(!dialFlipped)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${dialFlipped ? 'bg-amber-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${dialFlipped ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {dialFlipped ? '↓' : '↑'}
              </div>
            </button>
          </div>

          {/* Hands Direction Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.handsDir}</span>
              <p className="text-zinc-500 text-xs">
                {handsDirection === 'clockwise' ? t.clockwise : t.counterclockwise}
              </p>
            </div>
            <button
              onClick={() => setHandsDirection(handsDirection === 'clockwise' ? 'counterclockwise' : 'clockwise')}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${handsDirection === 'counterclockwise' ? 'bg-amber-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${handsDirection === 'counterclockwise' ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {handsDirection === 'clockwise' ? '↻' : '↺'}
              </div>
            </button>
          </div>

          {/* Arabic Hour Name Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.arabicHourName}</span>
              <p className="text-zinc-500 text-xs">
                {showArabicHourName ? getHourName(bukurHour) : t.hidden}
              </p>
            </div>
            <button
              onClick={() => setShowArabicHourName(!showArabicHourName)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${showArabicHourName ? 'bg-amber-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${showArabicHourName ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {showArabicHourName ? '☀' : '○'}
              </div>
            </button>
          </div>

          {/* Minute Markers Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.minuteMarkers}</span>
              <p className="text-zinc-500 text-xs">
                {showMinuteMarkers ? t.trackMinute : t.hidden}
              </p>
            </div>
            <button
              onClick={() => setShowMinuteMarkers(!showMinuteMarkers)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${showMinuteMarkers ? 'bg-amber-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${showMinuteMarkers ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {showMinuteMarkers ? '●' : '○'}
              </div>
            </button>
          </div>

          {/* Second Markers Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.secondMarkers}</span>
              <p className="text-zinc-500 text-xs">
                {showSecondMarkers ? t.trackSecond : t.hidden}
              </p>
            </div>
            <button
              onClick={() => setShowSecondMarkers(!showSecondMarkers)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${showSecondMarkers ? 'bg-red-500' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${showSecondMarkers ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {showSecondMarkers ? '●' : '○'}
              </div>
            </button>
          </div>

          {/* Hand Style Selector */}
          <div className="border-t border-zinc-700 pt-4">
            <label className="text-zinc-400 text-sm block mb-3">✋ {t.handStyle}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'baton', icon: '│', name: t.handStyleBaton },
                { id: 'sword', icon: '⚔️', name: t.handStyleSword },
                { id: 'dauphine', icon: '◆', name: t.handStyleDauphine },
                { id: 'leaf', icon: '🍃', name: t.handStyleLeaf },
                { id: 'mercedes', icon: '☆', name: t.handStyleMercedes },
                { id: 'alpha', icon: 'A', name: t.handStyleAlpha },
                { id: 'arrow', icon: '➤', name: t.handStyleArrow },
                { id: 'breguet', icon: '◎', name: t.handStyleBreguet },
                { id: 'cathedral', icon: '⛪', name: t.handStyleCathedral },
                { id: 'snowflake', icon: '❄️', name: t.handStyleSnowflake },
                { id: 'syringe', icon: '💉', name: t.handStyleSyringe },
                { id: 'skeleton', icon: '☐', name: t.handStyleSkeleton },
              ].map(style => (
                <button
                  key={style.id}
                  onClick={() => setHandStyle(style.id)}
                  className={`p-2 rounded-lg text-center transition-all ${
                    handStyle === style.id 
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400' 
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  <span className="text-lg block">{style.icon}</span>
                  <span className="text-xs">{style.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Show/Hide Minute Hand */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.minuteHand}</span>
              <p className="text-zinc-500 text-xs">
                {showMinuteHand ? t.visible : t.hidden}
              </p>
            </div>
            <button
              onClick={() => setShowMinuteHand(!showMinuteHand)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${showMinuteHand ? 'bg-zinc-500' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${showMinuteHand ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {showMinuteHand ? '│' : '○'}
              </div>
            </button>
          </div>

          {/* Show/Hide Second Hand */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-zinc-400 text-sm">{t.secondHand}</span>
              <p className="text-zinc-500 text-xs">
                {showSecondHand ? t.visible : t.hidden}
              </p>
            </div>
            <button
              onClick={() => setShowSecondHand(!showSecondHand)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${showSecondHand ? 'bg-red-500' : 'bg-zinc-600'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center text-xs ${showSecondHand ? 'translate-x-7' : 'translate-x-0.5'}`}>
                {showSecondHand ? '│' : '○'}
              </div>
            </button>
          </div>

          {/* Dial Mode */}
          <div>
            <label className="text-zinc-400 text-sm block mb-2">{t.dialMode}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setDialMode('clean')}
                className={`px-3 py-1 rounded text-sm ${dialMode === 'clean' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
              >
                {t.clean}
              </button>
              <button
                onClick={() => setDialMode('daynight')}
                className={`px-3 py-1 rounded text-sm ${dialMode === 'daynight' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
              >
                {t.dayNight}
              </button>
            </div>
          </div>

          {/* Night Period Selector */}
          {dialMode === 'daynight' && (
            <div>
              <label className="text-zinc-400 text-sm block mb-2">{t.nightPeriod}</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setDialNightMode('auto')}
                  className={`px-3 py-1 rounded text-sm ${dialNightMode === 'auto' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  {t.autoNight} {dialNightMode === 'auto' && `(${nightStart}:00-${nightEnd}:00)`}
                </button>
                <button
                  onClick={() => setDialNightMode('18-06')}
                  className={`px-3 py-1 rounded text-sm ${dialNightMode === '18-06' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  18:00 - 06:00
                </button>
                <button
                  onClick={() => setDialNightMode('20-04')}
                  className={`px-3 py-1 rounded text-sm ${dialNightMode === '20-04' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  20:00 - 04:00
                </button>
              </div>
              <p className="text-zinc-500 text-xs mt-1">
                {dialNightMode === 'auto' 
                  ? (language === 'ar' ? `تلقائي حسب الشهر الحالي (${time.toLocaleString('ar-SA', { month: 'long' })})` : `Auto based on current month (${time.toLocaleString('en-US', { month: 'long' })})`)
                  : (language === 'ar' ? 'الجزء الداكن = ليل • الجزء الفاتح = نهار' : 'Dark = Night • Light = Day')
                }
              </p>
            </div>
          )}

          {/* Night Color Selector */}
          {dialMode === 'daynight' && (
            <div>
              <label className="text-zinc-400 text-sm block mb-2">{t.nightColor}</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setNightColorMode('auto')}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${nightColorMode === 'auto' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seasonNightColors[currentSeason] }}></span>
                  {t.autoNight}
                </button>
                <button
                  onClick={() => setNightColorMode('summer')}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${nightColorMode === 'summer' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seasonNightColors.summer }}></span>
                  {t.summer}
                </button>
                <button
                  onClick={() => setNightColorMode('winter')}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${nightColorMode === 'winter' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seasonNightColors.winter }}></span>
                  {t.winter}
                </button>
                <button
                  onClick={() => setNightColorMode('spring')}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${nightColorMode === 'spring' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seasonNightColors.spring }}></span>
                  {t.spring}
                </button>
                <button
                  onClick={() => setNightColorMode('autumn')}
                  className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${nightColorMode === 'autumn' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seasonNightColors.autumn }}></span>
                  {t.autumn}
                </button>
              </div>
              <p className="text-zinc-500 text-xs mt-1">
                {nightColorMode === 'auto' 
                  ? (language === 'ar' ? `الموسم الحالي: ${t[currentSeason]}` : `Current season: ${t[currentSeason]}`)
                  : (language === 'ar' ? 'اختر لون خلفية الليل' : 'Choose night background color')
                }
              </p>
            </div>
          )}

          {/* Sunrise & Sunset Toggles */}
          {dialMode === 'daynight' && (
            <div className="border border-zinc-700 rounded-lg p-3">
              <label className="text-zinc-400 text-sm block mb-3">{t.sunriseSunset}</label>
              
              {/* Sunrise toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-lg">🌅</span>
                  <div>
                    <span className="text-zinc-300 text-sm">{t.showSunrise}</span>
                    <p className="text-zinc-500 text-xs">
                      {Math.floor(sunriseSunsetTimes.sunriseStart)}:{String(Math.round((sunriseSunsetTimes.sunriseStart % 1) * 60)).padStart(2, '0')} - {Math.floor(sunriseSunsetTimes.sunriseEnd)}:{String(Math.round((sunriseSunsetTimes.sunriseEnd % 1) * 60)).padStart(2, '0')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSunrise(!showSunrise)}
                  className={`w-12 h-6 rounded-full transition-colors ${showSunrise ? 'bg-amber-500' : 'bg-zinc-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showSunrise ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              {/* Sunset toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-lg">🌇</span>
                  <div>
                    <span className="text-zinc-300 text-sm">{t.showSunset}</span>
                    <p className="text-zinc-500 text-xs">
                      {Math.floor(sunriseSunsetTimes.sunsetStart)}:{String(Math.round((sunriseSunsetTimes.sunsetStart % 1) * 60)).padStart(2, '0')} - {Math.floor(sunriseSunsetTimes.sunsetEnd)}:{String(Math.round((sunriseSunsetTimes.sunsetEnd % 1) * 60)).padStart(2, '0')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSunset(!showSunset)}
                  className={`w-12 h-6 rounded-full transition-colors ${showSunset ? 'bg-red-500' : 'bg-zinc-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showSunset ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              {/* Preview colors */}
              <div className="mt-3 flex justify-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-300 to-amber-500"></span>
                  <span className="text-zinc-500 text-xs">{t.sunriseTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 to-red-600"></span>
                  <span className="text-zinc-500 text-xs">{t.sunsetTime}</span>
                </div>
              </div>
            </div>
          )}

          {/* Awake Progress */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm">{t.awakeProgress}</span>
            <button
              onClick={() => setShowAwakeProgress(!showAwakeProgress)}
              className={`w-12 h-6 rounded-full transition-colors ${showAwakeProgress ? 'bg-amber-600' : 'bg-zinc-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${showAwakeProgress ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          
          {/* Awake Tracking Hours - only show when awake progress is enabled */}
          {showAwakeProgress && (
            <div className="bg-amber-900/20 rounded-xl p-3">
              <label className="text-amber-400 text-sm block mb-2">{t.awakeTrackingHours}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="8"
                  max="24"
                  step="1"
                  value={awakeTrackingHours}
                  onChange={(e) => setAwakeTrackingHours(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-white font-bold text-lg w-16 text-center">
                  {awakeTrackingHours} {t.h}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500 text-xs mt-1">
                <span>8h</span>
                <span>16h</span>
                <span>24h</span>
              </div>
              <p className="text-amber-400/70 text-xs mt-2 text-center">
                {language === 'ar' 
                  ? `عداد اليقظة سيصل 100% بعد ${awakeTrackingHours} ساعة`
                  : `Progress reaches 100% after ${awakeTrackingHours} hours`
                }
              </p>
            </div>
          )}

          {/* Alarm & Sleep Settings */}
          <div className="border-t border-zinc-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⏰</span>
              <span className="text-zinc-300 font-bold text-sm">{t.alarmSettings}</span>
            </div>
            
            {/* Alarm Time / Wake Time (Combined) */}
            <div className="mb-4">
              <label className="text-zinc-400 text-sm block mb-2">
                ⏰☀️ {language === 'ar' ? 'وقت الاستيقاظ / المنبه:' : 'Wake Time / Alarm:'}
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-zinc-500 text-xs block mb-1">{t.hour}</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={alarmHour}
                    onChange={(e) => setAlarmHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-center text-lg font-bold"
                  />
                </div>
                <div className="flex items-end pb-2 text-zinc-400 text-xl">:</div>
                <div className="flex-1">
                  <label className="text-zinc-500 text-xs block mb-1">{t.minute}</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={alarmMinute}
                    onChange={(e) => setAlarmMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-center text-lg font-bold"
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-between items-center text-xs">
                <span className="text-amber-400">
                  🔔 {formatTime(alarmHour, alarmMinute)}
                </span>
                <span className="text-zinc-500">
                  = BUKUR {alarmBukurHour} ({language === 'ar' ? 'لتتبع اليقظة' : 'for awake tracking'})
                </span>
              </div>
            </div>
            
            {/* Desired Sleep Hours */}
            <div className="mb-4">
              <label className="text-zinc-400 text-sm block mb-2">{t.desiredSleepHours}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="4"
                  max="12"
                  step="0.5"
                  value={sleepDurationHours}
                  onChange={(e) => setSleepDurationHours(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-white font-bold text-lg w-16 text-center">
                  {sleepDurationHours} {t.h}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500 text-xs mt-1">
                <span>4h</span>
                <span>8h</span>
                <span>12h</span>
              </div>
            </div>
            
            {/* Recommended Bedtime */}
            <div className="bg-indigo-900/30 rounded-xl p-4 text-center">
              <span className="text-indigo-300 text-xs block mb-1">🌙 {t.recommendedBedtime}</span>
              <span className="text-white font-bold text-2xl">
                {formatTime(recommendedBedtime.hour, recommendedBedtime.minute)}
              </span>
              <p className="text-indigo-400 text-xs mt-2">
                {language === 'ar' 
                  ? `نم الساعة ${formatTime(recommendedBedtime.hour, recommendedBedtime.minute)} للاستيقاظ الساعة ${formatTime(alarmHour, alarmMinute)} بعد ${sleepDurationHours} ساعات`
                  : `Sleep at ${formatTime(recommendedBedtime.hour, recommendedBedtime.minute)} to wake up at ${formatTime(alarmHour, alarmMinute)} after ${sleepDurationHours}h`
                }
              </p>
            </div>
          </div>

          {/* GMT Complication */}
          <div className="border-t border-zinc-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-zinc-400 text-sm">{t.gmtComplication}</span>
                <p className="text-zinc-500 text-xs">{t.gmtDesc}</p>
              </div>
              <button
                onClick={() => setGmtEnabled(!gmtEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${gmtEnabled ? 'bg-orange-500' : 'bg-zinc-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${gmtEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            {gmtEnabled && (
              <>
                {/* GMT Offset Slider */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-400 text-sm">{t.timeDiff}</span>
                    <span className="text-orange-400 font-bold">
                      {gmtOffset >= 0 ? '+' : ''}{gmtOffset} {t.hourUnit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="14"
                    value={gmtOffset}
                    onChange={(e) => setGmtOffset(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>-12</span>
                    <span>0</span>
                    <span>+14</span>
                  </div>
                </div>
                
                {/* Current GMT City */}
                <div className="bg-zinc-700/50 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">{t.timezone}</span>
                    <div className="text-right">
                      <span className="text-orange-400 font-bold">{language === 'ar' ? getTimezoneByOffset(gmtOffset).city : getTimezoneByOffset(gmtOffset).cityEn}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-zinc-400 text-sm">{t.time}</span>
                    <span className="text-orange-400 font-mono">
                      {String(gmtDisplayHours).padStart(2, '0')}:{String(utcMinutes).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                
                {/* Quick Select Cities */}
                <div>
                  <span className="text-zinc-400 text-xs block mb-2">{t.quickSelect}</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { offset: 0, labelAr: 'لندن', labelEn: 'London' },
                      { offset: 3, labelAr: 'الرياض', labelEn: 'Riyadh' },
                      { offset: 4, labelAr: 'دبي', labelEn: 'Dubai' },
                      { offset: -5, labelAr: 'نيويورك', labelEn: 'NYC' },
                      { offset: 8, labelAr: 'بكين', labelEn: 'Beijing' },
                      { offset: 9, labelAr: 'طوكيو', labelEn: 'Tokyo' },
                      { offset: 1, labelAr: 'باريس', labelEn: 'Paris' },
                      { offset: 2, labelAr: 'القاهرة', labelEn: 'Cairo' },
                    ].map((tz) => (
                      <button
                        key={tz.offset}
                        onClick={() => setGmtOffset(tz.offset)}
                        className={`px-2 py-1 rounded text-xs ${
                          gmtOffset === tz.offset 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                        }`}
                      >
                        {language === 'ar' ? tz.labelAr : tz.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Reset Bezel - only show when bezel is enabled */}
          {showBezel && (
            <button
              onClick={() => setBezelRotation(0)}
              className="w-full py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-600"
            >
              {t.resetBezel}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-zinc-600 text-xs">
        <p>{t.footerText}</p>
        <p className="mt-1">BUKUR Time System © 2026</p>
      </div>
    </div>
  );
}
