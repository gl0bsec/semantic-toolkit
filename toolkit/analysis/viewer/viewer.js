let data = [];
let config = null;
let showOutliers = true;
let selectedIndex = null;
let highlightTimeout = null;
let selectedWeek = null;
let selectedType = null;
let selectedCluster = null;
let selectedLocation = null;
let summaryMode = 'type'; // 'type' or 'cluster'
let camera = { x: 0, y: 0, z: 5, rotX: 0, rotY: 0 };
let mouse = { x: 0, y: 0, down: false, lastX: 0, lastY: 0 };


// Load configuration
async function loadConfig() {
    const dataset = new URLSearchParams(window.location.search).get('dataset') || 'RU_AFR_EXPERIMENT';
    const response = await fetch(`/api/config?dataset=${dataset}`);
    config = await response.json();
    config._dataset = dataset;
}

// Load data from API
async function loadData() {
    const response = await fetch(`/api/data?dataset=${config._dataset}`);
    const records = await response.json();

    for (const r of records) {
        data.push({
            x: r.x,
            y: r.y,
            z: r.z,
            title: r.title,
            date: r.date,
            type: r.type,
            url: r.url,
            cluster: r.cluster,
            locations: r.locations
        });
    }

    document.getElementById('loading').style.display = 'none';
    renderSidebar();
    updateStats();
    renderTimeline();
    renderSummaryTable();
    render();
}

// Render sidebar
function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';

    let filteredData = showOutliers ? data : data.filter(d => d.cluster !== -1);

    // Filter by selected week if active
    if (selectedWeek) {
        filteredData = filteredData.filter(d => getWeekKey(d.date) === selectedWeek);
    }

    // Filter by selected type if active
    if (selectedType) {
        filteredData = filteredData.filter(d => (d.type || 'N/A') === selectedType);
    }

    // Filter by selected cluster if active
    if (selectedCluster !== null) {
        filteredData = filteredData.filter(d => d.cluster === selectedCluster);
    }

    // Filter by selected location if active
    if (selectedLocation) {
        filteredData = filteredData.filter(d => d.locations && d.locations.includes(selectedLocation));
    }

    // Reverse chronological order
    const sortedData = [...filteredData].sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA; // Most recent first
    });

    sortedData.forEach((item, displayIdx) => {
        const originalIdx = data.indexOf(item);
        const div = document.createElement('div');
        div.className = 'item';
        div.setAttribute('data-index', originalIdx);
        if (selectedIndex === originalIdx) div.classList.add('selected');

        const color = item.cluster === -1 ? OUTLIER_COLOR : CLUSTER_COLORS[item.cluster % CLUSTER_COLORS.length];

        div.innerHTML = `
            <div class="item-title">${escapeHtml(item.title)}</div>
            <div class="item-meta">${item.date} • ${item.type}</div>
            <div class="item-cluster" style="background: ${color}; color: ${item.cluster === -1 ? '#000' : '#000'}">
                CLUSTER ${item.cluster === -1 ? 'OUTLIER' : item.cluster}
            </div>
            ${item.url ? `<div style="margin-top: 4px;"><a class="item-link" href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.url.substring(0, 60))}${item.url.length > 60 ? '...' : ''}</a></div>` : ''}
        `;

        div.addEventListener('click', (e) => {
            e.preventDefault();
            selectedIndex = originalIdx;
            renderSidebar();
            focusOnPoint(item);
        });

        sidebar.appendChild(div);
    });
}

function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        return new Date(year, month - 1, day);
    }
    return new Date(0);
}

