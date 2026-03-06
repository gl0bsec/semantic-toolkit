// Configuration
const config = {
    dataSource: "RU_AFR_EXPERIMENT._3d.csv",
    startDate: "2025-06-01",
};

// Global state
let data = [];
let timelineBins = {};
let selectedBin = null;
let countryLookup = {};
let locationMentions = {};
let africanOnly = false;
let africanCountries = new Set();
let clusterData = {};

// Filter state
let selectedWeek = null;
let selectedLocation = null;
let selectedCluster = null;
let stackedMode = false;


// Data loading
async function loadConfig() {
    try {
        const dataset = new URLSearchParams(window.location.search).get("dataset") || "RU_AFR_EXPERIMENT";
        const response = await fetch(`/api/config?dataset=${dataset}`);
        const loadedConfig = await response.json();
        Object.assign(config, loadedConfig);
        config._dataset = dataset;
        config.startDate = loadedConfig.timeline?.startDate || config.startDate;
        if (loadedConfig.regionFilter?.codes) {
            africanCountries = new Set(loadedConfig.regionFilter.codes);
        }
        if (loadedConfig.regionFilter?.label) {
            const label = document.getElementById('region-filter-label');
            if (label) label.textContent = loadedConfig.regionFilter.label;
        }
    } catch (e) {
        console.log("Using default config");
    }
}

async function loadCountryLookup() {
    try {
        const response = await fetch(`/api/lookup?dataset=${config._dataset}`);
        countryLookup = await response.json();
        console.log(`Loaded ${Object.keys(countryLookup).length} location codes`);
    } catch (e) {
        console.error("Error loading location lookup:", e);
    }
}

async function loadData() {
    try {
        const response = await fetch(`/api/data?dataset=${config._dataset}`);
        const records = await response.json();

        data = [];
        locationMentions = {};
        clusterData = {};

        for (const r of records) {
            const date = parseDate(r.date);

            r.locations.forEach((code) => {
                locationMentions[code] = (locationMentions[code] || 0) + 1;
            });

            if (!clusterData[r.cluster]) {
                clusterData[r.cluster] = {
                    count: 0,
                    vectors: [],
                    centroid: [0, 0, 0],
                };
            }
            clusterData[r.cluster].count++;
            clusterData[r.cluster].vectors.push([r.x, r.y, r.z]);

            data.push({
                date: date,
                dateStr: r.date,
                title: r.title,
                type: r.type,
                cluster: r.cluster,
                locations: r.locations,
                vector: [r.x, r.y, r.z],
            });
        }

        // Calculate cluster centroids
        Object.keys(clusterData).forEach((clusterId) => {
            const cluster = clusterData[clusterId];
            const n = cluster.vectors.length;
            cluster.centroid = [
                cluster.vectors.reduce((sum, v) => sum + v[0], 0) / n,
                cluster.vectors.reduce((sum, v) => sum + v[1], 0) / n,
                cluster.vectors.reduce((sum, v) => sum + v[2], 0) / n,
            ];
        });

        console.log(`Loaded ${data.length} entries`);
        console.log(`Found ${Object.keys(locationMentions).length} unique locations`);
        document.getElementById("data-count").textContent = `${data.length} entries`;

        processTimeline();
        renderTimeline();
        renderLocationTable();
        renderDataFeed();
        renderClusterTable();
    } catch (e) {
        console.error("Error loading data:", e);
    }
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
}

function processTimeline() {
    timelineBins = {};
    const startDate = new Date(config.startDate);

    data.forEach((entry) => {
        const weekNum = Math.floor(
            (entry.date - startDate) / (7 * 24 * 60 * 60 * 1000),
        );
        const binDate = new Date(
            startDate.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000,
        );
        const key = formatDate(binDate);

        if (!timelineBins[key]) {
            timelineBins[key] = {
                date: binDate,
                count: 0,
                entries: [],
            };
        }
        timelineBins[key].count++;
        timelineBins[key].entries.push(entry);
    });
}

