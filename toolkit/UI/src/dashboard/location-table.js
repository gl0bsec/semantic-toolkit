export function renderLocationTable(tbody, filteredData, countryLookup, africanCountries, africanOnly, selectedLocation) {
    const filteredLocationMentions = {};
    filteredData.forEach(entry => {
        (entry.locations || []).forEach(code => {
            filteredLocationMentions[code] = (filteredLocationMentions[code] || 0) + 1;
        });
    });

    let locations = Object.keys(filteredLocationMentions)
        .map(code => ({
            code,
            name: countryLookup[code] || 'Unknown',
            count: filteredLocationMentions[code],
        }))
        .sort((a, b) => b.count - a.count);

    if (africanOnly) {
        locations = locations.filter(loc => africanCountries.has(loc.code));
    }

    if (locations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #666;">No data</td></tr>';
        return;
    }

    tbody.innerHTML = locations.map(loc => `
        <tr data-location="${loc.code}" class="${selectedLocation === loc.code ? 'selected' : ''}">
          <td><strong>${loc.code}</strong></td>
          <td>${escapeHtml(loc.name)}</td>
          <td class="numeric">${loc.count}</td>
        </tr>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
