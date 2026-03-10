const FILTERS_KEY = 'dashboardFilters';

export function emitFilters(state) {
    const payload = Object.assign({}, state, { timestamp: Date.now() });
    localStorage.setItem(FILTERS_KEY, JSON.stringify(payload));
}

export function startFilterSync(onFiltersChanged) {
    window.addEventListener('storage', e => {
        if (e.key !== FILTERS_KEY || !e.newValue) return;
        try {
            onFiltersChanged(JSON.parse(e.newValue));
        } catch (err) {
            console.error('Error reading dashboard filters:', err);
        }
    });
}
