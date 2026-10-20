const geocode = require("../utils/geocode");

const realFetch = global.fetch;
afterAll(() => {
    global.fetch = realFetch;
});

describe("geocode", () => {
    it("returns a GeoJSON point as [longitude, latitude]", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ lat: "18.5204", lon: "73.8567" }],
        });
        const result = await geocode("Pune", "India");
        expect(result).toEqual({ type: "Point", coordinates: [73.8567, 18.5204] });
    });

    it("sends a User-Agent, which Nominatim requires", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
        await geocode("Pune", "India");
        expect(global.fetch.mock.calls[0][1].headers["User-Agent"]).toBeDefined();
    });

    it("returns null when nothing is found", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
        expect(await geocode("Nowhereville", "Nowhere")).toBeNull();
    });

    it("returns null when the service answers with an error", async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false });
        expect(await geocode("Pune", "India")).toBeNull();
    });

    it("returns null when the network fails", async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error("network down"));
        expect(await geocode("Pune", "India")).toBeNull();
    });
});