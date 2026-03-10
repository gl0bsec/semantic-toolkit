import { getDataset, fetchConfig } from '../lib/config.js';
import { loadDataset } from '../lib/db.js';
import { CLUSTER_COLORS, OUTLIER_COLOR } from '../lib/colors.js';
import { startFilterSync } from '../lib/filters.js';
import { createPointCloud } from './pointcloud.js';
import { createViewerTimeline } from './timeline.js';

const dataset = getDataset();

// State
let config = null;
let data = [];
let showOutliers = true;
let selectedIndex = null;
let highlightTimeout = null;
let selectedWeek = null;
let selectedType = null;
let selectedCluster = null;
let selectedLocation = null;
let summaryMode = 'type';

let cloud;
let timeline;
let dragStart = { x: 0, y: 0 };

async function init() {
    try {
        // Set header links
        document.getElementById('dataset-link').textContent = dataset;
        document.getElementById('dataset-link').href = `/${dataset}/index.html`;
        document.getElementById('sibling-link').href = `/ui/data-views/dashboard/dashboard.html?dataset=${dataset}`;

        // Load config
        config = await fetchConfig(dataset);

        // Load data via API into DuckDB
        const records = await loadDataset(dataset);

        // Process records with JS date filtering
        const startDate = new Date(config.timeline?.startDate || '2025-06-01');
        for (const r of records) {
            const dateStr = r.date || '';
            const parsedDate = parseDate(dateStr);

            if (parsedDate < startDate) continue;

            data.push({
                x: r.x, y: r.y, z: r.z,
                title: r.title || '',
                date: dateStr,
                type: r.type || '',
                cluster: r.cluster,
                locations: Array.isArray(r.locations) ? r.locations : [],
                url: r.url || '',
            });
        }

        document.getElementById('loading').style.display = 'none';

        // Create Three.js point cloud
        cloud = createPointCloud(document.getElementById('canvas-container'), config);

        // Create D3 timeline
        timeline = createViewerTimeline(document.getElementById('timeline-container'), {
            onWeekSelect(week) {
                selectedWeek = week;
                updateAll();
            }
        });

        // Observe timeline resize
        const resizeObserver = new ResizeObserver(() => renderTimelineView());
        resizeObserver.observe(document.getElementById('timeline-container'));

        // Canvas interaction
        cloud.domElement.addEventListener('mousedown', e => {
            dragStart = { x: e.clientX, y: e.clientY };
        });
        cloud.domElement.addEventListener('click', onCanvasClick);
        cloud.domElement.addEventListener('mousemove', onCanvasHover);
        cloud.domElement.addEventListener('mouseleave', () => hideTooltip());

        // Controls
        document.getElementById('toggle-outliers').addEventListener('change', e => {
            showOutliers = e.target.checked;
            updateAll();
            updateStats();
        });

        document.getElementById('summary-toggle').addEventListener('click', () => {
            summaryMode = summaryMode === 'type' ? 'cluster' : 'type';
            renderSummaryTable();
        });

        // Filter sync from dashboard
        startFilterSync(({ selectedWeek: w, selectedCluster: c, selectedLocation: l }) => {
            selectedWeek = w;
            selectedCluster = c;
            selectedLocation = l;
            updateAll();
        });

        updateAll();
        updateStats();
    } catch (e) {
        console.error('Viewer init failed:', e);
        document.getElementById('loading').textContent = `Error: ${e.message}`;
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

function getWeekKey(dateStr) {
    if (!dateStr) return null;
    const date = parseDate(dateStr);
    const startDate = new Date(config.timeline?.startDate || '2025-06-01');
    if (date < startDate) return null;

    const weekNum = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
    const binDate = new Date(startDate.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000);
    const year = String(binDate.getFullYear()).slice(-2);
    const month = String(binDate.getMonth() + 1).padStart(2, '0');
    const day = String(binDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFilteredData() {
    let filtered = showOutliers ? data : data.filter(d => d.cluster !== -1);
    if (selectedWeek) filtered = filtered.filter(d => getWeekKey(d.date) === selectedWeek);
    if (selectedType) filtered = filtered.filter(d => (d.type || 'N/A') === selectedType);
    if (selectedCluster !== null) filtered = filtered.filter(d => d.cluster === selectedCluster);
    if (selectedLocation) filtered = filtered.filter(d => d.locations && d.locations.includes(selectedLocation));
    return filtered;
}

function updateAll() {
    const filtered = getFilteredData();
    cloud.setData(filtered);
    if (selectedIndex !== null) {
        const item = data[selectedIndex];
        const filteredIdx = filtered.indexOf(item);
        cloud.select(filteredIdx >= 0 ? filteredIdx : null);
    }
    renderSidebar();
    renderTimelineView();
    renderSummaryTable();
}

function updateStats() {
    const clusters = new Set(data.map(d => d.cluster));
    const outliers = data.filter(d => d.cluster === -1).length;
    const visible = showOutliers ? data.length : data.length - outliers;
    document.getElementById('stats').textContent =
        `NODES: ${visible}/${data.length} • CLUSTERS: ${clusters.size - 1} • OUTLIERS: ${outliers}`;
}

// Sidebar
function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';

    const filtered = getFilteredData();
    const sortedData = [...filtered].sort((a, b) => parseDate(b.date) - parseDate(a.date));

    sortedData.forEach((item) => {
        const originalIdx = data.indexOf(item);
        const div = document.createElement('div');
        div.className = 'item';
        div.setAttribute('data-index', originalIdx);
        if (selectedIndex === originalIdx) div.classList.add('selected');

        const color = item.cluster === -1 ? OUTLIER_COLOR : CLUSTER_COLORS[item.cluster % CLUSTER_COLORS.length];

        div.innerHTML = `
            <div class="item-title">${escapeHtml(item.title)}</div>
            <div class="item-meta">${item.date} • ${item.type}</div>
            <div class="item-cluster" style="background: ${color}; color: #000">
                CLUSTER ${item.cluster === -1 ? 'OUTLIER' : item.cluster}
            </div>
            ${item.url ? `<div style="margin-top: 4px;"><a class="item-link" href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.url.substring(0, 60))}${item.url.length > 60 ? '...' : ''}</a></div>` : ''}
        `;

        div.addEventListener('click', e => {
            e.preventDefault();
            selectedIndex = originalIdx;
            cloud.focusOn(item);
            updateAll();
        });

        sidebar.appendChild(div);
    });
}

function highlightSidebarItem(dataIndex) {
    const sidebar = document.getElementById('sidebar');
    const targetDiv = sidebar.querySelector(`[data-index="${dataIndex}"]`);
    if (!targetDiv) return;

    if (highlightTimeout) clearTimeout(highlightTimeout);
    sidebar.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));

    targetDiv.classList.add('highlighted');
    targetDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

    highlightTimeout = setTimeout(() => {
        targetDiv.classList.remove('highlighted');
    }, 30000);
}

