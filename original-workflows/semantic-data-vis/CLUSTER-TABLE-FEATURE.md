# Cluster Analysis Table Feature

## Overview

Added a **toggle to the data feed** that switches between the chronological feed view and a **cluster analysis table**. The cluster table shows all clusters ranked by their proximity to other clusters (using Euclidean distance in 3D embedding space), along with event counts.

## Feature Details

### Toggle Control
- **Location**: Data feed header, next to title
- **Label**: "Show cluster table"
- **Behavior**: Checkbox toggles between feed and table views
- **State**: Persists during session (not saved between page loads)

### Cluster Analysis Table

**Columns:**
1. **Cluster**: Cluster ID number
2. **Count**: Number of events in cluster
3. **Avg Distance**: Average Euclidean distance to all other cluster centroids

**Sorting Strategy:**
- Clusters are ordered by **average distance** (ascending)
- Clusters with **lower average distance** appear first
- This means **centrally located clusters** (closer to the overall data distribution) rank higher
- **Outlier clusters** (far from others) appear at the bottom

**Rationale**: Clusters near the center of the embedding space often represent common/mainstream themes, while distant clusters may represent niche or distinct topics.

## Technical Implementation

### Data Processing

**1. Capture Vector Data:**
```javascript
// During CSV parsing, extract map_vector_0/1/2
const vec0 = parseFloat(fields[vec0Idx]) || 0
const vec1 = parseFloat(fields[vec1Idx]) || 0
const vec2 = parseFloat(fields[vec2Idx]) || 0

// Store in data array
data.push({
  ...other fields,
  vector: [vec0, vec1, vec2]
})
```

**2. Aggregate by Cluster:**
```javascript
clusterData[clusterId] = {
  count: 0,           // Number of entries
  vectors: [],        // All vectors in cluster
  centroid: [0, 0, 0] // Average position
}
```

**3. Calculate Centroids:**
```javascript
// After loading all data
cluster.centroid = [
  cluster.vectors.reduce((sum, v) => sum + v[0], 0) / n,
  cluster.vectors.reduce((sum, v) => sum + v[1], 0) / n,
  cluster.vectors.reduce((sum, v) => sum + v[2], 0) / n
]
```

**4. Calculate Distances:**
```javascript
function euclideanDistance(v1, v2) {
  return Math.sqrt(
    Math.pow(v1[0] - v2[0], 2) +
    Math.pow(v1[1] - v2[1], 2) +
    Math.pow(v1[2] - v2[2], 2)
  )
}

// Average distance to all other clusters
const distances = clusters
  .filter(c => c.id !== cluster.id)
  .map(c => euclideanDistance(cluster.centroid, c.centroid))
cluster.avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length
```

**5. Sort by Proximity:**
```javascript
// Lower avgDistance = more central = appears first
clusters.sort((a, b) => a.avgDistance - b.avgDistance)
```

### Toggle Logic

```javascript
function toggleFeedView() {
  if (showClusterTable) {
    // Hide feed, show table
    feed.style.display = 'none'
    clusterTableWrapper.style.display = 'block'
    title.textContent = 'CLUSTER ANALYSIS (By Proximity)'
    renderClusterTable()
  } else {
    // Show feed, hide table
    feed.style.display = 'block'
    clusterTableWrapper.style.display = 'none'
    title.textContent = 'DATA FEED (Reverse Chronological)'
  }
}
```

## Visual Design

### Table Structure
```
┌────────────────────────────────────────┐
│ CLUSTER ANALYSIS (By Proximity)       │
│ [x] Show cluster table                 │
├─────────────┬──────────┬───────────────┤
│ Cluster     │ Count    │ Avg Distance  │
├─────────────┼──────────┼───────────────┤
│ Cluster 5   │    234   │        12.45  │
│ Cluster 12  │    189   │        13.78  │
│ Cluster 19  │    156   │        14.23  │
│ ...         │    ...   │         ...   │
└─────────────┴──────────┴───────────────┘
```

### Styling
- **Same table styles** as location table
- **Light theme**: Black text on white
- **Scrollable**: After 20 rows (440px max-height)
- **Sticky header**: Column names stay visible
- **Hover effects**: Row highlights on mouse over
- **Clickable rows**: Ready for future filtering

### Dynamic Title
- **Feed mode**: "DATA FEED (Reverse Chronological)"
- **Table mode**: "CLUSTER ANALYSIS (By Proximity)"

## Use Cases

### Understanding Cluster Distribution
**Question**: Which clusters are most "central" in the semantic space?
**Answer**: Top rows show clusters with lowest average distance

