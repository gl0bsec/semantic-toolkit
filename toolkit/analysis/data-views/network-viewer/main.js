import Graph from 'graphology';
import Sigma from 'sigma';
import EdgeCurveProgram from '@sigma/edge-curve';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import { CLUSTER_COLORS } from '../lib/colors.js';
import { getDataset, fetchConfig } from '../lib/config.js';

const dataset = getDataset();

// --- State ---
let graph = null;
let renderer = null;
let allNodes = [];
let allEdges = [];
let selectedNode = null;
let hoveredNode = null;
let summaryMode = 'type';
let showSemantic = true;
let showCooccurrence = true;
let weightThreshold = 1;
let curvedEdges = false;
let filterTypes = new Set();
let filterCommunity = null;

// --- Entity type colors ---
const TYPE_COLORS = {
    PERSON: '#ff6b6b',
    ORG: '#4ecdc4',
    GPE: '#45b7d1',
    NORP: '#ffeaa7',
    WORK_OF_ART: '#a29bfe',
    LOC: '#96ceb4',
    EVENT: '#fd79a8',
};
const DEFAULT_TYPE_COLOR = '#888';

function typeColor(t) {
    return TYPE_COLORS[t] || DEFAULT_TYPE_COLOR;
}

function communityColor(c) {
    return CLUSTER_COLORS[c % CLUSTER_COLORS.length];
}

// --- Init ---
async function init() {
    try {
        document.getElementById('dataset-link').textContent = dataset;
        document.getElementById('dataset-link').href = `/${dataset}/index.html`;

        const config = await fetchConfig(dataset);

        const res = await fetch(`/api/network?dataset=${dataset}`);
        if (!res.ok) throw new Error(`Network fetch failed: ${res.status}`);
        const network = await res.json();

        allNodes = network.nodes;
        allEdges = network.edges;

        buildGraph();
        document.getElementById('loading').style.display = 'none';

        setupControls();
        updateStats();
        renderSummary();
    } catch (e) {
        console.error('Init failed:', e);
        document.getElementById('loading').textContent = `Error: ${e.message}`;
    }
}

// --- Graph construction ---
function buildGraph() {
    graph = new Graph({ multi: true });

    // Add nodes
    for (const n of allNodes) {
        graph.addNode(n.id, {
            label: n.label,
            entityType: n.type,
            frequency: n.frequency,
            modularity_class: n.modularity_class,
            community_nodes: n.community_nodes,
            community_edges: n.community_edges,
            size: nodeSizeScale(n.frequency),
            color: typeColor(n.type),
        });
    }

    // Add edges
    addFilteredEdges();

    // Initial layout: circular, then ForceAtlas2
    circular.assign(graph);

    const settings = forceAtlas2.inferSettings(graph);
    settings.gravity = 0.05;
    settings.scalingRatio = 2;
    settings.barnesHutOptimize = true;
    forceAtlas2.assign(graph, { settings, iterations: 300 });

    // Create or recreate renderer
    const container = document.getElementById('graph-container');
    if (renderer) {
        renderer.kill();
    }

    renderer = new Sigma(graph, container, {
        renderLabels: true,
        labelRenderedSizeThreshold: 8,
        labelSize: 11,
        labelFont: 'Courier New',
        labelColor: { color: '#ccc' },
        defaultEdgeColor: '#222',
        defaultEdgeType: curvedEdges ? 'curved' : 'line',
        edgeProgramClasses: {
            curved: EdgeCurveProgram,
        },
        edgeLabelFont: 'Courier New',
        stagePadding: 40,
        nodeReducer(node, data) {
            const res = { ...data };
            if (hoveredNode && hoveredNode !== node && !graph.hasEdge(hoveredNode, node) && !graph.hasEdge(node, hoveredNode)) {
                res.color = '#1a1a1a';
                res.label = '';
            }
            if (selectedNode === node) {
                res.highlighted = true;
            }
            if (filterTypes.size > 0 && !filterTypes.has(data.entityType)) {
                res.hidden = true;
            }
            if (filterCommunity !== null && data.modularity_class !== filterCommunity) {
                res.hidden = true;
            }
            return res;
        },
        edgeReducer(edge, data) {
            const res = { ...data };
            if (hoveredNode) {
                const src = graph.source(edge);
                const tgt = graph.target(edge);
                if (src !== hoveredNode && tgt !== hoveredNode) {
                    res.hidden = true;
                } else {
                    res.color = '#666';
                }
            }
            if (selectedNode) {
                const src = graph.source(edge);
                const tgt = graph.target(edge);
                if (src !== selectedNode && tgt !== selectedNode) {
                    res.color = '#111';
                } else {
                    res.color = '#888';
                }
            }
            return res;
        },
    });

    // Events
    renderer.on('enterNode', ({ node }) => {
        hoveredNode = node;
        renderer.refresh();
        showTooltip(node);
    });

    renderer.on('leaveNode', () => {
        hoveredNode = null;
        renderer.refresh();
        hideTooltip();
    });

    renderer.on('clickNode', ({ node }) => {
        selectNode(node);
    });

    renderer.on('clickStage', () => {
        selectNode(null);
    });

    // Track mouse for tooltip positioning
    const container2 = document.getElementById('graph-container');
    container2.addEventListener('mousemove', (e) => {
        if (hoveredNode) positionTooltip(e.clientX, e.clientY);
    });
}

