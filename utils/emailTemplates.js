const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
const day = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const base = () => process.env.APP_URL || "http://localhost:8000";

function layout(heading, bodyHtml, button) {
    const btn = button
        ? `<p style="margin:24px 0 0;"><a href="${button.url}" style="background:#fe424d;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;">${button.label}</a></p>`
        : "";
    return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222222;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
<div style="color:#fe424d;font-size:22px;font-weight:bold;margin-bottom:16px;">WanderLust</div>
<h2 style="margin:0 0 12px;font-size:20px;">${heading}</h2>
${bodyHtml}${btn}
</div></body></html>`;
}

function details(pairs) {
    const rows = pairs
        .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#777777;">${esc(k)}</td><td style="padding:6px 0;">${esc(v)}</td></tr>`)
        .join("");
    return `<table style="border-collapse:collapse;margin:12px 0;">${rows}</table>`;
}

module.exports.welcome = ({ username }) => ({
    subject: "Welcome to WanderLust!",
    html: layout(
        `Welcome, ${esc(username)}!`,
        "<p>Your account is ready. Browse stays around the world, or list your own place.</p>",
        { url: `${base()}/listings`, label: "Start exploring" }
    ),
    text: `Welcome to WanderLust, ${username}!\n\nYour account is ready. Start exploring: ${base()}/listings`,
});

module.exports.bookingConfirmed = (b) => ({
    subject: `Booking confirmed: ${b.title}`,
    html: layout(
        "Your booking is confirmed",
        `<p>Hi ${esc(b.guestName)}, your payment went through and your stay is booked.</p>` +
        details([
            ["Stay", b.title],
            ["Where", `${b.location}, ${b.country}`],
            ["Check-in", day(b.checkIn)],
            ["Check-out", day(b.checkOut)],
            ["Nights", String(b.nights)],
            ["Guests", String(b.guests)],
            ["Total paid", money(b.total)],
        ]),
        { url: `${base()}/my-trips`, label: "View my trips" }
    ),
    text: `Your booking is confirmed\n\n${b.title} (${b.location}, ${b.country})\nCheck-in: ${day(b.checkIn)}\nCheck-out: ${day(b.checkOut)}\nNights: ${b.nights}\nGuests: ${b.guests}\nTotal paid: ${money(b.total)}\n\nView your trips: ${base()}/my-trips`,
});

module.exports.newBookingForHost = (b) => ({
    subject: `New booking for ${b.title}`,
    html: layout(
        "You have a new booking",
        `<p>Hi ${esc(b.hostName)}, ${esc(b.guestName)} just booked your listing.</p>` +
        details([
            ["Listing", b.title],
            ["Guest", b.guestName],
            ["Check-in", day(b.checkIn)],
            ["Check-out", day(b.checkOut)],
            ["Nights", String(b.nights)],
            ["Guests", String(b.guests)],
            ["Total", money(b.total)],
        ]),
        { url: `${base()}/host/bookings`, label: "View my bookings" }
    ),
    text: `You have a new booking\n\n${b.guestName} booked ${b.title}\nCheck-in: ${day(b.checkIn)}\nCheck-out: ${day(b.checkOut)}\nNights: ${b.nights}\nGuests: ${b.guests}\nTotal: ${money(b.total)}\n\nView your bookings: ${base()}/host/bookings`,
});