// Summary table
function renderSummaryTable() {
    const tableBody = document.getElementById('summary-table-body');
    const title = document.getElementById('summary-title');
    const toggle = document.getElementById('summary-toggle');

    let filtered = getFilteredData();

    if (selectedType && summaryMode !== 'type') {
        filtered = filtered.filter(d => (d.type || 'N/A') === selectedType);
    }
    if (selectedCluster !== null && summaryMode !== 'cluster') {
        filtered = filtered.filter(d => d.cluster === selectedCluster);
    }

    if (summaryMode === 'type') {
        title.textContent = 'TYPE';
        toggle.textContent = 'CLUSTER';

        const typeCounts = {};
        filtered.forEach(d => {
            const type = d.type || 'N/A';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

        tableBody.innerHTML = sortedTypes.map(([type, count]) => `
            <tr class="${selectedType === type ? 'selected' : ''}" data-type="${escapeHtml(type)}">
                <td>${escapeHtml(type)}</td>
                <td>${count}</td>
            </tr>
        `).join('');

        tableBody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const type = tr.getAttribute('data-type');
                if (selectedType === type) { selectedType = null; } else { selectedType = type; selectedCluster = null; }
                updateAll();
            });
        });
    } else {
        title.textContent = 'CLUSTER';
        toggle.textContent = 'TYPE';

        const clusterCounts = {};
        filtered.forEach(d => {
            clusterCounts[d.cluster] = (clusterCounts[d.cluster] || 0) + 1;
        });

        const sortedClusters = Object.entries(clusterCounts).sort((a, b) => {
            const aNum = parseInt(a[0]), bNum = parseInt(b[0]);
            if (aNum === -1) return 1;
            if (bNum === -1) return -1;
            return b[1] - a[1];
        });

        tableBody.innerHTML = sortedClusters.map(([cluster, count]) => {
            const num = parseInt(cluster);
            const color = num === -1 ? OUTLIER_COLOR : CLUSTER_COLORS[num % CLUSTER_COLORS.length];
            const label = num === -1 ? 'OUTLIER' : num;
            return `
                <tr class="${selectedCluster === num ? 'selected' : ''}" data-cluster="${num}">
                    <td><span class="cluster-color" style="background: ${color};"></span>${label}</td>
                    <td>${count}</td>
                </tr>
            `;
        }).join('');

        tableBody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const cluster = parseInt(tr.getAttribute('data-cluster'));
                if (selectedCluster === cluster) { selectedCluster = null; } else { selectedCluster = cluster; selectedType = null; }
                updateAll();
            });
        });
    }
}

// Timeline
function renderTimelineView() {
    if (!timeline) return;
    const filtered = getFilteredData();
    const bins = {};

    filtered.forEach(d => {
        const wk = getWeekKey(d.date);
        if (wk) bins[wk] = (bins[wk] || 0) + 1;
    });

    timeline.setSelected(selectedWeek);
    timeline.render(bins);
}

// Canvas interaction
function onCanvasClick(e) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) return;

    const hit = cloud.pick(e.clientX, e.clientY);
    if (hit) {
        selectedIndex = data.indexOf(hit.record);
        highlightSidebarItem(selectedIndex);
        updateAll();
    }
}

function onCanvasHover(e) {
    if (e.buttons) {
        hideTooltip();
        return;
    }
    const hit = cloud.pick(e.clientX, e.clientY);
    if (hit) {
        showTooltip(hit.record, e.clientX, e.clientY);
        cloud.domElement.style.cursor = 'pointer';
    } else {
        hideTooltip();
        cloud.domElement.style.cursor = 'default';
    }
}

// Tooltip
function showTooltip(point, x, y) {
    const tooltip = document.getElementById('tooltip');
    const color = point.cluster === -1 ? OUTLIER_COLOR : CLUSTER_COLORS[point.cluster % CLUSTER_COLORS.length];

    tooltip.innerHTML = `
        <div class="tooltip-title">${escapeHtml(point.title)}</div>
        <div class="tooltip-meta">${point.date} • ${point.type}</div>
        <div class="tooltip-cluster" style="background: ${color}; color: #000">
            CLUSTER ${point.cluster === -1 ? 'OUTLIER' : point.cluster}
        </div>
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = (x + 15) + 'px';
    tooltip.style.top = (y + 15) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

init();
