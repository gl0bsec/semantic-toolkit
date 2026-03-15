# Creating a New Dataset Pipeline

## 1. Add your data

Place your CSV file in a new directory under `datasets/`:

```
datasets/
  MY_DATASET/
    my_data.csv
```

The CSV must contain embedding vector columns (e.g. `map_vector_0`, `map_vector_1`, `map_vector_2`) and at least one identifier column.

## 2. Create config.json

Create `datasets/MY_DATASET/config.json`:

```json
{
  "name": "MY_DATASET",
  "views": ["embedding-viewer"],
  "dataSource": "my_data.csv",
  "columns": {
    "x": "map_vector_0",
    "y": "map_vector_1",
    "z": "map_vector_2",
    "title": "doc_name",
    "date": "publish_date",
    "cluster": "cluster",
    "type": "category"
  },
  "pointSize": { "min": 1, "max": 4, "scale": 0.25 },
  "timeline": { "startDate": "2025-01-01" }
}
```

### Required fields

| Field | Description |
|-------|-------------|
| `name` | Dataset identifier, must match the directory name |
| `views` | Array of enabled views: `"embedding-viewer"`, `"dashboard"` |
| `dataSource` | CSV filename relative to the dataset directory |
| `columns.x/y/z` | CSV columns containing 3D embedding coordinates |

### Optional fields

| Field | Description |
|-------|-------------|
| `columns.title` | Display name column. Use an array for fallbacks: `["col_a", "col_b"]` |
| `columns.date` | Date column. Supported formats: `MM/DD/YYYY`, `YYYY-MM-DD`, `YYYY/MM/DD HH:MM:SS`, `YYYY/MM/DD` |
| `columns.cluster` | Cluster assignment column |
| `columns.type` | Category/type column |
| `columns.url` | Source URL column |
| `columns.locations` | Locations column (for region filtering) |
| `lookupSource` | Filename of a lookup table (e.g. country codes) |
| `pointSize` | Point rendering size: `{ "min", "max", "scale" }` |
| `timeline.startDate` | Default start date for the timeline filter (`YYYY-MM-DD`) |
| `regionFilter` | `{ "label": "...", "codes": [...] }` — filter by location codes |

## 3. Run

```bash
cd toolkit && bash run.sh --dataset MY_DATASET
```

The home page at `http://localhost:5173/home/home.html` will automatically list the new dataset. Clicking it opens the dataset index, which links to each view listed in `config.json`.

## What happens automatically

- **Home page** discovers all datasets with a valid `config.json`
- **Dataset index page** is generated from the config — no HTML files to create
- **Embedding viewer** reads column mappings from the config and loads data via DuckDB
- **Dashboard link** in the viewer header is greyed out if `"dashboard"` is not in the `views` array