function formatDate(date) {
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getWeekKey(date) {
    const startDate = new Date(config.startDate);
    const weekNum = Math.floor(
        (date - startDate) / (7 * 24 * 60 * 60 * 1000),
    );
    const binDate = new Date(
        startDate.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000,
    );
    return formatDate(binDate);
}

function getFilteredData() {
    let filtered = [...data];

    if (selectedWeek) {
        filtered = filtered.filter(
            (d) => getWeekKey(d.date) === selectedWeek,
        );
    }

    if (selectedLocation) {
        filtered = filtered.filter((d) =>
            d.locations.includes(selectedLocation),
        );
    }

    if (selectedCluster !== null) {
        filtered = filtered.filter(
            (d) => d.cluster === selectedCluster,
        );
    }

    return filtered;
}

function updateAllViews() {
    renderTimeline();
    renderLocationTable();
    renderDataFeed();
    renderClusterTable();
    broadcastFilters();
}

function broadcastFilters() {
    emitFilters({ selectedWeek, selectedLocation, selectedCluster });
}

function renderLocationTable() {
    const tbody = document.getElementById("location-table-body");
    const filteredData = getFilteredData();

    const filteredLocationMentions = {};
    filteredData.forEach((entry) => {
        entry.locations.forEach((code) => {
            filteredLocationMentions[code] =
                (filteredLocationMentions[code] || 0) + 1;
        });
    });

    let locations = Object.keys(filteredLocationMentions)
        .map((code) => ({
            code: code,
            name: countryLookup[code] || "Unknown",
            count: filteredLocationMentions[code],
        }))
        .sort((a, b) => b.count - a.count);

    if (africanOnly) {
        locations = locations.filter((loc) =>
            africanCountries.has(loc.code),
        );
    }

    if (locations.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="3" style="text-align: center; color: #666;">No data</td></tr>';
        return;
    }

    tbody.innerHTML = locations
        .map(
            (loc) => `
        <tr data-location="${loc.code}" class="${selectedLocation === loc.code ? "selected" : ""}">
          <td><strong>${loc.code}</strong></td>
          <td>${loc.name}</td>
          <td class="numeric">${loc.count}</td>
        </tr>
      `,
        )
        .join("");
}

function renderDataFeed() {
    const feed = document.getElementById("data-feed");
    const filteredData = getFilteredData();

    const sortedData = [...filteredData].sort(
        (a, b) => b.date - a.date,
    );

    if (sortedData.length === 0) {
        feed.innerHTML =
            '<div style="text-align: center; color: #666; padding: 20px;">No data</div>';
        return;
    }

    feed.innerHTML = sortedData
        .map((item, idx) => {
            const locationNames = item.locations
                .map((loc) => countryLookup[loc] || loc)
                .join(", ");

            return `
          <div class="feed-item" data-index="${idx}" data-cluster="${item.cluster}">
<div class="feed-item-title">${item.title}</div>
<div class="feed-item-meta">
  <strong>Date:</strong> ${item.dateStr} |
  <strong>Type:</strong> ${item.type} |
  <strong>Locations:</strong> ${locationNames || "N/A"}
</div>
<div class="feed-item-cluster">Cluster ${item.cluster}</div>
          </div>
        `;
        })
        .join("");
}

function euclideanDistance(v1, v2) {
    return Math.sqrt(
        Math.pow(v1[0] - v2[0], 2) +
            Math.pow(v1[1] - v2[1], 2) +
            Math.pow(v1[2] - v2[2], 2),
    );
}

function renderClusterTable() {
    const tbody = document.getElementById("cluster-table-body");
    const filteredData = getFilteredData();

    const filteredClusterCounts = {};
    filteredData.forEach((entry) => {
        filteredClusterCounts[entry.cluster] =
            (filteredClusterCounts[entry.cluster] || 0) + 1;
    });

    const clusters = Object.keys(filteredClusterCounts).map(
        (id) => ({
            id: parseInt(id),
            count: filteredClusterCounts[id],
            centroid: clusterData[id].centroid,
        }),
    );

    if (clusters.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="3" style="text-align: center; color: #666;">No data</td></tr>';
        return;
    }

    clusters.forEach((cluster) => {
        const distances = clusters
            .filter((c) => c.id !== cluster.id)
            .map((c) =>
                euclideanDistance(cluster.centroid, c.centroid),
            );
        cluster.avgDistance =
            distances.length > 0
                ? distances.reduce((sum, d) => sum + d, 0) /
                  distances.length
                : 0;
    });

    clusters.sort((a, b) => a.avgDistance - b.avgDistance);

    tbody.innerHTML = clusters
        .map(
            (cluster) => `
        <tr data-cluster="${cluster.id}" class="${selectedCluster === cluster.id ? "selected" : ""}">
          <td><strong>Cluster ${cluster.id}</strong></td>
          <td class="numeric">${cluster.count}</td>
          <td class="numeric">${cluster.avgDistance.toFixed(2)}</td>
        </tr>
      `,
        )
        .join("");
}

// Fix #3: Retina DPI support for canvas rendering
function setupCanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return ctx;
}

