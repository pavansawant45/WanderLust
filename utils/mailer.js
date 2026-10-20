const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

// Sends one email through Brevo. It never throws: email is a nice extra,
// so a failure is logged and the signup/booking carries on normally.
module.exports = async function sendMail({ to, toName, subject, html, text }) {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.MAIL_FROM_EMAIL;

    if (!apiKey || !fromEmail || !to) {
        return false;   // email isn't set up: the app still works without it
    }

    try {
        const res = await fetch(BREVO_URL, {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "content-type": "application/json",
                accept: "application/json",
            },
            body: JSON.stringify({
                sender: { name: process.env.MAIL_FROM_NAME || "WanderLust", email: fromEmail },
                to: [{ email: to, name: toName || undefined }],
                subject,
                htmlContent: html,
                textContent: text,
            }),
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            console.error(`Email not sent (Brevo answered ${res.status})`);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Email not sent:", err.message);
        return false;
    }
};