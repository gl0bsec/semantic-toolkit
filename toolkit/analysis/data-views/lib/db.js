export async function loadDataset(dataset) {
    const response = await fetch(`/api/data?dataset=${dataset}`);
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`);
    return response.json();
}
