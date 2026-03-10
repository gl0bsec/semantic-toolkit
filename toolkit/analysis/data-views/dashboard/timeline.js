import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { stack, stackOrderNone, stackOffsetNone } from 'd3-shape';
import { max } from 'd3-array';
import { typeColors } from '../lib/colors.js';

export function createTimeline(container, { onWeekSelect }) {
    const svg = select(container).append('svg');
    let selectedWeek = null;

    const margin = { top: 10, right: 20, bottom: 56, left: 20 };

    function render(bins, stacked) {
        const { width, height } = container.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        const keys = Object.keys(bins).sort();
        if (keys.length === 0) return;

        const chartW = width - margin.left - margin.right;
        const chartH = height - margin.top - margin.bottom;

        const x = scaleBand().domain(keys).range([0, chartW]).padding(0.08);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        if (stacked) {
            renderStacked(g, bins, keys, x, chartW, chartH);
        } else {
            renderSimple(g, bins, keys, x, chartW, chartH);
        }

        // Baseline
        g.append('line')
            .attr('x1', 0).attr('x2', chartW)
            .attr('y1', chartH).attr('y2', chartH)
            .attr('stroke', '#ccc').attr('stroke-width', 1);

        // X-axis labels (every Nth)
        const labelInterval = Math.max(1, Math.floor(keys.length / 10));
        keys.forEach((key, i) => {
            if (i % labelInterval !== 0) return;
            g.append('text')
                .attr('x', x(key) + x.bandwidth() / 2)
                .attr('y', chartH + 12)
                .attr('text-anchor', 'end')
                .attr('transform', `rotate(-45, ${x(key) + x.bandwidth() / 2}, ${chartH + 12})`)
                .style('font', '9px Courier New')
                .style('fill', '#666')
                .text(key);
        });

        // Max count label
        const maxCount = stacked
            ? max(keys, k => Object.values(bins[k].types || {}).reduce((a, b) => a + b, 0))
            : max(keys, k => bins[k].count);
        g.append('text')
            .attr('x', -4).attr('y', 4)
            .attr('text-anchor', 'end')
            .style('font', '9px Courier New')
            .style('fill', '#666')
            .text(maxCount);
    }

    function renderSimple(g, bins, keys, x, chartW, chartH) {
        const maxCount = max(keys, k => bins[k].count) || 1;
        const y = scaleLinear().domain([0, maxCount]).range([chartH, 0]);

        g.selectAll('.bar')
            .data(keys)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', k => x(k))
            .attr('y', k => y(bins[k].count))
            .attr('width', x.bandwidth())
            .attr('height', k => chartH - y(bins[k].count))
            .attr('fill', k => k === selectedWeek ? '#ff6b6b' : '#000')
            .attr('cursor', 'pointer')
            .on('click', (e, k) => {
                selectedWeek = selectedWeek === k ? null : k;
                onWeekSelect(selectedWeek);
            });

        // Count labels on wide bars
        if (x.bandwidth() > 20) {
            g.selectAll('.count-label')
                .data(keys)
                .join('text')
                .attr('class', 'count-label')
                .attr('x', k => x(k) + x.bandwidth() / 2)
                .attr('y', k => y(bins[k].count) - 4)
                .attr('text-anchor', 'middle')
                .style('font', '9px Courier New')
                .style('fill', '#000')
                .text(k => bins[k].count);
        }
    }

    function renderStacked(g, bins, keys, x, chartW, chartH) {
        // Collect all types
        const typesSet = new Set();
        keys.forEach(k => {
            if (bins[k].types) Object.keys(bins[k].types).forEach(t => typesSet.add(t));
        });
        const types = Array.from(typesSet).sort();

        // Build data for d3.stack
        const stackData = keys.map(k => {
            const row = { key: k };
            types.forEach(t => { row[t] = bins[k].types?.[t] || 0; });
            return row;
        });

        const maxCount = max(stackData, d => types.reduce((s, t) => s + d[t], 0)) || 1;
        const y = scaleLinear().domain([0, maxCount]).range([chartH, 0]);

        const stackGen = stack().keys(types).order(stackOrderNone).offset(stackOffsetNone);
        const series = stackGen(stackData);

        series.forEach(s => {
            g.selectAll(`.bar-${s.key}`)
                .data(s)
                .join('rect')
                .attr('x', d => x(d.data.key))
                .attr('y', d => y(d[1]))
                .attr('width', x.bandwidth())
                .attr('height', d => y(d[0]) - y(d[1]))
                .attr('fill', typeColors[s.key] || '#999')
                .attr('opacity', d => d.data.key === selectedWeek ? 0.7 : 1)
                .attr('cursor', 'pointer')
                .on('click', (e, d) => {
                    const k = d.data.key;
                    selectedWeek = selectedWeek === k ? null : k;
                    onWeekSelect(selectedWeek);
                });
        });

        // Legend
        const legendX = chartW - 80;
        const legendY = 4;
        const lg = g.append('g').attr('transform', `translate(${legendX},${legendY})`);

        lg.append('rect')
            .attr('x', -8).attr('y', -4)
            .attr('width', 96).attr('height', types.length * 14 + 12)
            .attr('fill', 'rgba(255,255,255,0.92)')
            .attr('stroke', '#ccc');

        types.forEach((type, i) => {
            const row = lg.append('g').attr('transform', `translate(0,${i * 14})`);
            row.append('rect').attr('width', 10).attr('height', 10).attr('fill', typeColors[type] || '#999');
            row.append('text').attr('x', 14).attr('y', 9)
                .style('font', '9px Courier New').style('fill', '#000').text(type);
        });
    }

    function setSelected(week) {
        selectedWeek = week;
    }

    return { render, setSelected };
}
