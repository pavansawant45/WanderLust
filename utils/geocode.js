// Turns "Pune" + "India" into a GeoJSON point using OpenStreetMap's Nominatim.
// Returns null if anything goes wrong, so a failed lookup never blocks a listing.
module.exports = async function geocode(location, country) {
    const parts = [location, country].filter(Boolean);
    if (!parts.length) return null;

    // "Costa Rica, Costa Rica" can match a town of that name instead of the country,
    // so when both are the same, search for the name once
    const sameName = parts.length === 2 && parts[0].trim().toLowerCase() === parts[1].trim().toLowerCase();
    const query = sameName ? parts[0].trim() : parts.join(", ");

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

    try {
        const res = await fetch(url, {
            headers: {
                // Nominatim requires an identifying User-Agent
                "User-Agent": "WanderLust-student-project (github.com/pavansawant45/WanderLust)",
                "Accept-Language": "en",
            },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;

        const data = await res.json();
        if (!data.length) return null;

        return {
            type: "Point",
            coordinates: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
        };
    } catch (err) {
        return null;
    }
};