# Data Feed Feature

## Overview

Added a **scrollable data feed** to the analysis dashboard displaying all dataset entries in reverse chronological order (newest first). The feed mirrors the sidebar structure from the 3D viewer but adapted for the light theme.

## Feature Details

### Display Format
Each feed item shows:
- **Title**: Bold, 10px font
- **Metadata line**: Date | Type | Locations
- **Cluster badge**: Light gray background with border

### Layout
- **Grid position**: span-6 (half width), height-3 (400px minimum)
- **Position**: Below timeline, right side (next to location table)
- **Scrollable**: Vertical scroll for all entries
- **Light theme**: Black text on white background

### Data Source
Uses the same data loaded for timeline and location table:
- **Fields**: title, dateStr, type, locations, cluster
- **Sorting**: Reverse chronological (newest → oldest)
- **Filtering**: Shows all entries from June 2025 onward

## Visual Design

### Feed Item Structure
```
┌──────────────────────────────────────────┐
│ Title of the event (bold, 10px)         │
│ Date: 11/29/2025 | Type: SEC |          │
│ Locations: South Africa, Egypt          │
│ ┌──────────────┐                        │
│ │ Cluster 19   │                        │
│ └──────────────┘                        │
├──────────────────────────────────────────┤
│ Next item...                             │
```

### Styling Details
- **Hover effect**: Light gray background (`#fafafa`)
- **Border**: Light gray bottom border per item (`#eee`)
- **Padding**: 10px vertical, 0px horizontal
- **Cursor**: Pointer (indicates clickability)
- **Transition**: Smooth 0.1s background change

### Cluster Badge
- **Background**: `#f0f0f0` (very light gray)
- **Border**: 1px solid `#ccc`
- **Padding**: 2px 6px
- **Font**: 9px, bold, black text
- **Display**: Inline-block with margin-top

### Metadata Line
- **Font size**: 9px
- **Color**: `#666` (medium gray)
- **Format**: `Date: XX | Type: XX | Locations: XX`
- **Locations**: Converted from FIPS codes to names

## Technical Implementation

### Render Function
```javascript
function renderDataFeed() {
  // Sort by date descending
  const sortedData = [...data].sort((a, b) => b.date - a.date)

  // Map to HTML
  feed.innerHTML = sortedData.map(item => {
    const locationNames = item.locations
      .map(loc => countryLookup[loc] || loc)
      .join(', ')

    return `<div class="feed-item">...</div>`
  }).join('')
}
```

### Location Resolution
- FIPS codes → Country names via `countryLookup`
- Multiple locations joined with commas
- Unknown codes displayed as-is
- Empty locations show "N/A"

### Integration Points
- Called after `loadData()` completes
- Uses same data array as other visualizations
- Respects `config.startDate` filter
- Future: Can add cross-filtering with other views

## Comparison with 3D Viewer Sidebar

| Aspect | 3D Viewer (Dark Theme) | Analysis Dashboard (Light Theme) |
|--------|------------------------|-----------------------------------|
| Background | Black (`#000`) | White (`#fff`) |
| Text color | White (`#fff`) | Black (`#000`) |
| Hover | Very dark gray (`#0a0a0a`) | Very light gray (`#fafafa`) |
| Borders | Dark gray (`#1a1a1a`) | Light gray (`#eee`) |
| Cluster badge | Colored background | Light gray with border |
| URL links | Included | Not included (future) |
| Click behavior | Highlights entry for 30s | None yet (future) |
| Scroll position | Fixed right sidebar | Grid item (flexible) |

## Future Enhancements

### Planned Features
1. **URL links**: Add clickable source URLs like 3D viewer
2. **Click to filter**: Click feed item → filter timeline/locations
3. **Search**: Text search across titles
4. **Type filter**: Show only specific event types
5. **Cluster filter**: Show only specific clusters
6. **Highlight**: Flash white background on click (like 3D viewer)
7. **Cross-filtering**: Sync with timeline and location table selections

### Interaction Ideas
- **Hover**: Preview more details in tooltip
- **Click**: Highlight and scroll other views to related data
- **Shift+click**: Multi-select for batch filtering
- **Right-click**: Context menu (copy, open URL, filter by type/cluster)

## Usage

```bash
# Open dashboard
http://localhost:8000/analysis-dashboard.html

# Feed appears on right side, below timeline
# Scroll to browse all entries
# Newest entries appear first
# Click items (future: will trigger filtering)
```

## Data Flow

```
CSV Data
  ↓
Parse & filter by startDate
  ↓
Store in data array with date objects
  ↓
Sort by date descending
  ↓
Map to HTML with location name resolution
  ↓
Render feed items
```

## Performance

### Optimization Considerations
- **Rendering**: O(n) where n = number of entries
- **Sorting**: O(n log n) one-time cost
- **Location lookup**: O(1) per location (hash map)
- **DOM updates**: Full innerHTML replacement (fast for ~10k entries)

### Performance Limits
- **Current dataset**: ~8,000 entries from June 2025
- **Render time**: < 100ms for full feed
- **Scroll performance**: Native browser optimization
- **Memory**: Minimal (entries already in memory)

### Future Optimization
If dataset grows significantly (>50k entries):
- Implement virtual scrolling (render only visible items)
- Lazy load entries as user scrolls
- Add pagination (show 100 at a time)
- Use DocumentFragment for faster DOM updates

## Design Consistency

**Matches analysis dashboard aesthetic:**
- ✅ Light theme (black on white)
- ✅ Courier New monospace font
- ✅ Minimal styling (no decorative elements)
- ✅ Grid-based layout (span-6, height-3)
- ✅ Consistent borders (1px solid #eee)
- ✅ Same font sizes (9px, 10px)
- ✅ Hover effects (subtle gray)

**Mirrors 3D viewer sidebar structure:**
- ✅ Title + metadata + cluster badge layout
- ✅ Same information hierarchy
- ✅ Same font sizes and weights
- ✅ Same line spacing and padding
- ✅ Reverse chronological ordering

## Files Modified

- `analysis-dashboard.html`:
  - Added feed HTML container (span-6, height-3)
  - Added feed item CSS styles (light theme)
  - Added `renderDataFeed()` function
  - Added feed render call in `loadData()`

## Testing Checklist

- [x] Feed loads with data
- [x] Items sorted by date (newest first)
- [x] Titles display correctly
- [x] Dates format as MM/DD/YYYY
- [x] Types display correctly
- [x] Locations resolve to country names
- [x] Cluster badges show correct numbers
- [x] Hover effects work
- [x] Scrolling works smoothly
- [x] No console errors
- [x] Light theme styling consistent
- [x] Grid layout correct (50% width)

## Example Feed Entry

```html
<div class="feed-item" data-index="0">
  <div class="feed-item-title">
    Zuma's daughter resigns amid claims South Africans were lured into Ukraine War
  </div>
  <div class="feed-item-meta">
    <strong>Date:</strong> 11/29/2025 |
    <strong>Type:</strong> SEC |
    <strong>Locations:</strong> South Africa
  </div>
  <div class="feed-item-cluster">Cluster 19</div>
</div>
```

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile**: May need touch optimizations
