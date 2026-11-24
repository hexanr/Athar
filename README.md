# Athar (أثر)

Athar is a small Arabic, right-to-left Islamic web app built with plain HTML, CSS and JavaScript. No framework and no build step.

## What it does

- **Quran reader.** Lists all 114 surahs, with search. Opening a surah loads the Uthmani text and the Sahih International English translation from the public [Al-Quran Cloud API](https://alquran.cloud/api).
- **Daily azkar.** Morning, evening and sleep azkar, and supplications. Each zikr has a counter you can tap and reset.
- **Audio library.** Pick a reciter and a surah and it streams the recitation from [everyayah.com](https://everyayah.com). Play/pause, skip 15 seconds and a seek bar.
- **Accounts (demo).** Register and log in. Accounts are kept in the browser's `localStorage` only. There is no server, so this is a front-end demo that is meant to be swapped for a real API later. Do not use a real password.

## Run it

Open `athar/index.html` in a browser. An internet connection is needed for the Quran text and the audio.

## Structure

```
athar/
  index.html     page markup
  css/style.css  styles
  js/app.js      Quran API calls, azkar data, reciters, audio player, demo auth
```

## Notes

- The interface language is Arabic (`lang="ar" dir="rtl"`).
- Quran text and audio come from third-party services, so the app depends on them being online.
