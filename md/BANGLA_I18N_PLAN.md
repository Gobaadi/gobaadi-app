# Bangla + English i18n Plan

Full-app language switching for Expo app. Scope: **English + Bangla only**.

---

## 1. Current State


| Finding                                                                | Location                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------- |
| Language options exist (`en`, `bn`, `hi`, `ur`)                        | `src/constants/languages.ts:7-12`                         |
| Selection saves ID to SecureStore only                                 | `src/hooks/use-language.ts:27`, `src/constants/api.ts:72` |
| **No translation layer** — UI text hardcoded English                   | all 97 screens + 24 components                            |
| Language badge only consumer (`EN`/`BE`)                               | `index.tsx:155`, `animals.tsx:167`, `doctors.tsx:269`     |
| No i18n dependency installed                                           | `package.json`                                            |
| Per-screen state, no Context → no live update                          | `use-language.ts:7`                                       |
| Bug: `getLanguageCode` derives from name → Bengali = `"BE"` not `"BN"` | `src/constants/languages.ts:17`                           |
| Dead Save button (no `onPress`)                                        | `src/app/select-language.tsx:70`                          |
| Dead "Voice Selection Mode" row                                        | `src/app/select-language.tsx:62`                          |


**Why options "don't work":** selecting a language changes nothing visible — only the badge string. No strings are translated anywhere.

---

## 2. Decision

**Stack: `i18next` + `react-i18next` + `expo-localization`**

Why chosen over alternatives:

- 4-language future-proof (only 2 shipped now, adding more = JSON file only)
- Pluralization + interpolation built-in (Bangla plurals differ from English)
- Lazy-load locale JSON per language
- Device locale auto-detection for first-launch default
- Industry standard — no custom maintenance burden

Rejected: custom hook (reimplements i18next), Lingui/FormatJS (toolchain friction with Expo), backend strings (latency + offline breakage), inline ternaries (unscalable debt).

**Scope cuts:**

- `hi` / `ur` entries removed from `LANGUAGES`
- No RTL work (Bangla is left-to-right)
- No backend changes (SecureStore persistence already works)

---

## 3. Deliverables

### 3.1 Install

```
npx expo install expo-localization
npm install i18next react-i18next
```

(`expo-localization` version-locked by `npx expo install`.)

### 3.2 New files


| File                                 | Purpose                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| `src/i18n/index.ts`                  | i18next init — resources `{en, bn}`, `fallbackLng: 'en'`    |
| `src/i18n/locales/en.json`           | English strings (grows during extraction)                   |
| `src/i18n/locales/bn.json`           | Bangla translations                                         |
| `src/providers/LanguageProvider.tsx` | Context — language state, i18next sync, `t()` exposure      |
| `src/hooks/use-translation.ts`       | Thin wrapper over `useTranslation` + existing `useLanguage` |


### 3.3 New asset


| Asset                                      | Purpose                     |
| ------------------------------------------ | --------------------------- |
| `assets/fonts/GoogleSans-Regular.ttf`      | Primary — English body      |
| `assets/fonts/GoogleSans-Medium.ttf`       | Primary — medium weights    |
| `assets/fonts/GoogleSans-Bold.ttf`         | Primary — bold weights      |
| `assets/fonts/NotoSansBengali-Regular.ttf` | **Backup — Bangla body**    |
| `assets/fonts/NotoSansBengali-Medium.ttf`  | **Backup — medium weights** |
| `assets/fonts/NotoSansBengali-Bold.ttf`    | **Backup — bold weights**   |


**Font plan — Google Sans primary, Noto Sans Bengali backup:**

- Google Fonts 2025 release lists **Bengali** subset — primary viable
- Download Google Sans from `fonts.google.com/specimen/Google+Sans` → "Download family" (zip with static TTFs)
- Download backup from `fonts.google.com/specimen/Noto+Sans+Bengali` → "Download family" (TTF, 695 glyphs, 100% Bengali coverage, OFL license)
- **Do NOT use `@fontsource/google-sans`** — npm package serves `woff2` only, React Native needs `.ttf`
- **Both families always registered** in `useFonts` — backup ships with the app, not added later
- Verify Google Sans TTF contains Bengali glyphs before relying on it (open in Font Book / glyphs app, check `ক আ গ`)
- **Switch logic (single point, `use-translation.ts`):**

