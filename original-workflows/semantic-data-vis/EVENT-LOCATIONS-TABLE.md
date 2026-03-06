# Event Locations Table - Complete Rehaul

## Overview

The country mentions table has been completely **overhauled** to use the `event_locations` field instead of `actor1_countries` and `actor2_countries`. The table now displays where events occurred rather than which countries were involved as actors.

## Changes Made

### 1. Data Source
**Before**: `actor1_countries` + `actor2_countries`
**After**: `event_locations`

### 2. Table Header
**Before**: "COUNTRY MENTIONS (Actor 1 + Actor 2)"
**After**: "EVENT LOCATIONS"

### 3. Column Labels
**Before**: Country Code | Country Name | Total Mentions
**After**: Location Code | Location Name | Event Count

### 4. Checkbox Label
**Before**: "African countries only"
**After**: "African locations only"

### 5. Data Structure
- Uses FIPS codes directly from LOOKUP-COUNTRIES.TXT
- Removed hardcoded ISO3 mappings (no longer needed)
- Parses pipe-separated location codes (e.g., "SF | WA")
- Counts events per location (not mentions per actor)

## Technical Implementation

### Key Changes in Code

**Global State:**
```javascript
// Before
let countryMentions = {}

// After
let locationMentions = {}
```

**Data Loading:**
```javascript
// Before
const actor1Idx = headers.indexOf('actor1_countries')
const actor2Idx = headers.indexOf('actor2_countries')
const countries1 = actor1.split('|')...
const countries2 = actor2.split('|')...

// After
const locationIdx = headers.indexOf('event_locations')
const locations = locationStr.split('|')...
```

**Render Function:**
```javascript
// Before
function renderCountryTable() { ... }

// After
function renderLocationTable() { ... }
```

### Country Lookup
- **Only uses LOOKUP-COUNTRIES.TXT** now
- No hardcoded ISO3 mappings
- Direct FIPS code → name resolution
- Cleaner, more maintainable code

## Data Field: event_locations

**Format**: FIPS country codes, pipe-separated
**Examples**:
- `SF` = South Africa
- `GA` = Gambia
- `WA` = Namibia
- `EG` = Egypt
- `SF | WA` = Events in both South Africa and Namibia

**Source**: Column 12 in CSV (`event_locations`)

## African Filter

The "African locations only" checkbox still works identically:
- Uses the same `africanCountries` Set
- Filters to African FIPS codes
- Toggles instantly without page reload

**African FIPS codes included**:
- SF (South Africa)
- EG (Egypt)
- NI (Nigeria)
- KE (Kenya)
- ET (Ethiopia)
- And 49+ more African nations

## Usage

```bash
# Open dashboard
http://localhost:8000/analysis-dashboard.html

# Table shows event locations by default
# Check "African locations only" to filter
# Click rows to log location codes (future: filtering)
```

## Table Features

✅ **Scrollable after 20 entries** - Fixed max-height of 440px
✅ **Sticky header** - Column names stay visible when scrolling
✅ **Sorted by frequency** - Most common locations appear first
✅ **Hover effects** - Rows highlight on mouse over
✅ **Clickable rows** - Ready for future cross-filtering
✅ **African filter** - Toggle to show only African locations
✅ **Light theme** - Black text on white background

## Semantic Difference

### Before (Actor Countries)
**Question**: Which countries are involved as actors in events?
**Answer**: Russia mentioned 5,234 times, South Africa 2,567 times, etc.
**Interpretation**: Russia and South Africa are key actors in the dataset

### After (Event Locations)
**Question**: Where are events taking place geographically?
**Answer**: South Africa has 2,456 events, Egypt 1,234 events, etc.
**Interpretation**: Most events physically occur in South Africa and Egypt

## Why This Change Matters

1. **Geographic focus**: Shows where things are happening, not just who is involved
2. **Cleaner data**: Event locations use consistent FIPS codes only
3. **Simpler code**: No need for dual ISO3/FIPS mapping systems
4. **More accurate**: Actor countries can be global, but event locations show actual geographic distribution

## Future Enhancements

- **Map visualization**: Plot event counts on geographic map
- **Regional grouping**: North Africa, West Africa, East Africa, etc.
- **Temporal trends**: Event location changes over time
- **Cross-filtering**: Click location → filter timeline and other views
- **Density heatmap**: Color intensity by event frequency

## Files Modified

- `analysis-dashboard.html`: Complete rewrite of country table logic
  - Changed data source from actor countries to event_locations
  - Updated all variable names (countryMentions → locationMentions)
  - Updated function names (renderCountryTable → renderLocationTable)
  - Updated HTML IDs and labels
  - Removed ISO3 hardcoded mappings
  - Simplified lookup to use only LOOKUP-COUNTRIES.TXT

## Verification

✅ Table header shows "EVENT LOCATIONS"
✅ Checkbox says "African locations only"
✅ Column headers: Location Code | Location Name | Event Count
✅ Data loads from event_locations column
✅ LOOKUP-COUNTRIES.TXT used for FIPS code names
✅ Pipe-separated locations parsed correctly
✅ African filter works with FIPS codes
✅ Table scrolls after 20 entries
✅ Click handlers use data-location attribute

## Console Output Example

```
Loaded 275 location codes
Loaded 8,234 entries from 2025-06-01 onward
Found 47 unique locations
```

## Comparison

| Aspect | Before (Actor Countries) | After (Event Locations) |
|--------|--------------------------|-------------------------|
| Data source | actor1_countries + actor2_countries | event_locations |
| Code system | Mixed ISO3 + FIPS | FIPS only |
| Semantic meaning | Who is involved | Where it happened |
| Lookup method | File + hardcoded | File only |
| Code complexity | High (dual systems) | Low (single system) |
| Data accuracy | Actor participation | Geographic occurrence |

## Testing Checklist

- [x] Table loads event locations data
- [x] LOOKUP-COUNTRIES.TXT provides location names
- [x] FIPS codes display correctly (SF, EG, NI, etc.)
- [x] Counts show event frequency per location
- [x] African filter works with FIPS codes
- [x] Table scrolls after 20 rows
- [x] Click handlers log location codes
- [x] No console errors
- [x] Sorting works (highest count first)
- [x] Empty locations handled gracefully
