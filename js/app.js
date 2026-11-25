const ICONS = {
  play: `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#0F3D2A" stroke="#0F3D2A" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z"/></svg>`,
  pause: `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#0F3D2A" stroke="#0F3D2A" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  bm: `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A4030" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
  mic: `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8C24A" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>`,
  undo: `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A7060" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  check: `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B6040" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"/></svg>`
};
/* ══════════════════════════════════════════════════════════════
   أثر - ATHAR Islamic Platform
   Quran API + Tafsir + Azkar Counter + Audio Player + hash routing
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
    { text: "أَعُوذُ بِاللهِ مِنْ الشَّيْطَانِ الرَّجِيمِ 'الله لا إلـه إلا هو الحي القيوم لا تأخذه سنة ولا نوم له ما في السماوات وما في الأرض من ذا الذي يشفع عنده إلا بإذنه يعلم ما بين أيديهم وما خلفهم ولا يحيطون بشيء من علمه إلا بما شاء وسع كرسيه السماوات والأرض ولا يؤوده حفظهما وهو العلي العظيم' -آية الكرسي,البقرة ,255.", src: "حصن المسلم", rep: 1 },
    { text: "بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم قُلْ هُوَ ٱللَّهُ أَحَدٌ، ٱللَّهُ ٱلصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ.", src: "حصن المسلم", rep: 3 },
    { text: "بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ.", src: "حصن المسلم", rep: 3 },
    { text: "بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ، مَلِكِ ٱلنَّاسِ، إِلَٰهِ ٱلنَّاسِ، مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ، ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ، مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ.", src: "حصن المسلم", rep: 3 },
    { text: "أَصْـبَحْنا وَأَصْـبَحَ المُـلْكُ لله وَالحَمدُ لله ، لا إلهَ إلاّ اللّهُ وَحدَهُ لا شَريكَ لهُ، لهُ المُـلكُ ولهُ الحَمْـد، وهُوَ على كلّ شَيءٍ قدير ، رَبِّ أسْـأَلُـكَ خَـيرَ ما في هـذا اليوم وَخَـيرَ ما بَعْـدَه ، وَأَعـوذُ بِكَ مِنْ شَـرِّ ما في هـذا اليوم وَشَرِّ ما بَعْـدَه، رَبِّ أَعـوذُبِكَ مِنَ الْكَسَـلِ وَسـوءِ الْكِـبَر ، رَبِّ أَعـوذُ بِكَ مِنْ عَـذابٍ في النّـارِ وَعَـذابٍ في القَـبْر.", src: "حصن المسلم", rep: 1 },
    { text: "اللّهـمَّ أَنْتَ رَبِّـي لا إلهَ إلاّ أَنْتَ ، خَلَقْتَنـي وَأَنا عَبْـدُك ، وَأَنا عَلـى عَهْـدِكَ وَوَعْـدِكَ ما اسْتَـطَعْـت ، أَعـوذُبِكَ مِنْ شَـرِّ ما صَنَـعْت ، أَبـوءُ لَـكَ بِنِعْـمَتِـكَ عَلَـيَّ وَأَبـوءُ بِذَنْـبي فَاغْفـِرْ لي فَإِنَّـهُ لا يَغْـفِرُ الذُّنـوبَ إِلاّ أَنْتَ .", src: "حصن المسلم", rep: 1 },
    { text: "رَضيـتُ بِاللهِ رَبَّـاً وَبِالإسْلامِ ديـناً وَبِمُحَـمَّدٍ صلى الله عليه وسلم نَبِيّـاً.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ إِنِّـي أَصْبَـحْتُ أُشْـهِدُك ، وَأُشْـهِدُ حَمَلَـةَ عَـرْشِـك ، وَمَلَائِكَتَكَ ، وَجَمـيعَ خَلْـقِك ، أَنَّـكَ أَنْـتَ اللهُ لا إلهَ إلاّ أَنْـتَ وَحْـدَكَ لا شَريكَ لَـك ، وَأَنَّ ُ مُحَمّـداً عَبْـدُكَ وَرَسـولُـك.", src: "حصن المسلم", rep: 4 },
    { text: "اللّهُـمَّ ما أَصْبَـَحَ بي مِـنْ نِعْـمَةٍ أَو بِأَحَـدٍ مِـنْ خَلْـقِك ، فَمِـنْكَ وَحْـدَكَ لا شريكَ لَـك ، فَلَـكَ الْحَمْـدُ وَلَـكَ الشُّكْـر.", src: "حصن المسلم", rep: 1 },
    { text: "حَسْبِـيَ اللّهُ لا إلهَ إلاّ هُوَ عَلَـيهِ تَوَكَّـلتُ وَهُوَ رَبُّ العَرْشِ العَظـيم.", src: "حصن المسلم", rep: 7 },
    { text: "بِسـمِ اللهِ الذي لا يَضُـرُّ مَعَ اسمِـهِ شَيءٌ في الأرْضِ وَلا في السّمـاءِ وَهـوَ السّمـيعُ العَلـيم.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ بِكَ أَصْـبَحْنا وَبِكَ أَمْسَـينا ، وَبِكَ نَحْـيا وَبِكَ نَمُـوتُ وَإِلَـيْكَ النُّـشُور.", src: "حصن المسلم", rep: 1 },
    { text: "أَصْبَـحْـنا عَلَى فِطْرَةِ الإسْلاَمِ، وَعَلَى كَلِمَةِ الإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إبْرَاهِيمَ حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ المُشْرِكِينَ.", src: "حصن المسلم", rep: 1 },
    { text: "سُبْحـانَ اللهِ وَبِحَمْـدِهِ عَدَدَ خَلْـقِه ، وَرِضـا نَفْسِـه ، وَزِنَـةَ عَـرْشِـه ، وَمِـدادَ كَلِمـاتِـه.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ عافِـني في بَدَنـي ، اللّهُـمَّ عافِـني في سَمْـعي ، اللّهُـمَّ عافِـني في بَصَـري ، لا إلهَ إلاّ أَنْـتَ.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ إِنّـي أَعـوذُ بِكَ مِنَ الْكُـفر ، وَالفَـقْر ، وَأَعـوذُ بِكَ مِنْ عَذابِ القَـبْر ، لا إلهَ إلاّ أَنْـتَ.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ إِنِّـي أسْـأَلُـكَ العَـفْوَ وَالعـافِـيةَ في الدُّنْـيا وَالآخِـرَة ، اللّهُـمَّ إِنِّـي أسْـأَلُـكَ العَـفْوَ وَالعـافِـيةَ في ديني وَدُنْـيايَ وَأهْـلي وَمالـي ، اللّهُـمَّ اسْتُـرْ عـوْراتي وَآمِـنْ رَوْعاتـي ، اللّهُـمَّ احْفَظْـني مِن بَـينِ يَدَيَّ وَمِن خَلْفـي وَعَن يَمـيني وَعَن شِمـالي ، وَمِن فَوْقـي ، وَأَعـوذُ بِعَظَمَـتِكَ أَن أُغْـتالَ مِن تَحْتـي.", src: "حصن المسلم", rep: 1 },
    { text: "يَا حَيُّ يَا قيُّومُ بِرَحْمَتِكَ أسْتَغِيثُ أصْلِحْ لِي شَأنِي كُلَّهُ وَلاَ تَكِلْنِي إلَى نَفْسِي طَـرْفَةَ عَيْنٍ.", src: "حصن المسلم", rep: 3 },
    { text: "أَصْبَـحْـنا وَأَصْبَـحْ المُـلكُ للهِ رَبِّ العـالَمـين ، اللّهُـمَّ إِنِّـي أسْـأَلُـكَ خَـيْرَ هـذا الـيَوْم ، فَـتْحَهُ ، وَنَصْـرَهُ ، وَنـورَهُ وَبَـرَكَتَـهُ ، وَهُـداهُ ، وَأَعـوذُ بِـكَ مِـنْ شَـرِّ ما فـيهِ وَشَـرِّ ما بَعْـدَه.", src: "حصن المسلم", rep: 1 },
    { text: "اللّهُـمَّ عالِـمَ الغَـيْبِ وَالشّـهادَةِ فاطِـرَ السّماواتِ وَالأرْضِ رَبَّ كـلِّ شَـيءٍ وَمَليـكَه ، أَشْهَـدُ أَنْ لا إِلـهَ إِلاّ أَنْت ، أَعـوذُ بِكَ مِن شَـرِّ نَفْسـي وَمِن شَـرِّ الشَّيْـطانِ وَشِرْكِهِ ، وَأَنْ أَقْتَـرِفَ عَلـى نَفْسـي سوءاً أَوْ أَجُـرَّهُ إِلـى مُسْـلِم.", src: "حصن المسلم", rep: 1 },
    { text: "أَعـوذُ بِكَلِمـاتِ اللّهِ التّـامّـاتِ مِنْ شَـرِّ ما خَلَـق.", src: "حصن المسلم", rep: 3 },
    { text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى آلِ إِبْرَاهِيمَ،إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ.", src: "حصن المسلم", rep: 10 },
    { text: "اللَّهُمَّ إِنَّا نَعُوذُ بِكَ مِنْ أَنْ نُشْرِكَ بِكَ شَيْئًا نَعْلَمُهُ ، وَنَسْتَغْفِرُكَ لِمَا لَا نَعْلَمُهُ.", src: "حصن المسلم", rep: 3 },
    { text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنْ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنْ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ، وَقَهْرِ الرِّجَالِ.", src: "حصن المسلم", rep: 3 },
    { text: "أسْتَغْفِرُ اللهَ العَظِيمَ الَّذِي لاَ إلَهَ إلاَّ هُوَ، الحَيُّ القَيُّومُ، وَأتُوبُ إلَيهِ.", src: "حصن المسلم", rep: 3 },
    { text: "يَا رَبِّ , لَكَ الْحَمْدُ كَمَا يَنْبَغِي لِجَلَالِ وَجْهِكَ , وَلِعَظِيمِ سُلْطَانِكَ.", src: "حصن المسلم", rep: 3 },
    { text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا.", src: "حصن المسلم", rep: 1 },
    { text: "اللَّهُمَّ أَنْتَ رَبِّي لا إِلَهَ إِلا أَنْتَ ، عَلَيْكَ تَوَكَّلْتُ ، وَأَنْتَ رَبُّ الْعَرْشِ الْعَظِيمِ , مَا شَاءَ اللَّهُ كَانَ ، وَمَا لَمْ يَشَأْ لَمْ يَكُنْ ، وَلا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ , أَعْلَمُ أَنَّ اللَّهَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ ، وَأَنَّ اللَّهَ قَدْ أَحَاطَ بِكُلِّ شَيْءٍ عِلْمًا , اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي ، وَمِنْ شَرِّ كُلِّ دَابَّةٍ أَنْتَ آخِذٌ بِنَاصِيَتِهَا ، إِنَّ رَبِّي عَلَى صِرَاطٍ مُسْتَقِيمٍ.", src: "حصن المسلم", rep: 1 },
    { text: "لَا إلَه إلّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءِ قَدِيرِ.", src: "حصن المسلم", rep: 100 },
    { text: "سُبْحـانَ اللهِ وَبِحَمْـدِهِ.", src: "حصن المسلم", rep: 100 },
    { text: "أسْتَغْفِرُ اللهَ وَأتُوبُ إلَيْهِ", src: "حصن المسلم", rep: 100 },
  ],
  masaa: [
    { text: "أَعُوذُ بِاللهِ مِنْ الشَّيْطَانِ الرَّجِيمِ 'الله لا إلـه إلا هو الحي القيوم لا تأخذه سنة ولا نوم له ما في السماوات وما في الأرض من ذا الذي يشفع عنده إلا بإذنه يعلم ما بين أيديهم وما خلفهم ولا يحيطون بشيء من علمه إلا بما شاء وسع كرسيه السماوات والأرض ولا يؤوده حفظهما وهو العلي العظيم' -آية الكرسي,البقرة ,255.", src: "حصن المسلم", rep: 1 },
    { text: "أَعُوذُ بِاللهِ مِنْ الشَّيْطَانِ الرَّجِيمِ آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِنْ رُسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ. لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَّسِينَآ أَوْ أَخْطَأْنَا رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِنْ قَبْلِنَا رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا أَنْتَ مَوْلَانَا فَانْصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ. [البقرة 285 - 286].", src: "حصن المسلم", rep: 1 },
    { text: "بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم قُلْ هُوَ ٱللَّهُ أَحَدٌ، ٱللَّهُ ٱلصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ.", src: "حصن المسلم", rep: 3 },
    { text: "بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ، مِن شَرِّ مَا خَلَقَ، وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ، وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ، وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ.", src: "حصن المسلم", rep: 3 },
    { text: "بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ، مَلِكِ ٱلنَّاسِ، إِلَٰهِ ٱلنَّاسِ، مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ، ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ، مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ.", src: "حصن المسلم", rep: 3 },
    { text: "أَمْسَيْـنا وَأَمْسـى المُـلْكُ لله وَالحَمدُ لله ، لا إلهَ إلاّ اللّهُ وَحدَهُ لا شَريكَ لهُ، لهُ المُـلكُ ولهُ الحَمْـد، وهُوَ على كلّ شَيءٍ قدير ، رَبِّ أسْـأَلُـكَ خَـيرَ ما في هـذا اليوم وَخَـيرَ ما بَعْـدَه ، وَأَعـوذُ بِكَ مِنْ شَـرِّ ما في هـذا اليوم وَشَرِّ ما بَعْـدَه، رَبِّ أَعـوذُبِكَ مِنَ الْكَسَـلِ وَسـوءِ الْكِـبَر ، رَبِّ أَعـوذُ بِكَ مِنْ عَـذابٍ في النّـارِ وَعَـذابٍ في القَـبْر.", src: "حصن المسلم", rep: 1 },
    { text: "اللّهـمَّ أَنْتَ رَبِّـي لا إلهَ إلاّ أَنْتَ ، خَلَقْتَنـي وَأَنا عَبْـدُك ، وَأَنا عَلـى عَهْـدِكَ وَوَعْـدِكَ ما اسْتَـطَعْـت ، أَعـوذُبِكَ مِنْ شَـرِّ ما صَنَـعْت ، أَبـوءُ لَـكَ بِنِعْـمَتِـكَ عَلَـيَّ وَأَبـوءُ بِذَنْـبي فَاغْفـِرْ لي فَإِنَّـهُ لا يَغْـفِرُ الذُّنـوبَ إِلاّ أَنْتَ .", src: "حصن المسلم", rep: 1 },
    { text: "رَضيـتُ بِاللهِ رَبَّـاً وَبِالإسْلامِ ديـناً وَبِمُحَـمَّدٍ صلى الله عليه وسلم نَبِيّـاً.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ إِنِّـي أَمسيتُ أُشْـهِدُك ، وَأُشْـهِدُ حَمَلَـةَ عَـرْشِـك ، وَمَلَائِكَتَكَ ، وَجَمـيعَ خَلْـقِك ، أَنَّـكَ أَنْـتَ اللهُ لا إلهَ إلاّ أَنْـتَ وَحْـدَكَ لا شَريكَ لَـك ، وَأَنَّ ُ مُحَمّـداً عَبْـدُكَ وَرَسـولُـك.", src: "حصن المسلم", rep: 4 },
    { text: "اللّهُـمَّ ما أَمسى بي مِـنْ نِعْـمَةٍ أَو بِأَحَـدٍ مِـنْ خَلْـقِك ، فَمِـنْكَ وَحْـدَكَ لا شريكَ لَـك ، فَلَـكَ الْحَمْـدُ وَلَـكَ الشُّكْـر.", src: "حصن المسلم", rep: 1 },
    { text: "حَسْبِـيَ اللّهُ لا إلهَ إلاّ هُوَ عَلَـيهِ تَوَكَّـلتُ وَهُوَ رَبُّ العَرْشِ العَظـيم.", src: "حصن المسلم", rep: 7 },
    { text: "بِسـمِ اللهِ الذي لا يَضُـرُّ مَعَ اسمِـهِ شَيءٌ في الأرْضِ وَلا في السّمـاءِ وَهـوَ السّمـيعُ العَلـيم.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ بِكَ أَمْسَيْـنا وَبِكَ أَصْـبَحْنا ، وَبِكَ نَحْـيا وَبِكَ نَمُـوتُ وَإِلَـيْكَ النُّـشُور.", src: "حصن المسلم", rep: 1 },
    { text: "أَمْسَيْـنا عَلَى فِطْرَةِ الإسْلاَمِ، وَعَلَى كَلِمَةِ الإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إبْرَاهِيمَ حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ المُشْرِكِينَ.", src: "حصن المسلم", rep: 1 },
    { text: "سُبْحـانَ اللهِ وَبِحَمْـدِهِ عَدَدَ خَلْـقِه ، وَرِضـا نَفْسِـه ، وَزِنَـةَ عَـرْشِـه ، وَمِـدادَ كَلِمـاتِـه.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ عافِـني في بَدَنـي ، اللّهُـمَّ عافِـني في سَمْـعي ، اللّهُـمَّ عافِـني في بَصَـري ، لا إلهَ إلاّ أَنْـتَ.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ إِنّـي أَعـوذُ بِكَ مِنَ الْكُـفر ، وَالفَـقْر ، وَأَعـوذُ بِكَ مِنْ عَذابِ القَـبْر ، لا إلهَ إلاّ أَنْـتَ.", src: "حصن المسلم", rep: 3 },
    { text: "اللّهُـمَّ إِنِّـي أسْـأَلُـكَ العَـفْوَ وَالعـافِـيةَ في الدُّنْـيا وَالآخِـرَة ، اللّهُـمَّ إِنِّـي أسْـأَلُـكَ العَـفْوَ وَالعـافِـيةَ في ديني وَدُنْـيايَ وَأهْـلي وَمالـي ، اللّهُـمَّ اسْتُـرْ عـوْراتي وَآمِـنْ رَوْعاتـي ، اللّهُـمَّ احْفَظْـني مِن بَـينِ يَدَيَّ وَمِن خَلْفـي وَعَن يَمـيني وَعَن شِمـالي ، وَمِن فَوْقـي ، وَأَعـوذُ بِعَظَمَـتِكَ أَن أُغْـتالَ مِن تَحْتـي.", src: "حصن المسلم", rep: 1 },
    { text: "يَا حَيُّ يَا قيُّومُ بِرَحْمَتِكَ أسْتَغِيثُ أصْلِحْ لِي شَأنِي كُلَّهُ وَلاَ تَكِلْنِي إلَى نَفْسِي طَـرْفَةَ عَيْنٍ.", src: "حصن المسلم", rep: 3 },
    { text: "أَمْسَيْنا وَأَمْسَى المُـلكُ للهِ رَبِّ العـالَمـين ، اللّهُـمَّ إِنِّـي أسْـأَلُـكَ خَـيْرَ هـذا الـيَوْم ، فَـتْحَهُ ، وَنَصْـرَهُ ، وَنـورَهُ وَبَـرَكَتَـهُ ، وَهُـداهُ ، وَأَعـوذُ بِـكَ مِـنْ شَـرِّ ما فـيهِ وَشَـرِّ ما بَعْـدَه.", src: "حصن المسلم", rep: 1 },
    { text: "اللّهُـمَّ عالِـمَ الغَـيْبِ وَالشّـهادَةِ فاطِـرَ السّماواتِ وَالأرْضِ رَبَّ كـلِّ شَـيءٍ وَمَليـكَه ، أَشْهَـدُ أَنْ لا إِلـهَ إِلاّ أَنْت ، أَعـوذُ بِكَ مِن شَـرِّ نَفْسـي وَمِن شَـرِّ الشَّيْـطانِ وَشِرْكِهِ ، وَأَنْ أَقْتَـرِفَ عَلـى نَفْسـي سوءاً أَوْ أَجُـرَّهُ إِلـى مُسْـلِم.", src: "حصن المسلم", rep: 1 },
    { text: "أَعـوذُ بِكَلِمـاتِ اللّهِ التّـامّـاتِ مِنْ شَـرِّ ما خَلَـق.", src: "حصن المسلم", rep: 3 },
    { text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى آلِ إِبْرَاهِيمَ،إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَآلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ.", src: "حصن المسلم", rep: 10 },
    { text: "اللَّهُمَّ إِنَّا نَعُوذُ بِكَ مِنْ أَنْ نُشْرِكَ بِكَ شَيْئًا نَعْلَمُهُ ، وَنَسْتَغْفِرُكَ لِمَا لَا نَعْلَمُهُ.", src: "حصن المسلم", rep: 3 },
    { text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنْ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنْ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ، وَقَهْرِ الرِّجَالِ.", src: "حصن المسلم", rep: 3 },
    { text: "أسْتَغْفِرُ اللهَ العَظِيمَ الَّذِي لاَ إلَهَ إلاَّ هُوَ، الحَيُّ القَيُّومُ، وَأتُوبُ إلَيهِ.", src: "حصن المسلم", rep: 3 },
    { text: "يَا رَبِّ , لَكَ الْحَمْدُ كَمَا يَنْبَغِي لِجَلَالِ وَجْهِكَ , وَلِعَظِيمِ سُلْطَانِكَ.", src: "حصن المسلم", rep: 3 },
    { text: "اللَّهُمَّ أَنْتَ رَبِّي لا إِلَهَ إِلا أَنْتَ ، عَلَيْكَ تَوَكَّلْتُ ، وَأَنْتَ رَبُّ الْعَرْشِ الْعَظِيمِ , مَا شَاءَ اللَّهُ كَانَ ، وَمَا لَمْ يَشَأْ لَمْ يَكُنْ ، وَلا حَوْلَ وَلا قُوَّةَ إِلا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ , أَعْلَمُ أَنَّ اللَّهَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ ، وَأَنَّ اللَّهَ قَدْ أَحَاطَ بِكُلِّ شَيْءٍ عِلْمًا , اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي ، وَمِنْ شَرِّ كُلِّ دَابَّةٍ أَنْتَ آخِذٌ بِنَاصِيَتِهَا ، إِنَّ رَبِّي عَلَى صِرَاطٍ مُسْتَقِيمٍ.", src: "حصن المسلم", rep: 1 },
    { text: "لَا إلَه إلّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءِ قَدِيرِ.", src: "حصن المسلم", rep: 100 },
    { text: "سُبْحـانَ اللهِ وَبِحَمْـدِهِ.", src: "حصن المسلم", rep: 100 },
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
  { name: "نورين محمد صديق", sub: "رواية الدوري عن أبي عمرو", icon: "mic", mq: "noreen-siddiq/r1" },
  { name: "عبد الرحمن السديس", sub: "إمام الحرم المكي", icon: "mic", mq: "abdulrahman-sudais/r1" },
  { name: "سعود الشريم", sub: "إمام الحرم المكي", icon: "mic", mq: "saud-shuraim/r1" },
  { name: "ماهر المعيقلي", sub: "إمام الحرم المكي", icon: "mic", mq: "maher-muaiqly/r1" },
  { name: "علي الحذيفي", sub: "إمام المسجد النبوي", icon: "mic", mq: "ali-hudhaifi/r1" },
  { name: "إدريس أبكر", sub: "تلاوة مرتلة", icon: "mic", mq: "idrees-abkar/r1" },
  { name: "بندر بليلة", sub: "إمام الحرم المكي", icon: "mic", mq: "bandar-baleela/r1" },
  { name: "أبو بكر الشاطري", sub: "تلاوة مرتلة", icon: "mic", mq: "abubakr-shatri/r1" },
  { name: "أحمد العجمي", sub: "تلاوة مرتلة", icon: "mic", mq: "ahmad-ajmi/r1" },
  { name: "محمود خليل الحصري", sub: "المصحف المرتل", icon: "mic", mq: "mahmoud-husary/r1" },
  { name: "ماهر شخاشيرو", sub: "تلاوة مرتلة", icon: "mic", mq: "maher-shakhashiro/r1" },
  { name: "عبد الباسط عبد الصمد", sub: "مجوّد", icon: "mic", ed: "ar.abdulbasitmujawwad" },
  { name: "مشاري راشد العفاسي", sub: "المصحف المرتل", icon: "mic", ed: "ar.alafasy" },
  { name: "محمد صديق المنشاوي", sub: "مجوّد", icon: "mic", ed: "ar.muhammadsiddiqalminshawimujawwad" },
  { name: "هاني الرفاعي", sub: "تلاوة خاشعة", icon: "mic", ed: "ar.haniarrifai" },
  { name: "ياسر الدوسري", sub: "إمام المسجد الحرام", icon: "mic", ed: "ar.yasseraldossari" },
  { name: "إبراهيم الدوسري", sub: "تلاوة مرتلة", icon: "mic", ed: "ar.ibrahimaldossari" },
];

const AUDIO_CDN = 'https://cdn.islamic.network/quran/audio-surah/128';
const MQ_CDN = 'https://cdn.mp3quran.net/audio';

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
/* ══════════════════════════════════════════════════════════════
   SCROLL REVEAL (subtle, respects reduced-motion)
   ══════════════════════════════════════════════════════════════ */
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealIO = (!REDUCED && 'IntersectionObserver' in window)
  ? new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
      // drop the helper classes once the animation is done so hover effects stay snappy
      setTimeout(() => e.target.classList.remove('reveal', 'in'), 1100);
    }), { threshold: 0.06, rootMargin: '0px 0px -4% 0px' })
  : null;
function reveal() {
  if (!revealIO) return;
  document.querySelectorAll('.surah-card,.hs-card,.feat-card,.zikr-card,.reciter-card,.ayat-item,.section-head,.footer-grid').forEach((el, i) => {
    if (el.dataset.rv) return;
    el.dataset.rv = '1';
    el.classList.add('reveal');
    el.style.setProperty('--d', `${(i % 8) * 45}ms`);
    if (el.getBoundingClientRect().top < window.innerHeight) {
      // already on screen: animate in on the next frame instead of waiting for the observer
      requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('in'); setTimeout(() => el.classList.remove('reveal', 'in'), 1100); }));
    } else {
      revealIO.observe(el);
    }
  });
  // safety net: never leave content hidden if the observer does not fire
  setTimeout(() => document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.remove('reveal')), 4000);
}

/* ══════════════════════════════════════════════════════════════
   ROUTER  (#/  #/quran  #/quran/18  #/quran/18/5  #/azkar  #/audio)
   ══════════════════════════════════════════════════════════════ */
const PAGES = ['home', 'quran', 'azkar', 'audio'];
const PAGE_TITLES = { home: 'أثر — منصة إسلامية', quran: 'المصحف — أثر', azkar: 'الأذكار — أثر', audio: 'المكتبة الصوتية — أثر' };

function navigate(page) {
  const h = page === 'home' ? '#/' : `#/${page}`;
  if (location.hash === h || (page === 'home' && !location.hash)) route(); else location.hash = h;
}
function openSurah(num, ayah) {
  const h = `#/quran/${num}` + (ayah ? `/${ayah}` : '');
  if (location.hash === h) route(); else location.hash = h;
}
function backToSurahList() { navigate('quran'); }

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  let page = PAGES.includes(parts[0]) ? parts[0] : 'home';
  showPage(page);
  if (page === 'quran') {
    const n = parseInt(parts[1], 10);
    if (n >= 1 && n <= 114) {
      renderSurah(n, parseInt(parts[2], 10) || 0);
      document.title = `سورة ${SURAHS_META[n - 1].ar} — أثر`;
      return;
    }
    showSurahList();
  }
  document.title = PAGE_TITLES[page];
}