```
language === 'bn' → fontFamily 'NotoSansBengali'  (safe path, guaranteed shaping)
language === 'en' → fontFamily 'GoogleSans'
```

- Optional experiment after pilot: try Google Sans as primary for `bn` too (it has the subset). Pass §6 glyph checklist on real devices → keep. Fail → stay on Noto. Backup guarantees no broken Bangla either way.
- React Native has **no CSS-style font fallback stacks** — backup only works as an explicitly registered family swapped per language. That's why registration of both is mandatory in Phase 1.5, not conditional.

### 3.4 Modified files


| File                          | Change                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/app/_layout.tsx`         | Wrap app in `LanguageProvider`; `useFonts` load **both** Google Sans + Noto Sans Bengali before render |
| `src/hooks/use-language.ts`   | Lift state into Context; `setLanguage` also calls `i18n.changeLanguage(lang)`                          |
| `src/constants/languages.ts`  | Trim `LANGUAGES` to `[{en}, {bn}]`; fix `getLanguageCode` — map id explicitly (`bn → BN`)              |
| `src/app/select-language.tsx` | Wire dead Save button (`:70`) or remove it (tap already saves); wire or drop dead voice row (`:62`)    |


### 3.5 Not needed

- Backend / API changes
- New screens (language pickers already exist: `select-language.tsx`, `LanguageBottomSheet.tsx`)
- `hi.json` / `ur.json`

---

## 4. Phases

### Phase 1 — Infrastructure (1–2 h)

1. Install 3 deps
2. Create `src/i18n/index.ts`, empty `en.json` / `bn.json`
3. Create `LanguageProvider` + `use-translation.ts`
4. Wire provider + `useFonts` into `_layout.tsx`
5. Hook `use-language.ts` → `i18n.changeLanguage`
6. Fix `getLanguageCode`, trim `LANGUAGES`
7. Fix dead buttons in `select-language.tsx`

**Exit criteria:** app runs, toggling language emits i18n language-change event, badge shows `BN`.

### Phase 1.5 — Font (0.5–1 h, parallel)

1. Download Google Sans zip → extract static TTFs (400/500/700)
2. Download Noto Sans Bengali zip → extract static TTFs (400/500/700) — **backup, mandatory**
3. **Verify Google Sans Bengali glyphs present** (see test list §6)
4. Place both families in `assets/fonts/`, register both via `useFonts`
5. Wire per-language switch in `use-translation.ts` (`bn → NotoSansBengali`, `en → GoogleSans`)
6. Run glyph test list on `bn` — optional: test Google Sans on `bn`, keep only if fully passes

**Exit criteria:** Bangla string renders via Noto Sans Bengali backup with conjuncts intact, no tofu, no clipping. Both families load, switch works.

### Phase 2 — Pilot screens (2–4 h)

Migrate 3–5 highest-traffic screens end-to-end:

1. `src/app/(tabs)/index.tsx` (home)
2. `src/app/login.tsx` / `signup.tsx` (auth)
3. `src/app/(tabs)/profile.tsx`
4. `src/app/select-language.tsx` + `src/components/LanguageBottomSheet.tsx`

Pattern: extract hardcoded strings → `t('key')` → fill `en.json` + `bn.json` in parallel.

**Exit criteria:** full language switch visible on pilot screens, persists across app restart.

### Phase 3 — Bulk migration (20–35 h)

Remaining ~90 screens + ~20 components. Order by user traffic:

```
tabs (home, animals, doctors, messages, profile)
  → animal flows (add-animal, my-animal-detail, ...)
  → doctor/booking flows
  → settings/utility screens
  → edge/error states