function getWeekKey(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        const date = new Date(year, month - 1, day);

        const startDate = new Date(config.timeline.startDate);
        if (date < startDate) return null;

        const diffTime = date - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weekNum = Math.floor(diffDays / 7);

        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + weekNum * 7);
        return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-W${weekNum}`;
    }
    return null;
}

function highlightSidebarItem(dataIndex) {
    const sidebar = document.getElementById('sidebar');
    const targetDiv = sidebar.querySelector(`[data-index="${dataIndex}"]`);

    if (targetDiv) {
        // Clear previous highlight timeout
        if (highlightTimeout) {
            clearTimeout(highlightTimeout);
        }

        // Remove previous highlights
        sidebar.querySelectorAll('.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });

        // Add highlight
        targetDiv.classList.add('highlighted');

        // Scroll to item
        targetDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove highlight after 30 seconds
        highlightTimeout = setTimeout(() => {
            targetDiv.classList.remove('highlighted');
        }, 30000);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Summary table rendering
function renderSummaryTable() {
    const tableBody = document.getElementById('summary-table-body');
    const title = document.getElementById('summary-title');
    const toggle = document.getElementById('summary-toggle');

    let filteredData = showOutliers ? data : data.filter(d => d.cluster !== -1);

    // Filter by selected week if active
    if (selectedWeek) {
        filteredData = filteredData.filter(d => getWeekKey(d.date) === selectedWeek);
    }

    // Filter by selected type if active (only when not in type mode)
    if (selectedType && summaryMode !== 'type') {
        filteredData = filteredData.filter(d => (d.type || 'N/A') === selectedType);
    }

    // Filter by selected cluster if active (only when not in cluster mode)
    if (selectedCluster !== null && summaryMode !== 'cluster') {
        filteredData = filteredData.filter(d => d.cluster === selectedCluster);
    }

    // Filter by selected location if active
    if (selectedLocation) {
        filteredData = filteredData.filter(d => d.locations && d.locations.includes(selectedLocation));
    }

    if (summaryMode === 'type') {
        title.textContent = 'TYPE';
        toggle.textContent = 'CLUSTER';

        // Count by type
        const typeCounts = {};
        filteredData.forEach(d => {
            const type = d.type || 'N/A';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        // Sort by count descending
        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

        tableBody.innerHTML = sortedTypes.map(([type, count]) => {
            const isSelected = selectedType === type;
            return `
                <tr class="${isSelected ? 'selected' : ''}" data-type="${escapeHtml(type)}">
                    <td>${escapeHtml(type)}</td>
                    <td>${count}</td>
                </tr>
            `;
        }).join('');

        // Add click handlers
        tableBody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const type = tr.getAttribute('data-type');
                // Toggle selection
                if (selectedType === type) {
                    selectedType = null;
                } else {
                    selectedType = type;
                    selectedCluster = null; // Clear cluster filter
                }
                renderSidebar();
                renderTimeline();
                renderSummaryTable();
                render();
            });
        });

    } else {
        title.textContent = 'CLUSTER';
        toggle.textContent = 'TYPE';

        // Count by cluster
        const clusterCounts = {};
        filteredData.forEach(d => {
            const cluster = d.cluster;
            clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
        });

        // Sort by count descending
        const sortedClusters = Object.entries(clusterCounts).sort((a, b) => {
            const aNum = parseInt(a[0]);
            const bNum = parseInt(b[0]);
            // Outliers last
            if (aNum === -1) return 1;
            if (bNum === -1) return -1;
            // Otherwise sort by count descending
            return b[1] - a[1];
        });

        tableBody.innerHTML = sortedClusters.map(([cluster, count]) => {
            const clusterNum = parseInt(cluster);
            const color = clusterNum === -1 ? OUTLIER_COLOR : CLUSTER_COLORS[clusterNum % CLUSTER_COLORS.length];
            const label = clusterNum === -1 ? 'OUTLIER' : clusterNum;
            const isSelected = selectedCluster === clusterNum;

            return `
                <tr class="${isSelected ? 'selected' : ''}" data-cluster="${clusterNum}">
                    <td>
                        <span class="cluster-color" style="background: ${color};"></span>${label}
                    </td>
                    <td>${count}</td>
                </tr>
            `;
        }).join('');

        // Add click handlers
        tableBody.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const cluster = parseInt(tr.getAttribute('data-cluster'));
                // Toggle selection
                if (selectedCluster === cluster) {
                    selectedCluster = null;
                } else {
                    selectedCluster = cluster;
                    selectedType = null; // Clear type filter
                }
                renderSidebar();
                renderTimeline();
                renderSummaryTable();
                render();
            });
        });
    }
}

// Update stats
function updateStats() {
    const clusters = new Set(data.map(d => d.cluster));
    const outliers = data.filter(d => d.cluster === -1).length;
    const visible = showOutliers ? data.length : data.length - outliers;

    document.getElementById('stats').textContent =
        `NODES: ${visible}/${data.length} • CLUSTERS: ${clusters.size - 1} • OUTLIERS: ${outliers}`;
}

// Focus camera on point
function focusOnPoint(point) {
    camera.x = -point.x;
    camera.y = -point.y;
    camera.z = 5;
    render();
}

// 3D rendering
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    render();
}

function project(x, y, z) {
    const scale = 800 / (z + camera.z);
    return {
        x: (x + camera.x) * scale + canvas.width / 2,
        y: (y + camera.y) * scale + canvas.height / 2,
        scale: scale
    };
}

function rotate(x, y, z) {
    // Rotate around Y axis
    const cosY = Math.cos(camera.rotY);
    const sinY = Math.sin(camera.rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    // Rotate around X axis
    const cosX = Math.cos(camera.rotX);
    const sinX = Math.sin(camera.rotX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    return { x: x1, y: y1, z: z2 };
}

function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const points = [];

    data.forEach((point, idx) => {
        if (!showOutliers && point.cluster === -1) return;

        // Filter by selected week if active
        if (selectedWeek && getWeekKey(point.date) !== selectedWeek) return;

        // Filter by selected type if active
        if (selectedType && (point.type || 'N/A') !== selectedType) return;

        // Filter by selected cluster if active
        if (selectedCluster !== null && point.cluster !== selectedCluster) return;

        // Filter by selected location if active
        if (selectedLocation && (!point.locations || !point.locations.includes(selectedLocation))) return;

        const rotated = rotate(point.x, point.y, point.z);
        const projected = project(rotated.x, rotated.y, rotated.z);

        points.push({
            x: projected.x,
            y: projected.y,
            z: rotated.z,
            scale: projected.scale,
            cluster: point.cluster,
            index: idx
        });
    });

    // Sort by depth
    points.sort((a, b) => a.z - b.z);

    // Store rendered points for hit detection
    window.renderedPoints = points;

    // Draw points
    points.forEach(p => {
        const size = Math.max(config.pointSize.min, Math.min(config.pointSize.max, p.scale * config.pointSize.scale));
        const color = p.cluster === -1 ? OUTLIER_COLOR : CLUSTER_COLORS[p.cluster % CLUSTER_COLORS.length];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Highlight selected
        if (p.index === selectedIndex) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
}

// Tooltip functions
function showTooltip(point, x, y) {
    const tooltip = document.getElementById('tooltip');
    const color = point.cluster === -1 ? OUTLIER_COLOR : CLUSTER_COLORS[point.cluster % CLUSTER_COLORS.length];

    tooltip.innerHTML = `
        <div class="tooltip-title">${escapeHtml(point.title)}</div>
        <div class="tooltip-meta">${point.date} • ${point.type}</div>
        <div class="tooltip-cluster" style="background: ${color}; color: ${point.cluster === -1 ? '#000' : '#000'}">
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

