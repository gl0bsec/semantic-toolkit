# Design References

## Purpose

This folder contains **visual design references** that define the aesthetic direction for the entire semantic data visualization toolkit. All UI development should reference these images to maintain visual consistency across components.

## How to Use This Folder

### For Agents Developing New UIs

**BEFORE writing any HTML/CSS code:**

1. **Review all images in this folder** - Open and study each reference
2. **Extract patterns** - Note colors, typography, spacing, layout approaches
3. **Match the aesthetic** - Your UI should feel like it belongs to the same family
4. **Document inspiration** - Add code comments linking design choices to specific references

### For Adding New References

When you find inspiring design examples that align with the toolkit's aesthetic:

1. **Save the image here** with a descriptive filename
   - Good: `reference-minimalist-timeline-2024.png`
   - Bad: `image1.png` or `screenshot.png`

2. **Update this README** with:
   - Filename
   - Source (URL or description)
   - Key design principles it demonstrates
   - How it relates to existing references

3. **Consider organizing** if references grow beyond ~10 images:
   ```
   /design-references/
   ├── layouts/          # Grid systems, panel arrangements
   ├── typography/       # Font treatments, hierarchies
   ├── color-schemes/    # Palette inspirations
   ├── interactions/     # Hover states, transitions
   └── data-viz/         # Chart styles, encodings
   ```

## Current References

### Original Three References (Project Foundation)

**File**: `reference-1-minimalist-cube.png` (or similar)
- **Source**: User-provided at project start
- **Principles**: Reductive clarity, ultra-clean 3D forms, no decoration
- **Applied**: No UI chrome, minimal borders, pure geometric forms

**File**: `reference-2-network-viz.png` (or similar)
- **Source**: User-provided at project start
- **Principles**: Information density, blue on black, tight spacing
- **Applied**: Small points, scrollable panels, compact layouts

**File**: `reference-3-scientific-grid.png` (or similar)
- **Source**: User-provided at project start
- **Principles**: Systematic organization, multi-panel dashboards, visual hierarchy
- **Applied**: Fixed quadrant layout, consistent borders, aligned elements

**NOTE**: If the original image files are available, they should be copied into this folder for future reference.

## Design Language Summary

Based on the current references, the toolkit follows these principles:

### Color
- **Background**: Pure black (#000) or very dark gray
- **Text**: White (#fff) for primary, grays (#666, #888) for secondary
- **Accents**: Blue (#4a90e2) for interactive elements, saturated colors for data
- **Borders**: Dark gray (#333), always 1px solid

### Typography
- **Font**: Monospace (Courier New or similar)
- **Sizes**: 8px, 9px, 10px, 11px (compact progression)
- **Weights**: Bold for data values, normal for labels

### Layout
- **Structure**: Fixed positioning, grid-aligned
- **Spacing**: Minimal padding (8px, 10px, 12px)
- **Borders**: 1px solid, no rounded corners
- **Density**: High information density, no wasted space

### Interaction
- **Feedback**: Immediate, no animation delays
- **States**: Subtle color shifts (black → very dark gray → dark gray)
- **Cursors**: Pointer for interactive, default elsewhere
- **Direct manipulation**: Click, drag, scroll (no menus)

### Aesthetic
- **Style**: Brutalist minimalist
- **Philosophy**: Show data, remove decoration, function over form
- **Inspiration**: Swiss design, scientific software, data visualization pioneers

## Anti-Patterns to Avoid

**Don't do this:**
- ❌ Rounded corners or soft shadows
- ❌ Gradient backgrounds
- ❌ Animated transitions or loading spinners (except initial load)
- ❌ Icon-only buttons (use text labels)
- ❌ Light themes (unless for temporary highlights)
- ❌ Decorative elements that don't encode data
- ❌ Large whitespace or sparse layouts
- ❌ Sans-serif body fonts (use monospace)

**Do this instead:**
- ✅ 90° angles, hard edges
- ✅ Flat solid colors
- ✅ Instant feedback, no delays
- ✅ Text labels or text + simple shapes
- ✅ Dark theme as default
- ✅ Every pixel serves data display
- ✅ Compact, information-dense layouts
- ✅ Monospace typography throughout

## Contribution Guidelines

If you're adding a new reference:

1. **Check relevance**: Does it align with existing aesthetic?
2. **Name descriptively**: `reference-{category}-{detail}-{year}.{ext}`
3. **Document thoroughly**: Update this README with analysis
4. **Consider licensing**: Ensure you can legally use/store the image
5. **Optimize file size**: Compress images, prefer PNG or JPG

If references accumulate and this folder becomes cluttered, organize into subdirectories by category (see structure suggestion above).

---

**Last Updated**: 2024-02-03
**Contact**: See main project documentation (claude.md)
