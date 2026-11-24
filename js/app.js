/* ══════════════════════════════════════════════════════════════
   أثر - ATHAR Islamic Platform
   Quran API + Tafsir + Azkar Counter + Audio Player + demo Auth
   ══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────── ARABIC NUMERALS ─────────────────────── */
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

/* ─────────────────────── TOAST ─────────────────────── */
function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

/* ══════════════════════════════════════════════════════════════
   AUTH SYSTEM  (localStorage-based, ready to swap for real API)
   ══════════════════════════════════════════════════════════════ */
const Auth = {
  STORAGE_KEY: 'athar_user',

  getUser() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY)); } catch { return null; }
  },
  setUser(u) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(u)); },
  logout() { localStorage.removeItem(this.STORAGE_KEY); this.updateUI(); },

  register(name, email, password) {
    if (!name || !email || !password) return { ok: false, msg: 'يرجى ملء جميع الحقول' };
    if (password.length < 6) return { ok: false, msg: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    const users = JSON.parse(localStorage.getItem('athar_users') || '[]');
    if (users.find(u => u.email === email)) return { ok: false, msg: 'البريد الإلكتروني مسجل مسبقاً' };
    const user = { id: Date.now(), name, email, createdAt: new Date().toISOString() };
    users.push({ ...user, password });
    localStorage.setItem('athar_users', JSON.stringify(users));
    this.setUser(user);
    this.updateUI();
    return { ok: true };
  },

  login(email, password) {
    if (!email || !password) return { ok: false, msg: 'يرجى ملء جميع الحقول' };
    const users = JSON.parse(localStorage.getItem('athar_users') || '[]');
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return { ok: false, msg: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    const user = { id: found.id, name: found.name, email: found.email };
    this.setUser(user);
    this.updateUI();
    return { ok: true };
  },

  updateUI() {
    const user = this.getUser();
    const greeting = document.getElementById('userGreeting');
    const loginBtns = document.getElementById('navLoginBtns');
    if (user) {
      greeting.classList.add('visible');
      loginBtns.style.display = 'none';
      document.getElementById('userNameDisplay').textContent = user.name.split(' ')[0];
      document.getElementById('userAvatarLetter').textContent = user.name[0];
    } else {
      greeting.classList.remove('visible');
      loginBtns.style.display = 'flex';
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   QURAN API  (alquran.cloud — free, no key needed)
   ══════════════════════════════════════════════════════════════ */
const QuranAPI = {
  BASE: 'https://api.alquran.cloud/v1',
  cache: {},

  async getSurahs() {
    if (this.cache.surahs) return this.cache.surahs;
    const res = await fetch(`${this.BASE}/surah`);
    const data = await res.json();
    this.cache.surahs = data.data;
    return data.data;
  },

  async getSurah(num) {
    if (this.cache[`s${num}`]) return this.cache[`s${num}`];
    // Arabic text (Uthmani) + English translation + Tafsir al-Muyassar
    const get = ed => fetch(`${this.BASE}/surah/${num}/${ed}`).then(r => {
      if (!r.ok) throw new Error(ed);
      return r.json();
    });
    const [arData, enData, tfData] = await Promise.all([
      get('quran-uthmani'),
      get('en.sahih'),
      get('ar.muyassar').catch(() => null)   // tafsir is optional: the page still works without it
    ]);
    const result = {
      info: arData.data,
      ayat: arData.data.ayahs.map((a, i) => ({
        number: a.numberInSurah,
        // the API puts the Bismillah in front of verse 1 of every surah except Al-Fatiha: it is shown separately above
        arabic: (num !== 1 && num !== 9 && a.numberInSurah === 1) ? a.text.split(' ').slice(4).join(' ') : a.text,
        translation: enData.data.ayahs[i]?.text || '',
        tafsir: tfData?.data?.ayahs?.[i]?.text || ''
      }))
    };
    this.cache[`s${num}`] = result;
    return result;
  }
};

/* ══════════════════════════════════════════════════════════════
   SURAH DATA (for grid - name, verses count etc.)
   ══════════════════════════════════════════════════════════════ */
const SURAHS_META = [
  {n:1,ar:"الفاتحة",en:"Al-Fatiha",v:7,t:"makki"},
  {n:2,ar:"البقرة",en:"Al-Baqarah",v:286,t:"madani"},
  {n:3,ar:"آل عمران",en:"Aal-Imran",v:200,t:"madani"},
  {n:4,ar:"النساء",en:"An-Nisa",v:176,t:"madani"},
  {n:5,ar:"المائدة",en:"Al-Ma'idah",v:120,t:"madani"},
  {n:6,ar:"الأنعام",en:"Al-An'am",v:165,t:"makki"},
  {n:7,ar:"الأعراف",en:"Al-A'raf",v:206,t:"makki"},
  {n:8,ar:"الأنفال",en:"Al-Anfal",v:75,t:"madani"},
  {n:9,ar:"التوبة",en:"At-Tawbah",v:129,t:"madani"},
  {n:10,ar:"يونس",en:"Yunus",v:109,t:"makki"},
  {n:11,ar:"هود",en:"Hud",v:123,t:"makki"},
  {n:12,ar:"يوسف",en:"Yusuf",v:111,t:"makki"},
  {n:13,ar:"الرعد",en:"Ar-Ra'd",v:43,t:"madani"},
  {n:14,ar:"إبراهيم",en:"Ibrahim",v:52,t:"makki"},
  {n:15,ar:"الحجر",en:"Al-Hijr",v:99,t:"makki"},
  {n:16,ar:"النحل",en:"An-Nahl",v:128,t:"makki"},
  {n:17,ar:"الإسراء",en:"Al-Isra",v:111,t:"makki"},
  {n:18,ar:"الكهف",en:"Al-Kahf",v:110,t:"makki"},
  {n:19,ar:"مريم",en:"Maryam",v:98,t:"makki"},
  {n:20,ar:"طه",en:"Ta-Ha",v:135,t:"makki"},
  {n:21,ar:"الأنبياء",en:"Al-Anbiya",v:112,t:"makki"},
  {n:22,ar:"الحج",en:"Al-Hajj",v:78,t:"madani"},
  {n:23,ar:"المؤمنون",en:"Al-Muminun",v:118,t:"makki"},
  {n:24,ar:"النور",en:"An-Nur",v:64,t:"madani"},
  {n:25,ar:"الفرقان",en:"Al-Furqan",v:77,t:"makki"},
  {n:26,ar:"الشعراء",en:"Ash-Shu'ara",v:227,t:"makki"},
  {n:27,ar:"النمل",en:"An-Naml",v:93,t:"makki"},
  {n:28,ar:"القصص",en:"Al-Qasas",v:88,t:"makki"},
  {n:29,ar:"العنكبوت",en:"Al-Ankabut",v:69,t:"makki"},
  {n:30,ar:"الروم",en:"Ar-Rum",v:60,t:"makki"},
  {n:31,ar:"لقمان",en:"Luqman",v:34,t:"makki"},
  {n:32,ar:"السجدة",en:"As-Sajdah",v:30,t:"makki"},
  {n:33,ar:"الأحزاب",en:"Al-Ahzab",v:73,t:"madani"},
  {n:34,ar:"سبأ",en:"Saba",v:54,t:"makki"},
  {n:35,ar:"فاطر",en:"Fatir",v:45,t:"makki"},
  {n:36,ar:"يس",en:"Ya-Sin",v:83,t:"makki"},
  {n:37,ar:"الصافات",en:"As-Saffat",v:182,t:"makki"},
  {n:38,ar:"ص",en:"Sad",v:88,t:"makki"},
  {n:39,ar:"الزمر",en:"Az-Zumar",v:75,t:"makki"},
  {n:40,ar:"غافر",en:"Ghafir",v:85,t:"makki"},
  {n:41,ar:"فصلت",en:"Fussilat",v:54,t:"makki"},
  {n:42,ar:"الشورى",en:"Ash-Shura",v:53,t:"makki"},
  {n:43,ar:"الزخرف",en:"Az-Zukhruf",v:89,t:"makki"},
  {n:44,ar:"الدخان",en:"Ad-Dukhan",v:59,t:"makki"},
  {n:45,ar:"الجاثية",en:"Al-Jathiyah",v:37,t:"makki"},
  {n:46,ar:"الأحقاف",en:"Al-Ahqaf",v:35,t:"makki"},
  {n:47,ar:"محمد",en:"Muhammad",v:38,t:"madani"},
  {n:48,ar:"الفتح",en:"Al-Fath",v:29,t:"madani"},
  {n:49,ar:"الحجرات",en:"Al-Hujurat",v:18,t:"madani"},
  {n:50,ar:"ق",en:"Qaf",v:45,t:"makki"},
  {n:51,ar:"الذاريات",en:"Adh-Dhariyat",v:60,t:"makki"},
  {n:52,ar:"الطور",en:"At-Tur",v:49,t:"makki"},
  {n:53,ar:"النجم",en:"An-Najm",v:62,t:"makki"},
  {n:54,ar:"القمر",en:"Al-Qamar",v:55,t:"makki"},
  {n:55,ar:"الرحمن",en:"Ar-Rahman",v:78,t:"madani"},
  {n:56,ar:"الواقعة",en:"Al-Waqi'ah",v:96,t:"makki"},
  {n:57,ar:"الحديد",en:"Al-Hadid",v:29,t:"madani"},
  {n:58,ar:"المجادلة",en:"Al-Mujadila",v:22,t:"madani"},
  {n:59,ar:"الحشر",en:"Al-Hashr",v:24,t:"madani"},
  {n:60,ar:"الممتحنة",en:"Al-Mumtahana",v:13,t:"madani"},
  {n:61,ar:"الصف",en:"As-Saf",v:14,t:"madani"},
  {n:62,ar:"الجمعة",en:"Al-Jumu'ah",v:11,t:"madani"},
  {n:63,ar:"المنافقون",en:"Al-Munafiqun",v:11,t:"madani"},
  {n:64,ar:"التغابن",en:"At-Taghabun",v:18,t:"madani"},
  {n:65,ar:"الطلاق",en:"At-Talaq",v:12,t:"madani"},
  {n:66,ar:"التحريم",en:"At-Tahrim",v:12,t:"madani"},
  {n:67,ar:"الملك",en:"Al-Mulk",v:30,t:"makki"},
  {n:68,ar:"القلم",en:"Al-Qalam",v:52,t:"makki"},
  {n:69,ar:"الحاقة",en:"Al-Haqqah",v:52,t:"makki"},
  {n:70,ar:"المعارج",en:"Al-Ma'arij",v:44,t:"makki"},
  {n:71,ar:"نوح",en:"Nuh",v:28,t:"makki"},
  {n:72,ar:"الجن",en:"Al-Jinn",v:28,t:"makki"},
  {n:73,ar:"المزمل",en:"Al-Muzzammil",v:20,t:"makki"},
  {n:74,ar:"المدثر",en:"Al-Muddaththir",v:56,t:"makki"},
  {n:75,ar:"القيامة",en:"Al-Qiyamah",v:40,t:"makki"},
  {n:76,ar:"الإنسان",en:"Al-Insan",v:31,t:"madani"},
  {n:77,ar:"المرسلات",en:"Al-Mursalat",v:50,t:"makki"},
  {n:78,ar:"النبأ",en:"An-Naba",v:40,t:"makki"},
  {n:79,ar:"النازعات",en:"An-Nazi'at",v:46,t:"makki"},
  {n:80,ar:"عبس",en:"Abasa",v:42,t:"makki"},
  {n:81,ar:"التكوير",en:"At-Takwir",v:29,t:"makki"},
  {n:82,ar:"الانفطار",en:"Al-Infitar",v:19,t:"makki"},
  {n:83,ar:"المطففين",en:"Al-Mutaffifin",v:36,t:"makki"},
  {n:84,ar:"الانشقاق",en:"Al-Inshiqaq",v:25,t:"makki"},
  {n:85,ar:"البروج",en:"Al-Buruj",v:22,t:"makki"},
  {n:86,ar:"الطارق",en:"At-Tariq",v:17,t:"makki"},
  {n:87,ar:"الأعلى",en:"Al-A'la",v:19,t:"makki"},
  {n:88,ar:"الغاشية",en:"Al-Ghashiyah",v:26,t:"makki"},
  {n:89,ar:"الفجر",en:"Al-Fajr",v:30,t:"makki"},
  {n:90,ar:"البلد",en:"Al-Balad",v:20,t:"makki"},
  {n:91,ar:"الشمس",en:"Ash-Shams",v:15,t:"makki"},
  {n:92,ar:"الليل",en:"Al-Layl",v:21,t:"makki"},
  {n:93,ar:"الضحى",en:"Ad-Duha",v:11,t:"makki"},
  {n:94,ar:"الشرح",en:"Ash-Sharh",v:8,t:"makki"},
  {n:95,ar:"التين",en:"At-Tin",v:8,t:"makki"},
  {n:96,ar:"العلق",en:"Al-Alaq",v:19,t:"makki"},
  {n:97,ar:"القدر",en:"Al-Qadr",v:5,t:"makki"},
  {n:98,ar:"البينة",en:"Al-Bayyinah",v:8,t:"madani"},
  {n:99,ar:"الزلزلة",en:"Az-Zalzalah",v:8,t:"madani"},
  {n:100,ar:"العاديات",en:"Al-Adiyat",v:11,t:"makki"},
  {n:101,ar:"القارعة",en:"Al-Qari'ah",v:11,t:"makki"},
  {n:102,ar:"التكاثر",en:"At-Takathur",v:8,t:"makki"},
  {n:103,ar:"العصر",en:"Al-Asr",v:3,t:"makki"},
  {n:104,ar:"الهمزة",en:"Al-Humazah",v:9,t:"makki"},
  {n:105,ar:"الفيل",en:"Al-Fil",v:5,t:"makki"},
  {n:106,ar:"قريش",en:"Quraysh",v:4,t:"makki"},
  {n:107,ar:"الماعون",en:"Al-Ma'un",v:7,t:"makki"},
  {n:108,ar:"الكوثر",en:"Al-Kawthar",v:3,t:"makki"},
  {n:109,ar:"الكافرون",en:"Al-Kafirun",v:6,t:"makki"},
  {n:110,ar:"النصر",en:"An-Nasr",v:3,t:"madani"},
  {n:111,ar:"المسد",en:"Al-Masad",v:5,t:"makki"},
  {n:112,ar:"الإخلاص",en:"Al-Ikhlas",v:4,t:"makki"},
  {n:113,ar:"الفلق",en:"Al-Falaq",v:5,t:"makki"},
  {n:114,ar:"الناس",en:"An-Nas",v:6,t:"makki"},
];

/* ══════════════════════════════════════════════════════════════
   AZKAR DATA
   ══════════════════════════════════════════════════════════════ */
const AZKAR = {
  sabah: [
    { text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ\nاللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ", src: "آية الكرسي — البقرة ٢٥٥", rep: 1 },
    { text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", src: "رواه أبو داود", rep: 1 },
    { text: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ", src: "رواه الترمذي", rep: 1 },
    { text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ", src: "سيد الاستغفار — رواه البخاري", rep: 1 },
    { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", src: "رواه مسلم", rep: 100 },
    { text: "لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", src: "رواه البخاري ومسلم", rep: 10 },
    { text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ", src: "رواه أبو داود", rep: 3 },
  ],
  masaa: [
    { text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ\nاللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", src: "آية الكرسي — البقرة ٢٥٥", rep: 1 },
    { text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", src: "رواه أبو داود", rep: 1 },
    { text: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ", src: "رواه الترمذي", rep: 1 },
    { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", src: "رواه مسلم", rep: 100 },
    { text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ", src: "رواه أبو داود وابن ماجه", rep: 3 },
    { text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", src: "رواه أبو داود والترمذي", rep: 3 },
  ],
  nawm: [
    { text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", src: "رواه البخاري", rep: 1 },
    { text: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ", src: "رواه أبو داود والترمذي", rep: 3 },
    { text: "اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ", src: "رواه البخاري ومسلم", rep: 1 },
    { text: "سُبْحَانَ اللَّهِ", src: "تسبيح النوم — رواه البخاري ومسلم", rep: 33 },
    { text: "الْحَمْدُ لِلَّهِ", src: "تحميد النوم — رواه البخاري ومسلم", rep: 33 },
    { text: "اللَّهُ أَكْبَرُ", src: "تكبير النوم — رواه البخاري ومسلم", rep: 34 },
    { text: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", src: "المعوذات — رواه البخاري", rep: 3 },
  ],
  adiya: [
    { text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", src: "سورة البقرة ٢٠١", rep: 1 },
    { text: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ", src: "رواه أبو داود والنسائي", rep: 1 },
    { text: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ", src: "رواه أبو داود والترمذي", rep: 100 },
    { text: "اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي ظُلْمًا كَثِيرًا وَلَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ، فَاغْفِرْ لِي مَغْفِرَةً مِنْ عِنْدِكَ", src: "رواه البخاري ومسلم", rep: 1 },
    { text: "سُبْحَانَ رَبِّيَ الْعَظِيمِ", src: "ذكر الركوع", rep: 3 },
    { text: "سُبْحَانَ رَبِّيَ الْأَعْلَىٰ", src: "ذكر السجود", rep: 3 },
  ]
};

/* ══════════════════════════════════════════════════════════════
   RECITERS DATA
   ══════════════════════════════════════════════════════════════ */
const RECITERS = [
  { name: "عبد الباسط عبد الصمد", sub: "مجوّد", icon: "🎙", ed: "ar.abdulbasitmujawwad" },
  { name: "مشاري راشد العفاسي", sub: "المصحف المرتل", icon: "🎵", ed: "ar.alafasy" },
  { name: "محمد صديق المنشاوي", sub: "مجوّد", icon: "🎤", ed: "ar.muhammadsiddiqalminshawimujawwad" },
  { name: "هاني الرفاعي", sub: "تلاوة خاشعة", icon: "🌙", ed: "ar.haniarrifai" },
  { name: "ياسر الدوسري", sub: "إمام المسجد الحرام", icon: "🕌", ed: "ar.yasseraldossari" },
  { name: "إبراهيم الدوسري", sub: "تلاوة مرتلة", icon: "⭐", ed: "ar.ibrahimaldossari" },
];
const AUDIO_CDN = 'https://cdn.islamic.network/quran/audio-surah/128';

/* ══════════════════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════════════════ */
const state = {
  currentPage: 'home',
  currentSurah: null,
  azkarCategory: 'sabah',
  azkarCounters: {},    // { 'sabah-0': 5, ... }
  audio: {
    reciter: null,
    surahNum: 1,
    playing: false,
    element: null,
  }
};

/* ══════════════════════════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════════════════════════ */
function navigate(page) {
  // hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) { pageEl.classList.add('active'); state.currentPage = page; }

  const navLink = document.querySelector(`.nav-links a[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMenu();

  // lazy init
  if (page === 'azkar') renderAzkar();
  if (page === 'audio') { renderAudioSurahs(); renderReciters(); }
  if (page === 'home') renderContinue();
}

/* ══════════════════════════════════════════════════════════════
   QURAN PAGE
   ══════════════════════════════════════════════════════════════ */
function renderSurahsGrid(list) {
  const grid = document.getElementById('surahsGrid');
  grid.innerHTML = list.map(s => `
    <div class="surah-card" role="button" tabindex="0" onclick="openSurah(${s.n})">
      <div class="sc-top">
        <div class="sc-num">${toAr(s.n)}</div>
        <div>
          <div class="sc-name">${s.ar}</div>
          <div class="sc-en">${s.en}</div>
        </div>
      </div>
      <div class="sc-bottom">
        <span class="sc-verses">${toAr(s.v)} آية</span>
        <span class="sc-type ${s.t}">${s.t === 'makki' ? 'مكية' : 'مدنية'}</span>
      </div>
    </div>`).join('');
}

function filterSurahs() {
  const q = document.getElementById('surahSearch').value.trim().toLowerCase();
  if (!q) { renderSurahsGrid(SURAHS_META); return; }
  renderSurahsGrid(SURAHS_META.filter(s =>
    s.ar.includes(q) || s.en.toLowerCase().includes(q) || String(s.n).includes(q)
  ));
}

async function openSurah(num, scrollTo) {
  state.currentSurah = num;
  const meta = SURAHS_META.find(s => s.n === num) || { ar: 'سورة', n: num, v: 0, t: 'makki' };

  // Switch to ayat view
  document.getElementById('surahListView').style.display = 'none';
  const ayatView = document.getElementById('ayatView');
  ayatView.classList.add('active');

  document.getElementById('ayatSurahName').textContent = meta.ar;
  document.getElementById('ayatSurahMeta').textContent =
    `${meta.t === 'makki' ? 'مكية' : 'مدنية'} · ${toAr(meta.v)} آية`;

  // Hide bismillah for surat at-tawbah
  document.getElementById('bismillahLine').style.display = (num === 9) ? 'none' : 'block';

  // Show loader
  const container = document.getElementById('ayatListContainer');
  container.innerHTML = `<div class="ayat-loading"><div class="loading-spinner"></div><p>جارٍ تحميل الآيات...</p></div>`;

  try {
    const data = await QuranAPI.getSurah(num);
    const bm = Bookmark.get();
    container.innerHTML = data.ayat.map(a => {
      const saved = bm && bm.surah === num && bm.ayah === a.number;
      return `
      <div class="ayat-item" id="ayah-${a.number}" onclick="this.classList.toggle('highlighted')">
        <div class="ayat-arabic">
          <span class="ayat-num-badge">${toAr(a.number)}</span>
          ${esc(a.arabic)}
        </div>
        <div class="ayat-translation" lang="en" dir="ltr">${esc(a.translation)}</div>
        <div class="ayat-actions" onclick="event.stopPropagation()">
          <button class="bm-btn ${saved ? 'saved' : ''}" onclick="saveBookmark(${num},${a.number},this)" aria-label="حفظ موضع القراءة عند الآية ${toAr(a.number)}">${saved ? '🔖 موضع القراءة' : '🔖 احفظ موضعي'}</button>
        </div>
        ${a.tafsir ? `<details class="ayat-tafsir" onclick="event.stopPropagation()"><summary>التفسير الميسر</summary><p>${esc(a.tafsir)}</p></details>` : ''}
      </div>`;
    }).join('');
    if (scrollTo) {
      const el = document.getElementById(`ayah-${scrollTo}`);
      if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('highlighted'); }
    }
  } catch (err) {
    container.innerHTML = `
      <div class="ayat-loading">
        <p style="color:#c0392b">تعذّر تحميل الآيات. يرجى التحقق من الاتصال بالإنترنت.</p>
        <br><button class="btn-primary" onclick="openSurah(${num})">إعادة المحاولة</button>
      </div>`;
  }

  // also update audio player surah
  state.audio.surahNum = num;
}

function backToSurahList() {
  document.getElementById('ayatView').classList.remove('active');
  document.getElementById('surahListView').style.display = 'block';
}

/* ══════════════════════════════════════════════════════════════
   AZKAR PAGE
   ══════════════════════════════════════════════════════════════ */
function switchAzkar(cat) {
  state.azkarCategory = cat;
  document.querySelectorAll('.az-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.az-tab[data-cat="${cat}"]`).classList.add('active');
  renderAzkar();
}

function renderAzkar() {
  const cat = state.azkarCategory;
  const list = AZKAR[cat] || [];
  const grid = document.getElementById('azkarGrid');

  grid.innerHTML = list.map((z, i) => {
    const key = `${cat}-${i}`;
    const cnt = state.azkarCounters[key] || 0;
    const done = cnt >= z.rep;
    const pct = Math.min(100, Math.round((cnt / z.rep) * 100));
    return `
      <div class="zikr-card ${done ? 'done' : ''}" id="zc-${key}">
        <div class="zikr-text">${z.text.replace(/\n/g, '<br>')}</div>
        <div class="zikr-footer">
          <div class="zikr-source">${z.src}</div>
          <div class="zikr-counter-area">
            <button class="z-btn reset" onclick="resetZikr('${key}',${i})" title="إعادة">↺</button>
            <div>
              <div class="z-count" id="zcount-${key}">${toAr(cnt)}</div>
              <div class="z-target">من ${toAr(z.rep)}</div>
            </div>
            ${done
              ? `<span class="done-label">✓ تم</span>`
              : `<button class="z-btn inc" onclick="incZikr('${key}',${z.rep})">+</button>`
            }
          </div>
        </div>
        <div class="zikr-progress-bar">
          <div class="zikr-progress-fill" id="zpf-${key}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
}

function incZikr(key, rep) {
  state.azkarCounters[key] = (state.azkarCounters[key] || 0) + 1;
  const cnt = state.azkarCounters[key];
  const pct = Math.min(100, Math.round((cnt / rep) * 100));
  document.getElementById(`zcount-${key}`).textContent = toAr(cnt);
  document.getElementById(`zpf-${key}`).style.width = pct + '%';
  if (cnt >= rep) {
    renderAzkar();
    showToast('أحسنت! اكتملت الأذكار ✓');
  }
}

function resetZikr(key) {
  state.azkarCounters[key] = 0;
  renderAzkar();
}

/* ══════════════════════════════════════════════════════════════
   AUDIO PAGE
   ══════════════════════════════════════════════════════════════ */
function renderAudioSurahs() {
  const sel = document.getElementById('audioSurah');
  if (!sel.options.length) {
    sel.innerHTML = SURAHS_META.map(s => `<option value="${s.n}">${toAr(s.n)}. ${s.ar}</option>`).join('');
    sel.addEventListener('change', () => {
      state.audio.surahNum = Number(sel.value);
      if (state.audio.reciter !== null) { stopAudio(); loadAudio(state.audio.reciter, state.audio.surahNum, true); }
    });
  }
  sel.value = state.audio.surahNum;
}

function renderReciters() {
  const grid = document.getElementById('recitersGrid');
  grid.innerHTML = RECITERS.map((r, i) => `
    <button type="button" class="reciter-card ${state.audio.reciter === i ? 'active' : ''}" id="rc-${i}" onclick="selectReciter(${i})" aria-pressed="${state.audio.reciter === i}">
      <div class="rc-avatar">${r.icon}</div>
      <div>
        <div class="rc-name">${r.name}</div>
        <div class="rc-sub">${r.sub}</div>
      </div>
    </button>`).join('');
}

function selectReciter(i) {
  state.audio.reciter = i;
  document.querySelectorAll('.reciter-card').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
  const card = document.getElementById(`rc-${i}`);
  card.classList.add('active');
  card.setAttribute('aria-pressed', 'true');
  stopAudio();
  loadAudio(i, state.audio.surahNum, true);
}

function setPlayerError(msg) {
  let e = document.getElementById('playerErr');
  if (!e) {
    e = document.createElement('div');
    e.id = 'playerErr'; e.className = 'err'; e.setAttribute('role', 'alert');
    document.querySelector('.player-bar').appendChild(e);
  }
  e.textContent = msg || '';
}

function loadAudio(reciterIdx, surahNum, autoplay) {
  const r = RECITERS[reciterIdx];
  const url = `${AUDIO_CDN}/${r.ed}/${surahNum}.mp3`;
  setPlayerError('');

  if (!state.audio.element) {
    const el = new Audio();
    el.preload = 'none';
    el.addEventListener('timeupdate', onAudioTimeUpdate);
    el.addEventListener('ended', onAudioEnded);
    el.addEventListener('error', () => {
      state.audio.playing = false;
      document.getElementById('playBtn').textContent = '▶';
      setPlayerError('تعذّر تحميل التلاوة. تحقق من الاتصال بالإنترنت أو جرّب قارئاً آخر.');
    });
    state.audio.element = el;
  }

  const el = state.audio.element;
  el.src = url;
  document.getElementById('playerTitle').textContent = `${r.name} — ${SURAHS_META[surahNum - 1]?.ar || ''}`;
  document.getElementById('playerSub').textContent = r.sub;
  if (autoplay) {
    el.play().then(() => {
      state.audio.playing = true;
      document.getElementById('playBtn').textContent = '⏸';
    }).catch(() => { /* the error event above reports real failures */ });
  }
}

function onAudioTimeUpdate() {
  const el = state.audio.element;
  if (!el.duration) return;
  updateProgressUI((el.currentTime / el.duration) * 100, el.currentTime, el.duration);
}

function onAudioEnded() {
  state.audio.playing = false;
  document.getElementById('playBtn').textContent = '▶';
  updateProgressUI(0, 0, 0);
}

function togglePlay() {
  if (state.audio.reciter === null) { showToast('اختر قارئاً أولاً'); return; }
  const el = state.audio.element;
  if (!el) return;
  if (state.audio.playing) {
    el.pause();
    state.audio.playing = false;
    document.getElementById('playBtn').textContent = '▶';
  } else {
    el.play().then(() => {
      state.audio.playing = true;
      document.getElementById('playBtn').textContent = '⏸';
    }).catch(() => {});
  }
}

function stopAudio() {
  if (state.audio.element) state.audio.element.pause();
  state.audio.playing = false;
  document.getElementById('playBtn').textContent = '▶';
  updateProgressUI(0, 0, 0);
}

function skipAudio(sec) {
  const el = state.audio.element;
  if (el && el.duration) el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + sec));
}

function seekAudio(e) {
  const el = state.audio.element;
  if (!el || !el.duration) return;
  const rect = document.getElementById('progressTrack').getBoundingClientRect();
  // RTL page: the bar fills from the right edge
  const pct = Math.max(0, Math.min(1, (rect.right - e.clientX) / rect.width));
  el.currentTime = pct * el.duration;
}

function updateProgressUI(pct, current, total) {
  document.getElementById('progressFill').style.width = pct.toFixed(1) + '%';
  document.getElementById('progressTrack').setAttribute('aria-valuenow', Math.round(pct));
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  document.getElementById('playerTime').textContent = total ? `${fmt(current)} / ${fmt(total)}` : '';
}

/* ══════════════════════════════════════════════════════════════
   BOOKMARK (last read) + THEME + MOBILE MENU
   ══════════════════════════════════════════════════════════════ */
const Bookmark = {
  KEY: 'athar_bookmark',
  get() { try { return JSON.parse(localStorage.getItem(this.KEY)); } catch { return null; } },
  set(surah, ayah) { localStorage.setItem(this.KEY, JSON.stringify({ surah, ayah })); }
};

function saveBookmark(surah, ayah, btn) {
  Bookmark.set(surah, ayah);
  document.querySelectorAll('.bm-btn.saved').forEach(b => { b.classList.remove('saved'); b.textContent = '🔖 احفظ موضعي'; });
  btn.classList.add('saved');
  btn.textContent = '🔖 موضع القراءة';
  showToast('تم حفظ موضع القراءة');
}

function renderContinue() {
  const wrap = document.getElementById('continueWrap');
  const bm = Bookmark.get();
  const meta = bm && SURAHS_META.find(s => s.n === bm.surah);
  if (!meta) { wrap.hidden = true; return; }
  wrap.hidden = false;
  wrap.innerHTML = `<span>آخر موضع قراءة: سورة ${esc(meta.ar)}، الآية ${toAr(bm.ayah)}</span>
    <button onclick="openSurah(${bm.surah}, ${bm.ayah}); navigate('quran')">تابع القراءة</button>`;
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'dark' ? '#0c1711' : '#0F3D2A');
}
function initTheme() {
  let t = localStorage.getItem('athar_theme');
  if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(t);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('athar_theme', next);
    applyTheme(next);
  });
}

function closeMenu() {
  document.getElementById('navLinks')?.classList.remove('open');
  document.getElementById('navToggle')?.setAttribute('aria-expanded', 'false');
}

/* ══════════════════════════════════════════════════════════════
   AUTH MODAL
   ══════════════════════════════════════════════════════════════ */
function openAuthModal(tab = 'login') {
  document.getElementById('authModal').classList.add('open');
  switchAuthTab(tab);
}
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`form-${tab}`).classList.add('active');
}

function handleLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const result = Auth.login(email, password);
  if (result.ok) {
    closeAuthModal();
    showToast(`مرحباً ${Auth.getUser().name} 🌿`);
  } else {
    document.getElementById('loginError').textContent = result.msg;
  }
}

function handleRegister() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const result = Auth.register(name, email, password);
  if (result.ok) {
    closeAuthModal();
    showToast(`أهلاً بك ${name}! تم إنشاء حسابك ✓`);
  } else {
    document.getElementById('registerError').textContent = result.msg;
  }
}

function handleLogout() {
  Auth.logout();
  showToast('تم تسجيل الخروج');
}

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Render home surahs preview
  renderSurahsGrid(SURAHS_META);

  // Auth state
  Auth.updateUI();

  initTheme();
  renderContinue();
  document.getElementById('footYear').textContent = toAr(new Date().getFullYear());

  // Mobile menu
  document.getElementById('navToggle').addEventListener('click', () => {
    const open = document.getElementById('navLinks').classList.toggle('open');
    document.getElementById('navToggle').setAttribute('aria-expanded', String(open));
  });

  // Keyboard activation for div-based cards
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.surah-card, .hs-card, .nav-logo')) {
      e.preventDefault(); e.target.click();
    }
  });

  // Open the page named in the URL hash (#quran, #azkar, #audio)
  const hashPage = location.hash.replace('#', '');
  if (['quran', 'azkar', 'audio'].includes(hashPage)) navigate(hashPage);

  // Nav links
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigate(a.dataset.page);
    });
  });

  // Logo click
  document.getElementById('navLogo').addEventListener('click', () => navigate('home'));

  // Home feature cards
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.nav); });
  });

  // Azkar tabs
  document.querySelectorAll('.az-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAzkar(btn.dataset.cat));
  });

  // Auth modal backdrop close
  document.getElementById('authModal').addEventListener('click', e => {
    if (e.target === document.getElementById('authModal')) closeAuthModal();
  });

  // Keyboard escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAuthModal();
  });

  // Progress track click
  document.getElementById('progressTrack')?.addEventListener('click', seekAudio);

  // Enter key in login
  document.getElementById('loginPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('regPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });
});
