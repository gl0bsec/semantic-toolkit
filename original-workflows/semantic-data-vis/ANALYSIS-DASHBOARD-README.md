# Analysis Dashboard Framework

## Quick Start

```bash
# Start the server
python3 server.py

# Open the dashboard
open http://localhost:8000/analysis-dashboard.html
```

## What Is This?

A **modular grid-based framework** for displaying multiple data visualizations and statistical analyses side-by-side. Complements the 3D viewer with a light theme optimized for quantitative analysis.

## Current Features

- **Temporal Distribution Timeline**: Weekly bar chart showing event counts from June 2025 onward
- **Dynamic Grid System**: 12-column responsive layout for flexible visualization arrangement
- **Light Theme**: White background with black text for better readability in well-lit environments
- **Same Aesthetics**: Matches 3D viewer design language (Courier New, minimalist, brutalist)

## Design Principles

### Light Theme Rationale
- Better for extended reading of text and tables
- Easier on eyes in well-lit office environments
- Standard for print/export formats
- Complements the dark-themed 3D viewer

### Grid System
Visualizations are placed in a 12-column CSS grid:
- `.span-3` = 1/4 width (3 columns)
- `.span-6` = 1/2 width (6 columns)
- `.span-12` = Full width (12 columns)

Heights controlled by classes:
- `.height-1` = 200px minimum
- `.height-2` = 300px minimum
- `.height-3` = 400px minimum

## Adding New Visualizations

```html
<!-- 1. Add container to grid -->
<div class="grid-item span-6 height-2" id="my-viz">
  <div class="grid-item-header">MY VISUALIZATION TITLE</div>
  <div class="grid-item-content">
    <canvas id="my-canvas"></canvas>
  </div>
</div>
```

```javascript
// 2. Create render function
function renderMyVisualization() {
  const canvas = document.getElementById('my-canvas')
  const container = canvas.parentElement
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight

  const ctx = canvas.getContext('2d')
  // Your rendering logic here
}

// 3. Call after data loads
renderMyVisualization()
```

## Planned Features

- **Type Distribution**: Bar chart showing event type counts
- **Cluster Distribution**: Visualization of cluster membership
- **Summary Statistics Table**: Mean, median, std dev for numeric columns
- **Keyword Frequency**: Top N keywords from text fields
- **Cross-Filtering**: Click any visualization to filter all other views
- **Export**: Save visualizations as PNG/SVG, data as CSV

## Configuration

Uses the same `config.json` as the 3D viewer:

```json
{
  "dataSource": "RU_AFR_EXPERIMENT._3d.csv",
  "startDate": "2025-06-01"
}
```

## Design Consistency

**Shared with 3D Viewer**:
- Courier New monospace typography
- 33px fixed header
- 1px solid borders
- 12px padding
- No rounded corners
- No shadows or gradients
- Minimal color palette

**Differences** (intentional):
- Light background vs dark
- Grid layout vs fixed quadrants
- Multiple visualizations vs single 3D canvas
- Scrollable vs fixed viewport

## File Structure

```
/semantic-data-vis/
├── analysis-dashboard.html  # This dashboard (light theme)
├── viewer.html              # 3D visualization (dark theme)
├── config.json              # Shared configuration
├── server.py                # HTTP server
└── RU_AFR_EXPERIMENT._3d.csv  # Data source
```

## Interaction Guide

**Current**:
- Click timeline bars to select/deselect weeks
- Selected bars turn dark gray
- Scroll to view additional visualizations (future)

**Future**:
- Cross-filtering: All visualizations update when any filter is selected
- Hover tooltips on all chart elements
- Export buttons in visualization headers

## Use Cases

- **Statistical Analysis**: View distributions, correlations, outliers
- **Temporal Patterns**: Explore trends over time with multiple time-based views
- **Comparative Analysis**: Compare different slices of data side-by-side
- **Report Generation**: Export filtered data and visualizations for presentations
- **Complement 3D Viewer**: Use together - explore spatially in 3D, analyze quantitatively here

## Technical Notes

- Single HTML file (no build step)
- Pure vanilla JavaScript (no frameworks)
- Canvas-based rendering for performance
- Same CSV parser as 3D viewer
- Responsive grid layout
- Custom scrollbar styling

## Next Steps

1. Add type/cluster distribution charts
2. Implement cross-filtering between all views
3. Add summary statistics table
4. Create export functionality
5. Build keyword/entity frequency visualizations
