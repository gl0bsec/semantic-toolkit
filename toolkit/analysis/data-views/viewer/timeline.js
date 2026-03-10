import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { max } from 'd3-array';

export function createViewerTimeline(container, { onWeekSelect }) {
    const svg = select(container).append('svg');
    let selectedWeek = null;

    const margin = { top: 4, right: 20, bottom: 20, left: 20 };

    function render(bins) {
        const { width, height } = container.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        const keys = Object.keys(bins).sort();
        if (keys.length === 0) return;

        const chartW = width - margin.left - margin.right;
        const chartH = height - margin.top - margin.bottom;

        const x = scaleBand().domain(keys).range([0, chartW]).padding(0.1);
        const maxCount = max(keys, k => bins[k]) || 1;
        const y = scaleLinear().domain([0, maxCount]).range([chartH, 0]);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // Bars
        g.selectAll('.bar')
            .data(keys)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', k => x(k))
            .attr('y', k => y(bins[k]))
            .attr('width', x.bandwidth())
            .attr('height', k => chartH - y(bins[k]))
            .attr('fill', k => k === selectedWeek ? '#ff6b6b' : '#4a90e2')
            .attr('cursor', 'pointer')
            .on('click', (e, k) => {
                selectedWeek = selectedWeek === k ? null : k;
                onWeekSelect(selectedWeek);
            });

        // Baseline
        g.append('line')
            .attr('x1', 0).attr('x2', chartW)
            .attr('y1', chartH).attr('y2', chartH)
            .attr('stroke', '#333').attr('stroke-width', 1);

        // Month labels
        let lastMonth = '';
        keys.forEach((key, i) => {
            const parts = key.split('-'); // YY-MM-DD
            const currentMonth = `${parts[1]}/${parts[0]}`;
            if (currentMonth !== lastMonth) {
                g.append('text')
                    .attr('x', x(key))
                    .attr('y', chartH + 12)
                    .attr('text-anchor', 'middle')
                    .style('font', '9px Courier New')
                    .style('fill', '#666')
                    .text(currentMonth);
                lastMonth = currentMonth;
            }
        });

        // Max count
        g.append('text')
            .attr('x', -4).attr('y', 8)
            .attr('text-anchor', 'end')
            .style('font', '9px Courier New')
            .style('fill', '#666')
            .text(maxCount);
    }

    function setSelected(week) {
        selectedWeek = week;
    }

    return { render, setSelected };
}
