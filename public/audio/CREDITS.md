# Audio credits

Every sfx file in this folder (Ch2/Ch3 fight, crowd and paper sounds; Ch4 `desk-*`; Ch5 `city-*`) is a recorded sound,
trimmed, converted to mono 44.1 kHz MP3 and peak-normalised (sfx ~ -3 dBFS); the music files are stereo 44.1 kHz
112 kbps MP3 at -18.5 LUFS (no clipping).
Sources: CC0 / public domain, the Pixabay Content License (free, commercial use allowed, no attribution required),
and CC BY files that **require visible credit** (marked below). Sources checked 2026-10-14 (Ch2/Ch3) and 2026-10-15
(Ch4/Ch5; no new file needs credit).

## Credit required on the site (CC BY)

Currently on the site (Index footer):

> Audience laugh: "approx-800-laugh-1" by lonemonk (freesound.org/people/lonemonk), CC BY 3.0
> https://creativecommons.org/licenses/by/3.0/

Only if `music-diary-alt1.mp3` is ever swapped in as the Ch3 music, also add (Silverman Sound's own credit text):

> Music: Happy Clappy Ukulele by Shane Ivers - https://www.silvermansound.com
> Licensed under Creative Commons Attribution 4.0 International License
> https://creativecommons.org/licenses/by/4.0/

## Music (Chapter 3 diary)

All three files are cut for a seamless loop: each is source[s, s + L + 0.015 s], where L is a whole number of bars
and s sits just before a beat. The player (`audio.ts`, `DIARY_XFADE`) overlaps each pass's last 15 ms with the next
pass's first 15 ms, so the loop period is exactly L. To swap tracks, change only the `'music-diary'` filename in
`SAMPLE_FILES` (`src/story/engine/audio.ts`).

| File | Used for | Source | Author | Licence |
|---|---|---|---|---|
| `music-diary.mp3` | **Live** Ch3 music (`music.play('diary')`). Whole song, bars 1–50 at 110 bpm (0–109.09 s of the original, 109.1 s loop); the song's last bar returns to its first. Gain -5.9 dB | "Uplifting Funny Whistle Folk", https://pixabay.com/music/upbeat-uplifting-funny-whistle-folk-227625/ (Pixabay id 227625, not AI-generated, no YouTube Content ID) | Emmraan (https://pixabay.com/users/emmraan-24732583/) | Pixabay Content License (https://pixabay.com/service/license-summary/), no credit required |
| `music-diary-alt1.mp3` | Runner-up 1, audition only (`/?audio-demo`, track `diaryAlt1`). 38 bars at 90 bpm from 69.666 s of the original (101.3 s loop, includes the whistle section); gain -10.3 dB | "Happy Clappy Ukulele", https://www.silvermansound.com/free-music/happy-clappy-ukulele (file via https://www.chosic.com/download-audio/27306/; ISRC UKEZT1600029) | Shane Ivers (Silverman Sound) | **CC BY 4.0, credit required if used** (text above) |
| `music-diary-alt2.mp3` | Runner-up 2, audition only (`/?audio-demo`, track `diaryAlt2`). 56 bars at 120 bpm from 18.006 s of the original (bars 10–65, 112 s loop); gain -8.3 dB | "Upbeat Acoustic", https://pixabay.com/music/acoustic-group-upbeat-acoustic-113986/ (Pixabay id 113986, not AI-generated, no YouTube Content ID) | Stockaudios (https://pixabay.com/users/stockaudios-28301327/) | Pixabay Content License, no credit required |

## Music (Chapters 4 and 5)

Cut like the diary files: source[s, s + L + 0.015 s], L a whole number of bars, s about 20 ms before a beat; loudness
-18.5 LUFS (stereo 44.1 kHz 112 kbps, sample peaks -2.2 to -8 dBFS). Swap a runner-up in by changing only the
`'music-desk'` / `'music-city'` filename in `SAMPLE_FILES`. All four are marked "not AI-generated" on Pixabay; three are
registered with YouTube Content ID (that only matters for YouTube videos, not for this site). Pages and licence checked
2026-10-15.

| File | Used for | Source | Author | Licence |
|---|---|---|---|---|
| `music-desk.mp3` | **Live** Ch4 music (`music.play('desk')`). 100 bpm; 28 bars (67.2 s) from 14.405 s of the original (bar 7; includes its breakdown); gain -6.3 dB | "Energetic Funky Groove", https://pixabay.com/music/funk-energetic-funky-groove-138634/ (Pixabay id 138634; tags include drums, bass, electric guitar, funk, indie; no Content ID) | _Music_for_Creators_ (Pixabay) | Pixabay Content License (https://pixabay.com/service/license-summary/), no credit required |
| `music-desk-alt.mp3` | Runner-up, audition only (`/?audio-demo`, track `deskAlt`). 93 bpm; 20 bars (51.61 s) from 10.290 s; gain -9.0 dB | "Jazzy Abstract Beat_Chops", https://pixabay.com/music/beats-jazzy-abstract-beat-chops-11254/ (Pixabay id 11254, Editor's Choice) | Coma-Media (Pixabay) | Pixabay Content License, no credit required |
| `music-city.mp3` | **Live** Ch5 music (`music.play('city')`). ~105.33 bpm, C major; 40 bars (91.14 s) from 9.520 s; gain -0.1 dB | "Soft Hopeful Piano", https://pixabay.com/music/main-title-soft-hopeful-piano-164828/ (Pixabay id 164828) | PaulYudin (Pixabay) | Pixabay Content License, no credit required |
| `music-city-alt.mp3` | Runner-up, audition only (track `cityAlt`). 80 bpm; 32 bars (96.0 s) from 54.330 s; gain -6.4 dB | "Ambient Piano and Strings", https://pixabay.com/music/beautiful-plays-ambient-piano-and-strings-10711/ (Pixabay id 10711, Editor's Choice) | Good_B_Music (Zakhar Valaha) (Pixabay) | Pixabay Content License, no credit required |

Delete the two unchosen runner-up files before deploy (~2.1 MB).

## Sound effects

| File | Used for | Source | Author | Licence |
|---|---|---|---|---|
| `crowd-laugh.mp3` | Ch3 stand-up panel (`sfx.laugh`) | https://commons.wikimedia.org/wiki/File:72842_lonemonk_approx-800-laugh-1.wav (from https://freesound.org/people/lonemonk/packs/4695/) | lonemonk | **CC BY 3.0, credit required** (text above) |
| `fight-punch-1.mp3` | `sfx.punch` | Kenney "Impact Sounds" 1.0, `impactPunch_medium_000.ogg`, https://kenney.nl/assets/impact-sounds | Kenney (kenney.nl) | CC0 1.0 |
| `fight-punch-2.mp3` | `sfx.punch` | same pack, `impactPunch_medium_002.ogg` | Kenney | CC0 1.0 |
| `fight-punch-3.mp3` | `sfx.punch` | same pack, `impactPunch_medium_003.ogg` | Kenney | CC0 1.0 |
| `fight-kick.mp3` | `sfx.kick` | same pack, `impactPunch_heavy_001.ogg` | Kenney | CC0 1.0 |
| `fight-block.mp3` | `sfx.block` | same pack, `impactSoft_heavy_000.ogg` | Kenney | CC0 1.0 |
| `fight-ko.mp3` | `sfx.ko` | same pack, `impactPunch_heavy_000.ogg` + `impactSoft_heavy_001.ogg` + `impactPunch_heavy_004.ogg`, layered, short room echo | Kenney | CC0 1.0 |
| `fight-swoosh.mp3` | `sfx.swoosh()` | BigSoundBank #1797 "Whoosh #5" (wooden stick), https://bigsoundbank.com/whoosh-5-s1797.html | Joseph Sardin | CC0 1.0 |
| `fight-swoosh-big.mp3` | `sfx.swoosh(true)` | BigSoundBank #1795 "Whoosh #3" (long rope), https://bigsoundbank.com/whoosh-3-s1795.html | Joseph Sardin | CC0 1.0 |
| `crowd-ooh.mp3` | `sfx.crowdOoh` (after the K.O.) | "Ohhh ahhh", https://commons.wikimedia.org/wiki/File:Ohhh_ahhh.ogg (from pdsounds.org) | starlite | Public domain |
| `crowd-cheer.mp3` | `sfx.crowdCheer` (Ch2 stage bow) | mix of BigSoundBank #0236 + #0237 "Shouts and Applauses of Teens #1/#2" (https://bigsoundbank.com/shouts-and-applauses-of-teens-1-s0236.html, …-2-s0237.html; author DenisChardonnet) over #0021 "Applause 600 people" (https://bigsoundbank.com/applause-600-people-s0021.html; Joseph Sardin) | DenisChardonnet, Joseph Sardin | CC0 1.0 |
| `crowd-applause.mp3` | `sfx.applause` (Ch2 council, Ch3 stage page) | https://commons.wikimedia.org/wiki/File:277021_sandermotions_applause-2.wav (from https://freesound.org/people/Sandermotions/sounds/277021/) | Sandermotions | CC0 1.0 |
| `paper-page-turn-1.mp3` | `sfx.pageTurn()` | BigSoundBank #2214 "Pages that turn #7", https://bigsoundbank.com/pages-that-turn-7-s2214.html | Joseph Sardin | CC0 1.0 |
| `paper-page-turn-2.mp3` | `sfx.pageTurn()` | BigSoundBank #2213 "Pages that turn #6", https://bigsoundbank.com/pages-that-turn-6-s2213.html | Joseph Sardin | CC0 1.0 |
| `paper-flick-1.mp3` | `sfx.pageTurn(true)` (flipbook riffle) | Kenney "RPG Audio", `bookFlip3.ogg`, https://kenney.nl/assets/rpg-audio | Kenney | CC0 1.0 |
| `paper-flick-2.mp3` | `sfx.pageTurn(true)` | same pack, `bookFlip2.ogg` | Kenney | CC0 1.0 |
| `paper-flick-3.mp3` | `sfx.pageTurn(true)` | same pack, `bookFlip1.ogg` (second half) | Kenney | CC0 1.0 |
| `paper-cover-open.mp3` | `sfx.coverOpen` | BigSoundBank #0362 "Great page that turns #1", https://bigsoundbank.com/great-page-that-turns-1-s0362.html | DenisChardonnet | CC0 1.0 |
| `paper-book-drop.mp3` | `sfx.bookThud()` | "Hardcover books dropped" (3rd drop, 2.41–3.05 s), https://commons.wikimedia.org/wiki/File:Hardcover_books_dropped.ogg (from pdsounds.org) | stilgar | Public domain |
| `paper-book-close.mp3` | `sfx.bookThud(true)` | BigSoundBank #1410 "Closed book #1", https://bigsoundbank.com/closed-book-1-s1410.html | Joseph Sardin | CC0 1.0 |
| `paper-pencil-tick-1.mp3` | `sfx.pencilTick` | BigSoundBank #3233 "Pencil #2" (2.53–2.86 s), https://bigsoundbank.com/pencil-2-s3233.html | Joseph Sardin & Axeline T. | CC0 1.0 |
| `paper-pencil-tick-2.mp3` | `sfx.pencilTick` | same file (1.39–1.76 s) | Joseph Sardin & Axeline T. | CC0 1.0 |

## Sound effects (Chapters 4 and 5)

Same processing as the files above (trimmed, mono 44.1 kHz 96 kbps MP3, peak -3 dBFS). None needs credit (all CC0).
Times are seconds into the source file. Freesound files were taken from the site's public HQ preview of the CC0 sound.
Sources and licences checked on each page 2026-10-15. No Microsoft/Apple/OS system sound or jingle is used: the Ch4 boot
chime and the Ch5 SAVE chord are original procedural voices (`bootChime`, `warmChord` in `audio.ts`).

| File | Cue | Source | Author | Licence |
|---|---|---|---|---|
| `desk-crt-on.mp3` | `sfx.desk('crtOn')` | "CRT computer monitor startup", https://freesound.org/people/corkob/sounds/415594/ (power click 0.18-0.62 s, then the degauss thunk 1.86-3.40 s moved closer) | corkob | CC0 1.0 |
| `desk-boot.mp3` | `'boot'` (an original procedural chime is layered on top in code) | BigSoundBank #2654 "CD drive boot #4" (a CD drive spinning up and seeking, 0.20-1.42 s), https://bigsoundbank.com/cd-drive-boot-4-s2654.html | Joseph Sardin | CC0 1.0 |
| `desk-mail.mp3` | `'mail'` | BigSoundBank #0479 "Counter bell" (one ding), https://bigsoundbank.com/counter-bell-s0479.html | Joseph Sardin | CC0 1.0 |
| `desk-window.mp3` | `'windowOpen'` | "Mouth pop", https://freesound.org/people/jcallison/sounds/258269/ | jcallison | CC0 1.0 |
| `desk-click-1.mp3` | `'click'` | BigSoundBank #1735 "Raspberry mouse single click", https://bigsoundbank.com/raspberry-mouse-single-click-s1735.html | Joseph Sardin | CC0 1.0 |
| `desk-click-2.mp3` | `'click'` | BigSoundBank #0029 "Computer mouse" (the single click, 1.55-1.75 s), https://bigsoundbank.com/computer-mouse-s0029.html | Joseph Sardin | CC0 1.0 |
| `desk-error.mp3` | `'error'` | BigSoundBank #1926 "Boxing bell #1" (third strike, 0.50-1.95 s), https://bigsoundbank.com/boxing-bell-1-s1926.html | Joseph Sardin | CC0 1.0 |
| `desk-crt-off.mp3` | `'screenOff'` | same corkob recording as `desk-crt-on` (switch-off click and dying hum, 5.44-7.30 s) | corkob | CC0 1.0 |
| `desk-countdown.mp3` | `'countdown'` | BigSoundBank #2646 "Speaking clock beep #1" (1 kHz telephone beep), https://bigsoundbank.com/speaking-clock-beep-1-s2646.html | Joseph Sardin | CC0 1.0 |
| `desk-coin.mp3` | `'continueYes'` | "coin in jukebox slot +fall1", https://freesound.org/people/kyles/sounds/637369/ (0.44-1.80 s) | kyles | CC0 1.0 |
| `desk-install-done.mp3` | `'installDone'` | BigSoundBank #2844 "Typewriter bell" (Hermes Precisa 305), https://bigsoundbank.com/typewriter-bell-s2844.html | Joseph Sardin | CC0 1.0 |
| `desk-sale.mp3` | `'sale'` | "Cha Ching.wav" (antique cash register, 0.45-1.70 s), https://freesound.org/people/deleted_user_96253/sounds/351304/ | Freesound user 96253 (account deleted) | CC0 1.0 |
| `desk-cash-big.mp3` | `'cashBig'` | same "Cha Ching.wav" (0.45-3.45 s: ring and drawer) mixed with BigSoundBank #0194 "Coins #2" (0.05-0.85 s), https://bigsoundbank.com/coins-2-s0194.html | user 96253; Joseph Sardin | CC0 1.0 |
| `desk-message.mp3` | `'message'` | "Glass Tap.wav", https://freesound.org/people/Unicornaphobist/sounds/262958/ | Unicornaphobist | CC0 1.0 |
| `desk-nudge.mp3` | `'chatNudge'` | BigSoundBank #0023 "Mobile phone vibrator #2" (a Sagem MyX-2 buzzing on a wooden table, 0.27-1.12 s), https://bigsoundbank.com/mobile-phone-vibrator-2-s0023.html | Joseph Sardin | CC0 1.0 |
| `desk-typing-1.mp3`, `desk-typing-2.mp3` | `'typing'` | "Old Keyboard Typing 8.wav" (0.25-1.25 s and 1.90-2.90 s), https://freesound.org/people/KittyKatHunter/sounds/644842/ | KittyKatHunter | CC0 1.0 |
| `desk-vote-1/2/3.mp3` | `'vote'` | BigSoundBank #3270, #3271, #3272 "Old calculator number key #1-3" (Olivetti Logos 49), https://bigsoundbank.com/old-calculator-number-key-1-s3270.html (and ...-2-s3271.html, ...-3-s3272.html) | Joseph Sardin | CC0 1.0 |
| `desk-ad-done.mp3` | `'adDone'` | BigSoundBank #1631 "Microwave bell", https://bigsoundbank.com/microwave-bell-s1631.html | Joseph Sardin | CC0 1.0 |
| `desk-badge.mp3` | `'badge'` | "Payment Card drops on table" (one drop, 18.05-18.48 s), https://freesound.org/people/shogah/sounds/844360/ | shogah | CC0 1.0 |
| `desk-minimise.mp3` | `'minimise'` | BigSoundBank #1799 "Whoosh #6" (wooden sheet), https://bigsoundbank.com/whoosh-6-s1799.html | Joseph Sardin | CC0 1.0 |
| `crowd-applause.mp3` (existing) | `'applause'` | see the table above | Sandermotions | CC0 1.0 |
| `city-whoosh.mp3` | `sfx.city('whoosh')` | BigSoundBank #1796 "Whoosh #4" (long rope), https://bigsoundbank.com/whoosh-4-s1796.html | Joseph Sardin | CC0 1.0 |
| `city-card.mp3` | `'card'` | "Card slide", https://freesound.org/people/BapttX/sounds/843344/ | BapttX | CC0 1.0 |
| `city-save.mp3` | `'save'` | "Assorted_Buttons/Swtiches_Handheld_Devices_2005-2016" (one press and release, 4.22-4.60 s), https://freesound.org/people/SoundsofTheMachine/sounds/770410/ | SoundsofTheMachine | CC0 1.0 |
| `city-saved.mp3` | `'saved'` | BigSoundBank #2703 "Bronze bell #1" (first strike, 0.04-0.54 s), https://bigsoundbank.com/bronze-bell-1-s2703.html | Pierre Sibanarco | CC0 1.0 |
| (none) | `'chord'` | procedural (`warmChord` in `audio.ts`): the opening's Game Boy B5-E6 ding, then a C maj9 bloom | original | n/a |

Considered and rejected: "Cash Register Purchase" by Zott820 (Freesound 209578) is labelled CC0, but its description says
it contains a CC BY 4.0 sound (UncleSigmund's "coinbank"), so it is not used.

Licence pages: CC0 https://creativecommons.org/publicdomain/zero/1.0/ · Kenney licence (CC0) is in each pack's
`License.txt` · BigSoundBank (every page above says "CC0 (public domain): Free and royalty-free"; licence page
https://bigsoundbank.com/droit.html, credit optional: "Additional sounds: Joseph SARDIN - BigSoundBank.com") ·
Wikimedia Commons licence as shown on each file page.

Optional (not required) thanks: Kenney (kenney.nl), Joseph Sardin / BigSoundBank.com, the Freesound CC0 recordists
(corkob, kyles, jcallison, KittyKatHunter, Unicornaphobist, shogah, BapttX, SoundsofTheMachine), and the Pixabay
musicians Emmraan, Stockaudios, _Music_for_Creators_ and PaulYudin ("Music by ... from Pixabay").