function showPage(page) {
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
  setTimeout(reveal, 0);
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

async function renderSurah(num, scrollTo) {
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
          <button class="bm-btn ${saved ? 'saved' : ''}" onclick="saveBookmark(${num},${a.number},this)" aria-label="حفظ موضع القراءة عند الآية ${toAr(a.number)}">${saved ? ICONS.bm + ' موضع القراءة' : ICONS.bm + ' احفظ موضعي'}</button>
        </div>
        ${a.tafsir ? `<details class="ayat-tafsir" onclick="event.stopPropagation()"><summary>التفسير الميسر</summary><p>${esc(a.tafsir)}</p></details>` : ''}
      </div>`;
    }).join('');
    reveal();
    if (scrollTo) {
      const el = document.getElementById(`ayah-${scrollTo}`);
      if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('highlighted'); }
    }
  } catch (err) {
    container.innerHTML = `
      <div class="ayat-loading">
        <p style="color:#c0392b">تعذّر تحميل الآيات. يرجى التحقق من الاتصال بالإنترنت.</p>
        <br><button class="btn-primary" onclick="renderSurah(${num})">إعادة المحاولة</button>
      </div>`;
  }

  // also update audio player surah
  state.audio.surahNum = num;
}

function showSurahList() {
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
            <button class="z-btn reset" onclick="resetZikr('${key}',${i})" title="إعادة">${ICONS.undo}</button>
            <div>
              <div class="z-count" id="zcount-${key}">${toAr(cnt)}</div>
              <div class="z-target">من ${toAr(z.rep)}</div>
            </div>
            ${done
              ? `<span class="done-label">${ICONS.check} تم</span>`
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
    showToast('أحسنت! اكتملت الأذكار');
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
      <div class="rc-avatar">${ICONS.mic}</div>
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
  const url = r.mq ? `${MQ_CDN}/${r.mq}/${String(surahNum).padStart(3, '0')}.mp3` : `${AUDIO_CDN}/${r.ed}/${surahNum}.mp3`;
  setPlayerError('');

  if (!state.audio.element) {
    const el = new Audio();
    el.preload = 'none';
    el.addEventListener('timeupdate', onAudioTimeUpdate);
    el.addEventListener('ended', onAudioEnded);
    el.addEventListener('loadedmetadata', onAudioTimeUpdate);
    el.addEventListener('error', () => {
      state.audio.playing = false;
      document.getElementById('playBtn').innerHTML = ICONS.play;
      setPlayerError('تعذّر تحميل التلاوة. جرّب مرة أخرى أو اختر قارئاً آخر.');
    });
    state.audio.element = el;
  }

  const el = state.audio.element;
  el.src = url;
  document.getElementById('playerTitle').textContent = `سورة ${SURAHS_META[surahNum - 1]?.ar || ''}`;
  document.getElementById('playerSub').textContent = `${r.name} · ${r.sub}`;
  if (autoplay) {
    el.play().then(() => {
      state.audio.playing = true;
      document.getElementById('playBtn').innerHTML = ICONS.pause;
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
  document.getElementById('playBtn').innerHTML = ICONS.play;
  updateProgressUI(0, 0, 0);
  if (state.audio.surahNum < 114) stepSurah(1);
}

function stepSurah(d) {
  if (state.audio.reciter === null) { showToast('اختر قارئاً أولاً'); return; }
  const n = state.audio.surahNum + d;
  if (n < 1 || n > 114) return;
  state.audio.surahNum = n;
  document.getElementById('audioSurah').value = n;
  stopAudio();
  loadAudio(state.audio.reciter, n, true);
}

function togglePlay() {
  if (state.audio.reciter === null) { showToast('اختر قارئاً أولاً'); return; }
  const el = state.audio.element;
  if (!el) return;
  if (state.audio.playing) {
    el.pause();
    state.audio.playing = false;
    document.getElementById('playBtn').innerHTML = ICONS.play;
  } else {
    el.play().then(() => {
      state.audio.playing = true;
      document.getElementById('playBtn').innerHTML = ICONS.pause;
    }).catch(() => {});
  }
}

function stopAudio() {
  if (state.audio.element) state.audio.element.pause();
  state.audio.playing = false;
  document.getElementById('playBtn').innerHTML = ICONS.play;
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
  document.getElementById('timeCur').textContent = fmt(current || 0);
  document.getElementById('timeTot').textContent = total ? fmt(total) : '0:00';
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
  document.querySelectorAll('.bm-btn.saved').forEach(b => { b.classList.remove('saved'); b.innerHTML = ICONS.bm + ' احفظ موضعي'; });
  btn.classList.add('saved');
  btn.innerHTML = ICONS.bm + ' موضع القراءة';
  showToast('تم حفظ موضع القراءة');
}

function renderContinue() {
  const wrap = document.getElementById('continueWrap');
  const bm = Bookmark.get();
  const meta = bm && SURAHS_META.find(s => s.n === bm.surah);
  if (!meta) { wrap.hidden = true; return; }
  wrap.hidden = false;
  wrap.innerHTML = `<span>آخر موضع قراءة: سورة ${esc(meta.ar)}، الآية ${toAr(bm.ayah)}</span>
    <button onclick="openSurah(${bm.surah}, ${bm.ayah})">تابع القراءة</button>`;
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
   INIT
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Render home surahs preview
  renderSurahsGrid(SURAHS_META);


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

  // Router: first render + back/forward
  window.addEventListener('hashchange', route);
  route();
  reveal();

  // Logo click
  document.getElementById('navLogo').addEventListener('click', () => navigate('home'));

  // Azkar tabs
  document.querySelectorAll('.az-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAzkar(btn.dataset.cat));
  });

  // Progress track click
  const track = document.getElementById('progressTrack');
  if (track) {
    let dragging = false;
    track.addEventListener('pointerdown', e => { dragging = true; track.setPointerCapture(e.pointerId); seekAudio(e); });
    track.addEventListener('pointermove', e => { if (dragging) seekAudio(e); });
    track.addEventListener('pointerup', () => { dragging = false; });
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') skipAudio(5); else if (e.key === 'ArrowRight') skipAudio(-5);
    });
  }
});


/* ══════════════════════════════════════════════════════════════
   PWA: service worker, install button, offline Quran text
   ══════════════════════════════════════════════════════════════ */
let deferredInstall = null;
function initPWA() {
  const btn = document.getElementById('installBtn');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
    if (btn) btn.hidden = false;
  });
  window.addEventListener('appinstalled', () => { deferredInstall = null; if (btn) btn.hidden = true; showToast('تم تثبيت أثر'); });
  if (ios && btn) btn.hidden = false;
  if (btn) btn.addEventListener('click', async () => {
    if (deferredInstall) {
      deferredInstall.prompt();
      await deferredInstall.userChoice.catch(() => {});
      deferredInstall = null; btn.hidden = true;
    } else if (ios) {
      showToast('من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»');
    }
  });
  window.addEventListener('offline', () => showToast('أنت غير متصل. المحتوى المحفوظ متاح'));

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(prefetchQuran).catch(() => {});
  }
}

// After the first visit, quietly save every surah (text, translation, tafsir) so reading works offline.
async function prefetchQuran() {
  if (localStorage.getItem('athar_offline_ready') === '1') return;
  if (!navigator.onLine || (navigator.connection && navigator.connection.saveData)) return;
  if (!navigator.serviceWorker.controller) await new Promise(r => { navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }); setTimeout(r, 4000); });
  const eds = ['quran-uthmani', 'en.sahih', 'ar.muyassar'];
  const jobs = [`${QuranAPI.BASE}/surah`];
  for (let n = 1; n <= 114; n++) eds.forEach(ed => jobs.push(`${QuranAPI.BASE}/surah/${n}/${ed}`));
  let failed = 0, i = 0;
  const worker = async () => {
    while (i < jobs.length) {
      const url = jobs[i++];
      try { const r = await fetch(url); if (!r.ok) failed++; else await r.arrayBuffer(); } catch { failed++; }
    }
  };
  await new Promise(r => requestIdleCallback ? requestIdleCallback(r, { timeout: 3000 }) : setTimeout(r, 1500));
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  if (!failed) { localStorage.setItem('athar_offline_ready', '1'); showToast('تم تجهيز المصحف للقراءة بدون إنترنت'); }
}
document.addEventListener('DOMContentLoaded', initPWA);