function addFilteredEdges() {
    // Remove existing edges
    graph.clearEdges();

    let edgeId = 0;
    for (const e of allEdges) {
        if (!showSemantic && e.semantic) continue;
        if (!showCooccurrence && !e.semantic) continue;
        if (e.weight < weightThreshold) continue;
        if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) continue;

        graph.addEdgeWithKey(`e${edgeId++}`, e.source, e.target, {
            weight: e.weight,
            semantic: e.semantic,
            color: e.semantic ? 'rgba(74,144,226,0.15)' : 'rgba(255,255,255,0.06)',
            size: Math.min(e.weight * 0.4, 3),
            filename: e.filename,
            context: e.context,
        });
    }
}

function nodeSizeScale(freq) {
    return 2 + Math.sqrt(freq) * 0.8;
}

// --- Selection ---
function selectNode(nodeId) {
    selectedNode = nodeId;
    renderer.refresh();
    renderNodeDetail();
    renderNeighborList();
    updateStats();
}

// --- Controls ---
function setupControls() {
    document.getElementById('toggle-semantic').addEventListener('change', (e) => {
        showSemantic = e.target.checked;
        rebuildEdges();
    });

    document.getElementById('toggle-cooccurrence').addEventListener('change', (e) => {
        showCooccurrence = e.target.checked;
        rebuildEdges();
    });

    document.getElementById('toggle-curved').addEventListener('change', (e) => {
        curvedEdges = e.target.checked;
        renderer.setSetting('defaultEdgeType', curvedEdges ? 'curved' : 'line');
    });

    const slider = document.getElementById('weight-threshold');
    const valLabel = document.getElementById('weight-val');
    slider.addEventListener('input', (e) => {
        weightThreshold = parseInt(e.target.value);
        valLabel.textContent = weightThreshold;
        rebuildEdges();
    });

    document.getElementById('summary-toggle').addEventListener('click', () => {
        summaryMode = summaryMode === 'type' ? 'community' : 'type';
        renderSummary();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        renderSearch(e.target.value);
    });
}

function rebuildEdges() {
    addFilteredEdges();
    renderer.refresh();
    updateStats();
}

// --- Stats ---
function updateStats() {
    const visibleNodes = graph.order;
    const visibleEdges = graph.size;
    let info = `NODES: ${visibleNodes} EDGES: ${visibleEdges}`;
    if (selectedNode) {
        const degree = graph.degree(selectedNode);
        info += ` SEL-DEG: ${degree}`;
    }
    document.getElementById('stats').textContent = info;
}

// --- Search ---
function renderSearch(query) {
    const container = document.getElementById('search-results');
    if (!query || query.length < 2) {
        container.innerHTML = '';
        return;
    }

    const q = query.toLowerCase();
    const matches = allNodes
        .filter(n => n.label.toLowerCase().includes(q))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20);

    container.innerHTML = matches.map(n => `
        <div class="neighbor-item" data-node="${esc(n.id)}">
            <div class="ni-label" style="color:${typeColor(n.type)}">${esc(n.label)}</div>
            <div class="ni-meta">${n.type} freq=${n.frequency} community=${n.modularity_class}</div>
        </div>
    `).join('');

    container.querySelectorAll('.neighbor-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.node;
            selectNode(id);
            focusNode(id);
            document.getElementById('search-input').value = '';
            container.innerHTML = '';
        });
    });
}

// --- Node detail ---
function renderNodeDetail() {
    const panel = document.getElementById('node-detail');
    if (!selectedNode) {
        panel.className = '';
        panel.innerHTML = '';
        return;
    }

    const attrs = graph.getNodeAttributes(selectedNode);
    panel.className = 'active';
    panel.innerHTML = `
        <div class="detail-label">${esc(attrs.label)}</div>
        <div class="detail-meta">FREQUENCY: ${attrs.frequency}</div>
        <div class="detail-badge" style="background:${typeColor(attrs.entityType)};color:#000">${attrs.entityType}</div>
        <div class="detail-badge" style="background:${communityColor(attrs.modularity_class)};color:#000">COMMUNITY ${attrs.modularity_class}</div>
        <div class="detail-meta" style="margin-top:6px">
            COMMUNITY SIZE: ${attrs.community_nodes} nodes, ${attrs.community_edges} edges
        </div>
    `;
}