function renderTimeline() {
    const canvas = document.getElementById("timeline-canvas");
    const container = canvas.parentElement;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    // Fix #3: Use DPI-aware canvas setup
    const ctx = setupCanvas(canvas, width, height);
    ctx.clearRect(0, 0, width, height);

    const filteredData = getFilteredData();

    if (stackedMode) {
        const filteredBins = {};
        const typesInData = new Set();
        filteredData.forEach((entry) => {
            const weekKey = getWeekKey(entry.date);
            if (!filteredBins[weekKey]) {
                filteredBins[weekKey] = {
                    date: entry.date,
                    types: {},
                };
            }
            const type = entry.type || "Unknown";
            filteredBins[weekKey].types[type] =
                (filteredBins[weekKey].types[type] || 0) + 1;
            typesInData.add(type);
        });

        const bins = Object.keys(filteredBins).sort();
        if (bins.length === 0) return;

        const maxCount = Math.max(
            ...Object.values(filteredBins).map((bin) =>
                Object.values(bin.types).reduce(
                    (sum, count) => sum + count,
                    0,
                ),
            ),
        );
        const barWidth = (width - 40) / bins.length;
        const maxBarHeight = height - 76;

        ctx.font = "9px Courier New";
        ctx.textAlign = "center";

        bins.forEach((key, i) => {
            const bin = filteredBins[key];
            const x = 20 + i * barWidth;

            const totalCount = Object.values(bin.types).reduce(
                (sum, count) => sum + count,
                0,
            );
            const types = Object.keys(bin.types).sort();

            let cumulativeY = height - 56;
            types.forEach((type) => {
                const count = bin.types[type];
                const segmentHeight =
                    (count / maxCount) * maxBarHeight;
                const y = cumulativeY - segmentHeight;

                ctx.fillStyle = typeColors[type] || "#999";

                if (selectedWeek === key) {
                    ctx.globalAlpha = 0.7;
                }

                ctx.fillRect(
                    x,
                    y,
                    Math.max(barWidth - 2, 1),
                    segmentHeight,
                );

                ctx.globalAlpha = 1.0;
                cumulativeY = y;
            });

            if (barWidth > 20) {
                ctx.fillStyle = "#000";
                const totalBarHeight =
                    (totalCount / maxCount) * maxBarHeight;
                ctx.fillText(
                    totalCount,
                    x + barWidth / 2,
                    height - 56 - totalBarHeight - 4,
                );
            }

            if (
                i % Math.max(1, Math.floor(bins.length / 10)) ===
                0
            ) {
                ctx.fillStyle = "#666";
                ctx.save();
                ctx.translate(x + barWidth / 2, height - 45);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = "right";
                ctx.fillText(key, 0, 0);
                ctx.restore();
            }
        });

        // Draw baseline
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 56);
        ctx.lineTo(width - 20, height - 56);
        ctx.stroke();

        // Fix #6: Legend with background rect and dynamic positioning
        const legendTypes = Array.from(typesInData).sort();
        const rowHeight = 14;
        const legendPadding = 8;
        const legendW = 80;
        const legendH =
            legendTypes.length * rowHeight + legendPadding * 2;
        const legendX = width - legendW - legendPadding;
        const legendY = 4;

        // Background rect to prevent overlap with bars
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.fillRect(
            legendX - legendPadding,
            legendY,
            legendW + legendPadding * 2,
            legendH,
        );
        ctx.strokeStyle = "#ccc";
        ctx.strokeRect(
            legendX - legendPadding,
            legendY,
            legendW + legendPadding * 2,
            legendH,
        );

        ctx.font = "9px Courier New";
        ctx.textAlign = "left";

        legendTypes.forEach((type, i) => {
            const y = legendY + legendPadding + i * rowHeight;

            ctx.fillStyle = typeColors[type] || "#999";
            ctx.fillRect(legendX, y, 10, 10);

            ctx.fillStyle = "#000";
            ctx.fillText(type, legendX + 14, y + 9);
        });

        // Store bins for click detection (use CSS coordinates, not canvas pixel coordinates)
        canvas.bins = bins.map((key, i) => ({
            key,
            x: 20 + i * barWidth,
            width: barWidth,
        }));
    } else {
        // Regular mode
        const filteredBins = {};
        filteredData.forEach((entry) => {
            const weekKey = getWeekKey(entry.date);
            if (!filteredBins[weekKey]) {
                filteredBins[weekKey] = {
                    count: 0,
                    date: entry.date,
                };
            }
            filteredBins[weekKey].count++;
        });

        const bins = Object.keys(filteredBins).sort();
        if (bins.length === 0) return;

        const maxCount = Math.max(
            ...Object.values(filteredBins).map((b) => b.count),
        );
        const barWidth = (width - 40) / bins.length;
        const maxBarHeight = height - 76;

        ctx.font = "9px Courier New";
        ctx.textAlign = "center";

        bins.forEach((key, i) => {
            const bin = filteredBins[key];
            const x = 20 + i * barWidth;
            const barHeight = (bin.count / maxCount) * maxBarHeight;
            const y = height - 56 - barHeight;

            ctx.fillStyle =
                selectedWeek === key ? "#ff6b6b" : "#000";
            ctx.fillRect(
                x,
                y,
                Math.max(barWidth - 2, 1),
                barHeight,
            );

            if (barWidth > 20) {
                ctx.fillStyle = "#000";
                ctx.fillText(bin.count, x + barWidth / 2, y - 4);
            }

            if (
                i % Math.max(1, Math.floor(bins.length / 10)) ===
                0
            ) {
                ctx.fillStyle = "#666";
                ctx.save();
                ctx.translate(x + barWidth / 2, height - 45);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = "right";
                ctx.fillText(key, 0, 0);
                ctx.restore();
            }
        });

        // Draw baseline
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 56);
        ctx.lineTo(width - 20, height - 56);
        ctx.stroke();

        canvas.bins = bins.map((key, i) => ({
            key,
            x: 20 + i * barWidth,
            width: barWidth,
        }));
    }
}

