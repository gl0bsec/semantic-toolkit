# UI Design System

Brutalist, data-dense, no ornamentation. Every new UI surface should be consistent with this document.

---

## Aesthetic Principles

- **Brutalist minimalism**: raw grid, 1px borders, no shadows, no rounding, no gradients
- **Monospace throughout**: Courier New is the only font
- **Data-first**: chrome exists to serve data; nothing decorative
- **Two themes**: dark (3D viewer) and light (dashboard, home, index pages)
- **All CSS inline**: no external stylesheets, no CSS files — `<style>` blocks only

---

## Typography

| Use | Size | Weight | Notes |
|-----|------|--------|-------|
| Page title / dataset name | 11px | bold | `letter-spacing: 0.5px` |
| Header text / controls | 11px | normal | |
| Body / content | 10px | normal | |
| Meta / secondary | 9px | normal | |
| Table headers | 9–10px | bold | |

**Rule**: `font-family: 'Courier New', monospace` everywhere, no exceptions.

---

## Color Tokens

### Dark Theme (viewer)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000` | Page, canvas |
| Surface | `#0a0a0a` | Hover |
| Surface 2 | `#1a1a1a` | Selected, summary overlay |
| Border | `#333` | All borders |
| Text primary | `#fff` | |
| Text secondary | `#aaa` | |
| Text muted | `#888`, `#666` | Meta, labels |
| Link | `#4a90e2` | Inline links, numeric accents |
| Link hover | `#74b9ff` | |
| Highlight text | `#fff` bg / `#000` text | Active selection |

### Light Theme (dashboard, home, index)

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#fff` | Page |
| Surface | `#fafafa` | Hover |
| Surface 2 | `#f0f0f0` | Selected, sticky table headers |
| Surface 3 | `#f5f5f5` | Table header `th` |
| Border strong | `#aaa` | Header bottom border |
| Border normal | `#ccc` | Grid gaps, table borders |
| Border light | `#eee` | Row separators |
| Text primary | `#000` | |
| Text secondary | `#444` | |
| Text muted | `#666`, `#999` | Meta, labels |

### Cluster & Type Colors

Defined in `toolkit/analysis/data-views/lib/colors.js`.

```js
CLUSTER_COLORS   // 38-entry array; index = cluster ID
OUTLIER_COLOR    // '#ffff00' — yellow
typeColors       // { SEC, GOV, MIL, ECO, SOC, DIP, ENV, TEC, CUL, SPO, INFO }
```

Selected type color values:

| Type | Color |
|------|-------|
| SEC | `#ff6b6b` (red) |
| GOV | `#4ecdc4` (teal) |
| MIL | `#e17055` (orange-red) |
| ECO | `#fdcb6e` (yellow-orange) |
| SOC | `#a29bfe` (purple) |
| DIP | `#00cec9` (cyan) |
| ENV | `#96ceb4` (sage) |
| TEC | `#74b9ff` (sky blue) |
| CUL | `#fd79a8` (pink) |
| SPO | `#55efc4` (mint) |
| INFO | `#ffeb3b` (bright yellow) |

Cluster color swatches are `8×8px` inline-block squares (`display: inline-block; width: 8px; height: 8px`).

---

## Spacing

Base unit: **4px**. Use multiples: `4 / 8 / 12 / 16 / 20`.

| Context | Value |
|---------|-------|
| Header padding | `0 12px` (or `8px 12px` for viewer) |
| Section / card padding | `12px` |
| Row padding (tables, feed) | `8px` |
| Tight meta padding | `4px` |
| Header controls gap | `20px` |
| Header info group gap | `16px` |
| Grid gap (dashboard) | `1px` |

---

## Layout

### Fixed Header (all pages)

```css
#header {
    position: fixed; top: 0; left: 0; right: 0;
    height: 33px;
    padding: 0 12px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid #aaa; /* or #333 dark */
    z-index: 100;
}
```

Viewer header uses `padding: 8px 12px` (no fixed height — content determines height at ~33px).

### 12-Column Grid (dashboard)

