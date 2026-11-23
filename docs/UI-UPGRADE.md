# v1.1 — UI/UX upgrade

## Design system
* `src/constants/palette.ts` — pure colour tokens (`LIGHT`, `DARK`); `theme.ts` — spacing, radii, type, `ROW` (RTL helper).
* `src/hooks/useTheme.ts` — `const { c, dark, g } = useTheme()`; mode (روشن / گہرا / فون کے مطابق) is the persisted setting `themeMode`. No component imports a static colour object any more.
* `src/components/design-system/` — `UText`, `Button`, `Card`, `GradientCard`, `Chip`, `Segmented`, `Slider` (dependency-free), `SearchBar`, `Field`, `Sheet`, `Skeleton`, `Empty`, `OverlayHost` (toast + confirm dialog).
* Contrast of every text/background token pair is asserted in `tests/color.test.ts` (WCAG AA).

## Navigation
Bottom bar: ہوم · تحریریں · تخلیق · پسندیدہ · مزید (`src/app/(tabs)`). Voice is the stack route `/voice`; settings live in the "مزید" tab.

## Library
One virtualised list (`features/library/LibraryView.tsx`) powers Library, Favorites, global Search (recent searches), collection detail and the card picker: poetry/prose tabs, category chips, 4 sorts, grid/list, multi-select (favourite / add to collection / share / delete).

## Collections (DB migration v2)
Tables `collections`, `collection_items` (cascade), `card_designs`. Backups include collections (optional fields; v1 backups still restore).

## Card / post editor (`src/app/card/[id].tsx`, `src/features/card/`)
* **Single source of truth**: `CardDesign` lives in a vanilla zustand store (`store.ts`); tools write to it, and preview, template thumbnails and export render the same `CardCanvas`.
* **Persistent preview**: never unmounted; the bottom panel only changes height (collapsed / half / full) and the preview re-fits. On ≥ 720 dp the tools move to a side panel. Tap an element of the card to jump to its tool.
* **Undo/redo** with key-based coalescing (a slider drag = one step); reset is undoable; leaving with unsaved changes asks first.
* **Art** (`art.ts`) is pure, unit-tested geometry drawn with `react-native-svg`; template thumbnails are live renders.
* **Export**: off-screen unscaled canvas captured at 1080 px wide (`react-native-view-shot`) → share or save to gallery (`expo-media-library`).
* Extra fonts (Noto Nastaliq Urdu, Noto Naskh Arabic, Amiri) load lazily when the editor opens.

## Testing
Automated: `npm test` + `npx tsc --noEmit` (colour/contrast, slider maths, recents, theme, card templates/store/undo/persistence/art, collections, card designs, backup round-trip incl. old backups).
Manual on an Android **development build** (not Expo Go): both themes, small phone + tablet, card editor with keyboard open, all 4 fonts, image import, PNG/JPG share and gallery save at each ratio, voice studio (permissions, pause/resume, both engines), back-guard.