**Example**:
- Cluster 5 (Avg Distance: 12.45) = Central theme, mainstream topic
- Cluster 31 (Avg Distance: 45.67) = Outlier theme, niche/distinct topic

### Identifying Outlier Clusters
**Question**: Which clusters are semantically distant from others?
**Answer**: Bottom rows show clusters with highest average distance

**Interpretation**: These clusters may represent:
- Unique events not fitting other patterns
- Data quality issues (misclassified entries)
- Emerging topics not yet well-represented

### Cluster Size Analysis
**Question**: How many events are in each cluster?
**Answer**: Count column shows cluster populations

**Pattern**: Often, central clusters have higher counts (common themes), while distant clusters have lower counts (rare themes).

## Euclidean Distance Explanation

### What It Measures
Distance between two points in 3D space:
```
distance = √[(x₁-x₂)² + (y₁-y₂)² + (z₁-z₂)²]
```

### Why Use Centroids
- Each cluster represented by **average position** of all its points
- Reduces noise from individual outliers within cluster
- More stable representation of cluster's semantic position

### Why Average Distance
- Single cluster → multiple other clusters relationship
- Average captures overall "centrality" better than min/max
- Balanced metric not biased by single distant cluster

### Semantic Interpretation
In embedding space:
- **Small distance** = Similar semantic content
- **Large distance** = Dissimilar semantic content
- **Central clusters** = Relate to many different themes
- **Distant clusters** = Specialized/distinct themes

## Data Flow

```
CSV Data
  ↓
Parse map_vector_0/1/2 for each entry
  ↓
Group vectors by cluster ID
  ↓
Calculate cluster centroids (average position)
  ↓
Calculate pairwise distances between all centroids
  ↓
Average distances for each cluster
  ↓
Sort by average distance (ascending)
  ↓
Render table
```

## Future Enhancements

### Visualization
- **3D scatter plot**: Show cluster centroids in space
- **Dendrogram**: Hierarchical clustering visualization
- **Heatmap**: Distance matrix between all clusters
- **Network graph**: Clusters as nodes, distances as edges

### Advanced Metrics
- **Silhouette score**: Cluster cohesion/separation quality
- **Intra-cluster variance**: How spread out each cluster is
- **Inter-cluster distance matrix**: Full pairwise distances
- **Cluster density**: Count per unit volume

### Interaction
- **Click cluster row**: Filter feed to show only that cluster
- **Hover**: Preview sample entries from cluster
- **Multi-select**: Compare multiple clusters
- **Export**: Download cluster statistics as CSV

## Performance

### Computational Complexity
- **Centroid calculation**: O(n) where n = total entries
- **Distance calculation**: O(c²) where c = number of clusters
- **Sorting**: O(c log c)
- **Total**: O(n + c²) - very fast for typical cluster counts (<50)

### Memory
- **Vector storage**: 3 floats × n entries × 8 bytes ≈ 200KB for 8k entries
- **Cluster data**: Minimal overhead (centroids + counts)
- **Negligible impact** on browser performance

## Testing Checklist

- [x] Toggle switches between feed and table
- [x] Title updates dynamically
- [x] Table shows all clusters
- [x] Count column displays correctly
- [x] Avg Distance calculated correctly
- [x] Clusters sorted by distance (ascending)
- [x] Table scrollable after 20 rows
- [x] Hover effects work
- [x] Click handlers ready (logs cluster ID)
- [x] No console errors

## Example Output

```
Cluster | Count | Avg Distance
--------|-------|-------------
5       | 234   | 12.45
12      | 189   | 13.78
19      | 156   | 14.23
27      | 145   | 15.67
8       | 123   | 16.89
...     | ...   | ...
-1      | 45    | 52.34  (outliers, very distant)
```

**Interpretation**:
- Clusters 5, 12, 19 are centrally located (common themes)
- Cluster -1 (outliers) is very distant (average 52.34)
- Cluster counts don't perfectly correlate with distance (cluster 27 has fewer entries but is still relatively central)

## Files Modified

- `analysis-dashboard.html`:
  - Added cluster-view-toggle checkbox to feed header
  - Added cluster table HTML (hidden by default)
  - Added map_vector parsing in loadData()
  - Added clusterData aggregation and centroid calculation
  - Added euclideanDistance() function
  - Added renderClusterTable() function
  - Added toggleFeedView() function
  - Added toggle event handler
  - Added dynamic title updates

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Math.sqrt/pow**: Native, all browsers
