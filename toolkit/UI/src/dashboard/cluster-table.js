export function renderClusterTable(tbody, filteredData, clusterData, selectedCluster) {
    const filteredClusterCounts = {};
    filteredData.forEach(entry => {
        filteredClusterCounts[entry.cluster] = (filteredClusterCounts[entry.cluster] || 0) + 1;
    });

    const clusters = Object.keys(filteredClusterCounts).map(id => ({
        id: parseInt(id),
        count: filteredClusterCounts[id],
        centroid: clusterData[id]?.centroid || [0, 0, 0],
    }));

    if (clusters.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #666;">No data</td></tr>';
        return;
    }

    // Calculate avg distance to other cluster centroids
    clusters.forEach(cluster => {
        const distances = clusters
            .filter(c => c.id !== cluster.id)
            .map(c => euclideanDistance(cluster.centroid, c.centroid));
        cluster.avgDistance = distances.length > 0
            ? distances.reduce((sum, d) => sum + d, 0) / distances.length
            : 0;
    });

    clusters.sort((a, b) => a.avgDistance - b.avgDistance);

    tbody.innerHTML = clusters.map(cluster => `
        <tr data-cluster="${cluster.id}" class="${selectedCluster === cluster.id ? 'selected' : ''}">
          <td><strong>Cluster ${cluster.id}</strong></td>
          <td class="numeric">${cluster.count}</td>
          <td class="numeric">${cluster.avgDistance.toFixed(2)}</td>
        </tr>
    `).join('');
}

function euclideanDistance(v1, v2) {
    return Math.sqrt(
        Math.pow(v1[0] - v2[0], 2) +
        Math.pow(v1[1] - v2[1], 2) +
        Math.pow(v1[2] - v2[2], 2)
    );
}
