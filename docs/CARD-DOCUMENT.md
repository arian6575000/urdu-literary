# Card document (v2) — foundation for Advanced Studio

`CardDesign` is one serialisable object shared by Easy Mode, the preview, thumbnails, export and persistence.

- **Base layer** — the original single-text fields (`text`, `title`, `poet`, font, colours, frame, pattern, image...). Easy Mode edits only these.
- **`elements: DesignElement[]`** — extra independent objects drawn above the base layer (`src/features/card/elements.ts`).
  Kinds: `text`, `shape`, `line`, `svg` (vector ornament/sticker, recolourable), `image`, `unknown`.
- **Z-order = array order** (first = bottom). The layers panel and the canvas therefore always agree.
- **Common properties**: `id`, `name`, `x`, `y`, `w`, `h` (design px, canvas is 360 wide), `rotation`, `opacity`, `visible`, `locked`, `groupId`, `meta`.
- **Locked** elements ignore every edit except `locked` / `visible` / `name` and cannot be deleted.
- **Migration**: `sanitizeDesign` loads v1 saves (no `elements`) as v2 with `elements: []`; every field is validated/clamped.
- **No silent loss**: an element of an unknown kind (written by a newer app) is kept verbatim as `kind: 'unknown'`, never rendered, and re-saved unchanged.
- **Easy Mode safety**: `applyTemplate`, `resetDesign` and every Easy Mode update keep `elements` untouched.
- **History**: every element edit goes through the same undo stack as the base layer; edits with the same `key` inside 1.5 s coalesce (a drag = one step).
- **Rendering**: `ElementLayer.tsx` is used by `CardCanvas`, so preview, template thumbnails and exported PNG/JPG match.
