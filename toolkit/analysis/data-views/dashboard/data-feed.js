export function renderDataFeed(container, filteredData, countryLookup, selectedCluster) {
    const sortedData = [...filteredData].sort((a, b) => {
        const da = parseDate(a.dateStr);
        const db = parseDate(b.dateStr);
        return db - da;
    });

    if (sortedData.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No data</div>';
        return;
    }

    container.innerHTML = sortedData.map((item, idx) => {
        const locationNames = (item.locations || [])
            .map(loc => countryLookup[loc] || loc)
            .join(', ');

        const clusterLabel = item.cluster === -1 ? 'OUTLIER' : `Cluster ${item.cluster}`;

        return `
          <div class="feed-item" data-index="${idx}" data-cluster="${item.cluster}">
            <div class="feed-item-title">${escapeHtml(item.title)}</div>
            <div class="feed-item-meta">
              <strong>Date:</strong> ${item.dateStr} |
              <strong>Type:</strong> ${item.type} |
              <strong>Locations:</strong> ${locationNames || 'N/A'}
            </div>
            <div class="feed-item-cluster">${clusterLabel}</div>
          </div>
        `;
    }).join('');
}

function parseDate(dateStr) {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
    return new Date(0);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