function findPointAtMouse(mouseX, mouseY) {
    if (!window.renderedPoints) return null;

    // Check from front to back (reverse order)
    for (let i = window.renderedPoints.length - 1; i >= 0; i--) {
        const p = window.renderedPoints[i];
        const size = Math.max(config.pointSize.min, Math.min(config.pointSize.max, p.scale * config.pointSize.scale));
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= size + 2) {
            return data[p.index];
        }
    }
    return null;
}

// Mouse controls
canvas.addEventListener('mousedown', e => {
    mouse.down = true;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;

    // Store initial position to detect clicks vs drags
    mouse.startX = e.clientX;
    mouse.startY = e.clientY;
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouse.down) {
        const dx = e.clientX - mouse.lastX;
        const dy = e.clientY - mouse.lastY;

        camera.rotY += dx * 0.005;
        camera.rotX += dy * 0.005;

        mouse.lastX = e.clientX;
        mouse.lastY = e.clientY;

        hideTooltip();
        render();
    } else {
        // Show tooltip on hover
        const point = findPointAtMouse(mouseX, mouseY);
        if (point) {
            showTooltip(point, e.clientX, e.clientY);
            canvas.style.cursor = 'pointer';
        } else {
            hideTooltip();
            canvas.style.cursor = 'default';
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if this was a click (not a drag)
    const dx = e.clientX - mouse.startX;
    const dy = e.clientY - mouse.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
        // This was a click, not a drag
        const point = findPointAtMouse(mouseX, mouseY);
        if (point) {
            const dataIndex = data.indexOf(point);
            selectedIndex = dataIndex;
            highlightSidebarItem(dataIndex);
            renderSidebar();
            render();
        }
    }

    mouse.down = false;
});

canvas.addEventListener('mouseleave', () => {
    hideTooltip();
    canvas.style.cursor = 'default';
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    camera.z += e.deltaY * 0.01;
    camera.z = Math.max(1, Math.min(20, camera.z));
    render();
});

// Timeline rendering
const timelineCanvas = document.getElementById('timeline-canvas');
const timelineCtx = timelineCanvas.getContext('2d');

function resizeTimeline() {
    const container = document.getElementById('timeline');
    timelineCanvas.width = container.clientWidth;
    timelineCanvas.height = container.clientHeight;
    renderTimeline();
}

