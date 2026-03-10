export function getDataset() {
    return new URLSearchParams(window.location.search).get('dataset') || 'RU_AFR_EXPERIMENT';
}

export async function fetchConfig(dataset) {
    const res = await fetch(`/api/config?dataset=${dataset}`);
    if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
    return res.json();
}

export async function fetchLookup(dataset) {
    const res = await fetch(`/api/lookup?dataset=${dataset}`);
    if (!res.ok) throw new Error(`Failed to fetch lookup: ${res.status}`);
    return res.json();
}