// Event handlers
document
    .getElementById("timeline-canvas")
    .addEventListener("click", (e) => {
        const canvas = e.target;
        const rect = canvas.getBoundingClientRect();
        // Fix #3: Use CSS pixel coordinates for click detection (matching bin positions)
        const x = e.clientX - rect.left;

        if (!canvas.bins) return;

        for (let bin of canvas.bins) {
            if (x >= bin.x && x < bin.x + bin.width) {
                if (selectedWeek === bin.key) {
                    selectedWeek = null;
                } else {
                    selectedWeek = bin.key;
                }
                updateAllViews();
                break;
            }
        }
    });

// Fix #10: ResizeObserver for robust canvas resizing
const timelineContainer =
    document.getElementById("timeline-canvas").parentElement;
const resizeObserver = new ResizeObserver(() => {
    renderTimeline();
});
resizeObserver.observe(timelineContainer);

// Click handlers for tables and feed
document.addEventListener("click", (e) => {
    const locationRow = e.target.closest("tr[data-location]");
    if (locationRow) {
        const locationCode =
            locationRow.getAttribute("data-location");
        if (selectedLocation === locationCode) {
            selectedLocation = null;
        } else {
            selectedLocation = locationCode;
        }
        updateAllViews();
        return;
    }

    const clusterRow = e.target.closest("tr[data-cluster]");
    if (clusterRow) {
        const clusterId = parseInt(
            clusterRow.getAttribute("data-cluster"),
        );
        if (selectedCluster === clusterId) {
            selectedCluster = null;
        } else {
            selectedCluster = clusterId;
        }
        updateAllViews();
        return;
    }

    const feedItem = e.target.closest(".feed-item[data-cluster]");
    if (feedItem) {
        const clusterId = parseInt(
            feedItem.getAttribute("data-cluster"),
        );
        if (selectedCluster === clusterId) {
            selectedCluster = null;
        } else {
            selectedCluster = clusterId;
        }
        updateAllViews();
        return;
    }
});

// Checkbox handlers
document.addEventListener("change", (e) => {
    if (e.target.id === "african-only-checkbox") {
        africanOnly = e.target.checked;
        renderLocationTable();
    }

    if (e.target.id === "stacked-mode-toggle") {
        stackedMode = e.target.checked;
        renderTimeline();
    }
});

// Initialize
async function init() {
    await loadConfig();
    await loadCountryLookup();
    await loadData();
    broadcastFilters();
}

init();