```

Rules per screen: whole-sentence keys (never word-by-word concat), `en.json`/`bn.json` updated in same commit, screen passes §6 checklist before moving on.

**Estimated:** 15–20 strings/hour manual; 10–20 h with AI extraction + human review. ~1 week part-time / 2–4 days focused.

---

## 5. String Safety Rules (Bangla correctness)

Bangla breaks easily under naive string handling. Enforce during Phase 2–3:

1. **Never split by code unit** — no `.split('')`, `.slice(0, n)`, `str[i]`, `.length` truncation on translated strings. Use `Array.from()` / `Intl.Segmenter` when character handling is unavoidable.
2. **No manual sentence concat** — Bangla is SOV (object before verb), English word order differs. One key per sentence, i18next interpolation for params only: `t('count.cows', { n: 5 })`.
3. `**flexShrink: 1` on every `<Text>` inside a row layout** — otherwise two Bangla words side-by-side clip instead of wrapping.
4. **Line height ≥ fontSize × 1.4 for Bangla** — matras above (`ৈ ী`) and descenders (`য় ু`) get chopped by tight `lineHeight`.
5. **Prefer wrap over truncate** — `numberOfLines` ellipsis can land mid-conjunct. If truncation required, test worst-case long word.
6. **Font must carry full Bengali OpenType shaping** — conjuncts (`ক্ষ`, `জ্ঞ`, `ত্র`, রেফ, হসন্ত) compose via GSUB ligatures in the font. Platform shaping (iOS CoreText / Android HarfBuzz) handles it; the font is the only variable.

---

## 6. Test Checklist (run per migrated screen, full pass before ship)

**Glyph rendering**

- [ ] No tofu boxes `□` anywhere
- [ ] Conjuncts intact: `ক্ষী`, `জ্ঞান`, `মর্ত্য`, `ব্যবহার`, `সংযুক্ত`
- [ ] Matras not clipped: `ৈ ী ু ূ ঋ` above/below baseline
- [ ] Ref + hasant forms correct: `র্ক`, `ক্ত`, `ন্ত্র`

**Layout**

- [ ] Two Bangla words in a row wrap, not clip (flexShrink)
- [ ] Mixed `১২৩` + `456` + `৳` render inline
- [ ] Bold is real bold on Android (not synthetic)
- [ ] Long word: `আইনগতভাবে অনুমোদিত` — wraps/truncates cleanly

**Behavior**

- [ ] Language switch updates all mounted screens live (Context works)
- [ ] Font switch works: `bn` renders Noto Sans Bengali, `en` renders Google Sans (no missing-family warning)
- [ ] Choice persists across app restart (SecureStore)
- [ ] Badge shows `EN` / `BN` (not `BE`)
- [ ] Device locale `bn` → first launch defaults to Bangla
- [ ] English fallback: missing `bn` key falls back to `en`, no crash

---

## 7. Risks


| Risk                                          | Impact                   | Mitigation                                                                                                                             |
| --------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Google Sans Bengali glyphs/shaping incomplete | Tofu or broken conjuncts | **None — Noto Sans Bengali backup always ships + registered; `bn` defaults to it. Google Sans optional upgrade only after passing §6** |
| Android `fontWeight` ignored for custom fonts | Bold renders fake        | Test in Phase 1.5; register per-weight families if needed                                                                              |
| Bulk migration misses strings                 | Mixed-language screens   | `grep` audit pass at end of Phase 3 for leftover literals                                                                              |
| 97 screens = scope creep                      | Long tail stalls         | Ship Phase 1+2 first; screens migrate incrementally, English fallback covers unmigrated ones                                           |


---

## 8. Summary

```
Deps:        3 (i18next, react-i18next, expo-localization)
New files:   5 (i18n init, 2 JSON, provider, hook)
New assets:  6 TTF (Google Sans 400/500/700 primary
             + Noto Sans Bengali 400/500/700 backup)
             bn → NotoSansBengali, en → GoogleSans (switch in use-translation.ts)
Edits:       4 files (layout, use-language, languages, select-language)
Bulk work:   97 screens + 24 components → t() keys + en/bn JSON

Time: infra + font + pilot = ~half day
      full migration = 2–4 days focused / ~1 week part-time
```