function renderTimeline() {
    if (!data.length) return;

    const width = timelineCanvas.width;
    const height = timelineCanvas.height;

    timelineCtx.fillStyle = '#000';
    timelineCtx.fillRect(0, 0, width, height);

    // Parse dates and group by week
    const dateCounts = {};
    const startDate = new Date(config.timeline.startDate);

    data.forEach(d => {
        if (!showOutliers && d.cluster === -1) return;

        // Filter by selected type if active
        if (selectedType && (d.type || 'N/A') !== selectedType) return;

        // Filter by selected cluster if active
        if (selectedCluster !== null && d.cluster !== selectedCluster) return;

        // Filter by selected location if active
        if (selectedLocation && (!d.locations || !d.locations.includes(selectedLocation))) return;

        const dateStr = d.date;
        if (!dateStr) return;

        // Parse date (format: MM/DD/YYYY)
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const month = parseInt(parts[0]);
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            const date = new Date(year, month - 1, day);

            // Filter dates before July 2025
            if (date < startDate) return;

            // Calculate week number from start date
            const diffTime = date - startDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7);

            // Create week key
            const weekStart = new Date(startDate);
            weekStart.setDate(startDate.getDate() + weekNum * 7);
            const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-W${weekNum}`;

            dateCounts[key] = (dateCounts[key] || 0) + 1;
        }
    });

    const sortedKeys = Object.keys(dateCounts).sort();
    if (sortedKeys.length === 0) return;

    const maxCount = Math.max(...Object.values(dateCounts));
    const barWidth = Math.max(1, (width - 40) / sortedKeys.length);
    const chartHeight = height - 30;

    // Store bars for hit detection
    window.timelineBars = sortedKeys.map((key, i) => {
        const count = dateCounts[key];
        const barHeight = (count / maxCount) * chartHeight;
        const x = 20 + i * barWidth;
        const y = height - 20 - barHeight;
        return { key, x, y, width: Math.max(1, barWidth - 1), height: barHeight };
    });

    // Draw bars
    window.timelineBars.forEach(bar => {
        const isSelected = selectedWeek === bar.key;
        timelineCtx.fillStyle = isSelected ? '#ff6b6b' : '#4a90e2';
        timelineCtx.fillRect(bar.x, bar.y, bar.width, bar.height);
    });

    // Draw axis
    timelineCtx.strokeStyle = '#333';
    timelineCtx.lineWidth = 1;
    timelineCtx.beginPath();
    timelineCtx.moveTo(20, height - 20);
    timelineCtx.lineTo(width - 20, height - 20);
    timelineCtx.stroke();

    // Draw labels
    timelineCtx.fillStyle = '#666';
    timelineCtx.font = '9px Courier New';
    timelineCtx.textAlign = 'center';

    // Show month labels at month boundaries
    let lastMonth = '';
    sortedKeys.forEach((key, i) => {
        const [yearMonth] = key.split('-W');
        const [year, month] = yearMonth.split('-');
        const currentMonth = `${month}/${year}`;

        if (currentMonth !== lastMonth) {
            const x = 20 + i * barWidth;
            timelineCtx.fillText(currentMonth, x, height - 6);
            lastMonth = currentMonth;
        }
    });

    // Draw max count label
    timelineCtx.textAlign = 'right';
    timelineCtx.fillText(maxCount.toString(), 15, 15);
}

// Timeline click handler
timelineCanvas.addEventListener('click', (e) => {
    const rect = timelineCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (!window.timelineBars) return;

    // Find clicked bar
    for (let bar of window.timelineBars) {
        if (mouseX >= bar.x && mouseX <= bar.x + bar.width &&
            mouseY >= bar.y && mouseY <= bar.y + bar.height) {

            // Toggle selection
            if (selectedWeek === bar.key) {
                selectedWeek = null;
            } else {
                selectedWeek = bar.key;
            }

            // Update all views
            renderSidebar();
            renderTimeline();
            renderSummaryTable();
            render();
            return;
        }
    }

    // Click outside bars - clear filter
    selectedWeek = null;
    renderSidebar();
    renderTimeline();
    renderSummaryTable();
    render();
});

// Timeline hover cursor
timelineCanvas.addEventListener('mousemove', (e) => {
    const rect = timelineCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (!window.timelineBars) return;

    let onBar = false;
    for (let bar of window.timelineBars) {
        if (mouseX >= bar.x && mouseX <= bar.x + bar.width &&
            mouseY >= bar.y && mouseY <= bar.y + bar.height) {
            onBar = true;
            break;
        }
    }

    timelineCanvas.style.cursor = onBar ? 'pointer' : 'default';
});

// Summary table toggle
document.getElementById('summary-toggle').addEventListener('click', () => {
    summaryMode = summaryMode === 'type' ? 'cluster' : 'type';
    renderSummaryTable();
});

// Toggle outliers
document.getElementById('toggle-outliers').addEventListener('change', e => {
    showOutliers = e.target.checked;
    renderSidebar();
    updateStats();
    renderTimeline();
    renderSummaryTable();
    render();
});

// Listen for filter updates from dashboard
startFilterSync(({ selectedWeek: w, selectedCluster: c, selectedLocation: l }) => {
    selectedWeek = w;
    selectedCluster = c;
    selectedLocation = l;
    renderSidebar();
    renderTimeline();
    renderSummaryTable();
    render();
});

// Initialize
window.addEventListener('resize', () => {
    resizeCanvas();
    resizeTimeline();
});
resizeCanvas();
resizeTimeline();

// Load config first, then data
loadConfig().then(() => {
    loadData();
});
