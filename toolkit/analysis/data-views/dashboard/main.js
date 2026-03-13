import { getDataset, fetchConfig, fetchLookup } from '../lib/config.js';
import { loadDataset } from '../lib/db.js';
import { emitFilters } from '../lib/filters.js';
import { createTimeline } from './timeline.js';
import { renderClusterTable } from './cluster-table.js';
import { renderLocationTable } from './location-table.js';
import { renderDataFeed } from './data-feed.js';

const dataset = getDataset();

// State
let config = {};
let countryLookup = {};
let africanCountries = new Set();
let data = [];
let clusterData = {};
let africanOnly = false;
let stackedMode = false;
let selectedWeek = null;
let selectedLocation = null;
let selectedCluster = null;

let timeline;

// DOM refs
const clusterTbody = document.getElementById('cluster-table-body');
const locationTbody = document.getElementById('location-table-body');
const feedContainer = document.getElementById('data-feed');

async function init() {
    try {
        // Set header links
        document.getElementById('dataset-link').textContent = dataset;
        document.getElementById('dataset-link').href = `/${dataset}/index.html`;
        document.getElementById('sibling-link').href = `/ui/data-views/embedding-viewer/embedding-viewer.html?dataset=${dataset}`;

        // Load config and lookup
        config = await fetchConfig(dataset);
        countryLookup = await fetchLookup(dataset);

        if (config.regionFilter?.codes) {
            africanCountries = new Set(config.regionFilter.codes);
        }
        if (config.regionFilter?.label) {
            const label = document.getElementById('region-filter-label');
            if (label) label.textContent = config.regionFilter.label;
        }

        // Load data via API into DuckDB
        const records = await loadDataset(dataset);

        // Process records
        const startDate = new Date(config.timeline?.startDate || config.startDate || '2025-06-01');
        data = [];
        clusterData = {};

        for (const r of records) {
            const dateStr = r.date || '';
            const parsedDate = parseDate(dateStr);

            // Filter records before startDate (matching original behaviour)
            if (parsedDate < startDate) continue;

            const locs = Array.isArray(r.locations) ? r.locations : [];
            const cluster = r.cluster;

            if (!clusterData[cluster]) {
                clusterData[cluster] = { count: 0, vectors: [], centroid: [0, 0, 0] };
            }
            clusterData[cluster].count++;
            clusterData[cluster].vectors.push([r.x, r.y, r.z]);

            data.push({
                x: r.x, y: r.y, z: r.z,
                title: r.title || '',
                date: parsedDate,
                dateStr,
                type: r.type || '',
                cluster,
                locations: locs,
                url: r.url || '',
            });
        }

        // Calculate cluster centroids
        for (const id of Object.keys(clusterData)) {
            const c = clusterData[id];
            const n = c.vectors.length;
            c.centroid = [
                c.vectors.reduce((s, v) => s + v[0], 0) / n,
                c.vectors.reduce((s, v) => s + v[1], 0) / n,
                c.vectors.reduce((s, v) => s + v[2], 0) / n,
            ];
        }

        document.getElementById('data-count').textContent = `${data.length} entries`;

        // Create D3 timeline
        timeline = createTimeline(document.getElementById('timeline-container'), {
            onWeekSelect(week) {
                selectedWeek = week;
                updateAllViews();
            }
        });

        // Observe timeline container resize
        const resizeObserver = new ResizeObserver(() => renderTimelineView());
        resizeObserver.observe(document.getElementById('timeline-container'));

        updateAllViews();
        broadcastFilters();
    } catch (e) {
        console.error('Dashboard init failed:', e);
        document.getElementById('data-count').textContent = `Error: ${e.message}`;
    }
}

function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
    return new Date(0);
}

function getWeekKey(date) {
    const startDate = new Date(config.timeline?.startDate || config.startDate || '2025-06-01');
    const weekNum = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
    const binDate = new Date(startDate.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000);
    const year = String(binDate.getFullYear()).slice(-2);
    const month = String(binDate.getMonth() + 1).padStart(2, '0');
    const day = String(binDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFilteredData() {
    let filtered = [...data];
    if (selectedWeek) {
        filtered = filtered.filter(d => getWeekKey(d.date) === selectedWeek);
    }
    if (selectedLocation) {
        filtered = filtered.filter(d => d.locations.includes(selectedLocation));
    }
    if (selectedCluster !== null) {
        filtered = filtered.filter(d => d.cluster === selectedCluster);
    }
    return filtered;
}

function renderTimelineView() {
    if (!timeline) return;
    const filteredData = getFilteredData();

    if (stackedMode) {
        const bins = {};
        filteredData.forEach(entry => {
            const weekKey = getWeekKey(entry.date);
            if (!bins[weekKey]) bins[weekKey] = { types: {} };
            const type = entry.type || 'Unknown';
            bins[weekKey].types[type] = (bins[weekKey].types[type] || 0) + 1;
        });
        timeline.setSelected(selectedWeek);
        timeline.render(bins, true);
    } else {
        const bins = {};
        filteredData.forEach(entry => {
            const weekKey = getWeekKey(entry.date);
            if (!bins[weekKey]) bins[weekKey] = { count: 0 };
            bins[weekKey].count++;
        });
        timeline.setSelected(selectedWeek);
        timeline.render(bins, false);
    }
}

function updateAllViews() {
    const filteredData = getFilteredData();

    renderTimelineView();
    renderClusterTable(clusterTbody, filteredData, clusterData, selectedCluster);
    renderLocationTable(locationTbody, filteredData, countryLookup, africanCountries, africanOnly, selectedLocation);
    renderDataFeed(feedContainer, filteredData, countryLookup, selectedCluster);
    broadcastFilters();
}

function broadcastFilters() {
    emitFilters({ selectedWeek, selectedLocation, selectedCluster });
}

// Event delegation for table/feed clicks
document.addEventListener('click', e => {
    const locationRow = e.target.closest('tr[data-location]');
    if (locationRow) {
        const code = locationRow.getAttribute('data-location');
        selectedLocation = selectedLocation === code ? null : code;
        updateAllViews();
        return;
    }

    const clusterRow = e.target.closest('tr[data-cluster]');
    if (clusterRow) {
        const id = parseInt(clusterRow.getAttribute('data-cluster'));
        selectedCluster = selectedCluster === id ? null : id;
        updateAllViews();
        return;
    }

    const feedItem = e.target.closest('.feed-item[data-cluster]');
    if (feedItem) {
        const id = parseInt(feedItem.getAttribute('data-cluster'));
        selectedCluster = selectedCluster === id ? null : id;
        updateAllViews();
        return;
    }
});

// Checkbox handlers
document.addEventListener('change', e => {
    if (e.target.id === 'african-only-checkbox') {
        africanOnly = e.target.checked;
        const filteredData = getFilteredData();
        renderLocationTable(locationTbody, filteredData, countryLookup, africanCountries, africanOnly, selectedLocation);
    }
    if (e.target.id === 'stacked-mode-toggle') {
        stackedMode = e.target.checked;
        renderTimelineView();
    }
});

init();
