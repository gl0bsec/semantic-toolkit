// Cross-filter sync via localStorage for semantic-toolkit analysis views.
//
// Dashboard broadcasts filters; embedding-viewer polls and applies them.
//
// Usage (dashboard):
//   emitFilters({ selectedWeek, selectedLocation, selectedCluster });
//
// Usage (embedding-viewer):
//   startFilterSync(({ selectedWeek, selectedLocation, selectedCluster }) => {
//       // apply incoming filters
//   });

const FILTERS_KEY = 'dashboardFilters';
const FILTERS_POLL_MS = 500;

function emitFilters(state) {
    const payload = Object.assign({}, state, { timestamp: Date.now() });
    localStorage.setItem(FILTERS_KEY, JSON.stringify(payload));
}

function startFilterSync(onFiltersChanged) {
    let lastTimestamp = 0;
    setInterval(() => {
        try {
            const raw = localStorage.getItem(FILTERS_KEY);
            if (!raw) return;
            const filters = JSON.parse(raw);
            if (filters.timestamp > lastTimestamp) {
                lastTimestamp = filters.timestamp;
                onFiltersChanged(filters);
            }
        } catch (e) {
            console.error('Error reading dashboard filters:', e);
        }
    }, FILTERS_POLL_MS);
}