// --- Neighbor list ---
function renderNeighborList() {
    const container = document.getElementById('neighbor-list');
    if (!selectedNode) {
        container.innerHTML = '';
        return;
    }

    const neighbors = [];
    graph.forEachEdge(selectedNode, (edge, edgeAttrs, source, target) => {
        const neighborId = source === selectedNode ? target : source;
        const neighborAttrs = graph.getNodeAttributes(neighborId);
        neighbors.push({
            id: neighborId,
            label: neighborAttrs.label,
            type: neighborAttrs.entityType,
            frequency: neighborAttrs.frequency,
            weight: edgeAttrs.weight,
            semantic: edgeAttrs.semantic,
            context: edgeAttrs.context || '',
            filename: edgeAttrs.filename || '',
        });
    });

    // Sort by weight descending
    neighbors.sort((a, b) => b.weight - a.weight);

    container.innerHTML = `
        <div class="neighbor-header">CONNECTIONS (${neighbors.length})</div>
        ${neighbors.map(n => `
            <div class="neighbor-item" data-node="${esc(n.id)}">
                <div class="ni-label" style="color:${typeColor(n.type)}">${esc(n.label)}</div>
                <div class="ni-meta">
                    ${n.type} wt=${n.weight} ${n.semantic ? 'SEMANTIC' : 'CO-OCCUR'}
                    ${n.filename ? '| ' + esc(n.filename.replace('.md', '').substring(0, 40)) : ''}
                </div>
                ${n.context ? `<div class="ni-context">${esc(n.context.substring(0, 150))}...</div>` : ''}
            </div>
        `).join('')}
    `;

    container.querySelectorAll('.neighbor-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.node;
            selectNode(id);
            focusNode(id);
        });
    });
}

// --- Summary panel ---
function renderSummary() {
    const title = document.getElementById('summary-title');
    const toggle = document.getElementById('summary-toggle');
    const body = document.getElementById('summary-body');

    if (summaryMode === 'type') {
        title.textContent = 'ENTITY TYPE';
        toggle.textContent = 'COMMUNITY';

        const counts = {};
        for (const n of allNodes) {
            counts[n.type] = (counts[n.type] || 0) + 1;
        }

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        body.innerHTML = sorted.map(([type, count]) => `
            <tr class="${filterTypes.has(type) ? 'selected' : ''}" data-type="${esc(type)}">
                <td><span class="color-dot" style="background:${typeColor(type)}"></span>${type}</td>
                <td>${count}</td>
            </tr>
        `).join('');

        body.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const t = tr.dataset.type;
                if (filterTypes.has(t)) {
                    filterTypes.delete(t);
                } else {
                    filterTypes.add(t);
                }
                filterCommunity = null;
                renderer.refresh();
                renderSummary();
                updateStats();
            });
        });
    } else {
        title.textContent = 'COMMUNITY';
        toggle.textContent = 'ENTITY TYPE';

        const counts = {};
        for (const n of allNodes) {
            counts[n.modularity_class] = (counts[n.modularity_class] || 0) + 1;
        }

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        body.innerHTML = sorted.map(([cls, count]) => {
            const c = parseInt(cls);
            return `
                <tr class="${filterCommunity === c ? 'selected' : ''}" data-community="${c}">
                    <td><span class="color-dot" style="background:${communityColor(c)}"></span>${c}</td>
                    <td>${count}</td>
                </tr>
            `;
        }).join('');

        body.querySelectorAll('tr').forEach(tr => {
            tr.addEventListener('click', () => {
                const c = parseInt(tr.dataset.community);
                filterCommunity = filterCommunity === c ? null : c;
                filterTypes.clear();
                renderer.refresh();
                renderSummary();
                updateStats();
            });
        });
    }
}

// --- Tooltip ---
function showTooltip(nodeId) {
    const attrs = graph.getNodeAttributes(nodeId);
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `
        <div class="tooltip-title">${esc(attrs.label)}</div>
        <div class="tooltip-meta">${attrs.entityType} | freq: ${attrs.frequency} | deg: ${graph.degree(nodeId)}</div>
        <div class="tooltip-badge" style="background:${communityColor(attrs.modularity_class)};color:#000">
            COMMUNITY ${attrs.modularity_class}
        </div>
    `;
    tooltip.style.display = 'block';
}

function positionTooltip(x, y) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.left = (x + 15) + 'px';
    tooltip.style.top = (y + 15) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

// --- Camera ---
function focusNode(nodeId) {
    if (!renderer || !graph.hasNode(nodeId)) return;
    const attrs = graph.getNodeAttributes(nodeId);
    renderer.getCamera().animate(
        { x: attrs.x, y: attrs.y, ratio: 0.15 },
        { duration: 400 }
    );
}

// --- Util ---
function esc(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

init();