```css
#grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1px;
    background: #ccc; /* gap color */
}

.grid-item { background: #fff; display: flex; flex-direction: column; overflow: hidden; }
.span-6   { grid-column: span 6; }
.span-12  { grid-column: span 12; }
.height-2 { height: 520px; }
.height-3 { height: 460px; }
```

### Fixed-Position Viewer Layout

```
Header:          fixed, top:0, left:0, right:0, ~33px
Canvas:          fixed, top:33px, left:0, right:300px, bottom:80px
Sidebar:         fixed, top:33px, right:0, width:300px, bottom:0
Timeline:        fixed, bottom:0, left:0, right:300px, height:80px
Summary table:   fixed, bottom:80px, right:300px (overlaid on canvas)
```

---

## Navigation Slug

All pages display a breadcrumb slug in the header:

```
⌂ / DATASET_NAME / VIEW_NAME
```

- `⌂` links to `/home/home.html`
- `DATASET_NAME` links to `/{dataset}/index.html`
- `VIEW_NAME` is plain text (e.g. `3D SEMANTIC SPACE`, `ANALYSIS DASHBOARD`)

---

## Components

### Item / Feed Row

Two variants — dark (sidebar) and light (data feed) — share the same structure:

```
┌─────────────────────────────────┐
│ TITLE (bold, 10px)              │
│ date · source (9px, muted)      │
│ [CLUSTER TAG]                   │
└─────────────────────────────────┘
```

- Border: `1px solid #eee` (or `#1a1a1a` dark) on bottom only
- Padding: `12px`
- Hover: background `#fafafa` / `#0a0a0a`, `transition: background 0.1s`
- Selected: background `#f0f0f0` / `#1a1a1a`
- Cluster tag: `padding: 2px 8px; font-size: 9px; font-weight: bold`
  - Light: `background: #f0f0f0; border: 1px solid #ccc`
  - Dark: colored background from `CLUSTER_COLORS`, `border-radius: 2px`

### Data Table

```css
.data-table { width: 100%; border-collapse: collapse; font-size: 9px; }
.data-table th { padding: 8px; background: #f5f5f5; border-bottom: 1px solid #ccc;
                 font-weight: bold; position: sticky; top: 0; z-index: 1; }
.data-table td { padding: 8px; border-bottom: 1px solid #eee; }
.data-table tr:hover { background: #fafafa; cursor: pointer; }
.data-table tr.selected { background: #f0f0f0; font-weight: bold; }
.data-table .numeric { text-align: right; font-weight: bold; }
```

### Tooltip

White box, appears on hover over canvas points (dark theme):

```css
#tooltip {
    position: fixed;
    background: rgba(255,255,255,0.98);
    border: 1px solid #ddd;
    padding: 8px 12px;
    font-size: 10px; line-height: 1.4;
    pointer-events: none; display: none;
    z-index: 1000; max-width: 300px;
}
/* .tooltip-title: bold; .tooltip-meta: #666, 9px */
```

### Summary / Overlay Table (dark)

Floating panel anchored to canvas edge:

```css
background: rgba(0,0,0,0.95);
border-top: 1px solid #333; border-left: 1px solid #333;
padding: 12px; font-size: 9px; min-width: 180px;
```

Numeric cells: right-aligned, bold, `color: #4a90e2`. Row text: `#aaa`. First column: `#fff`.

---

## Scrollbars

**Dark:**
```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #000; }
::-webkit-scrollbar-thumb { background: #333; }
```

**Light:**
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #f0f0f0; }
::-webkit-scrollbar-thumb { background: #ccc; border-radius: 0; }
::-webkit-scrollbar-thumb:hover { background: #999; }
```

---

## Z-Index Stack

| Layer | Value |
|-------|-------|
| Tooltip | 1000 |
| Header | 100 |
| Summary overlay | 50 |
| Sticky table headers | 10 |
| Sticky backgrounds | 1 |

---

## Links

- `color: inherit; text-decoration: none`
- Hover: `text-decoration: underline`
- No color change on hover for nav/slug links
- Exception: sidebar item links use `color: #4a90e2` (dark theme)

---

## Interactions

- Hover feedback: background color swap, `transition: background 0.1s`
- Selection: persistent background highlight, no outline or border change
- No animations beyond the 0.1s bg transition
- Cursor: `pointer` on clickable rows and items
