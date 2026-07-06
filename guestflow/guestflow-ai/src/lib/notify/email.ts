// Email notification abstraction.
//
// Provider is chosen by env, no code changes needed later:
//   EMAIL_PROVIDER=console  (default) → logs the email, perfect for dev
//   EMAIL_PROVIDER=resend   → real emails via Resend (needs RESEND_API_KEY, EMAIL_FROM)
//   EMAIL_PROVIDER=sendgrid → real emails via SendGrid (needs SENDGRID_API_KEY, EMAIL_FROM)

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendViaConsole(email: EmailPayload): Promise<void> {
  console.log(
    `\n[GuestFlow email → console]\nTo: ${email.to}\nSubject: ${email.subject}\n${email.text}\n`
  );
}

async function sendViaResend(email: EmailPayload): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "GuestFlow <onboarding@resend.dev>",
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

async function sendViaSendgrid(email: EmailPayload): Promise<void> {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: email.to }] }],
      from: { email: process.env.EMAIL_FROM || "noreply@example.com", name: "GuestFlow AI" },
      subject: email.subject,
      content: [
        { type: "text/plain", value: email.text },
        { type: "text/html", value: email.html },
      ],
    }),
  });
  if (!res.ok) throw new Error(`SendGrid error ${res.status}: ${await res.text()}`);
}

/**
 * Sends an email through the configured provider.
 * NEVER throws — notification failure must not break the guest flow.
 */
export async function sendEmail(email: EmailPayload): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER || "console";
  try {
    if (provider === "resend" && process.env.RESEND_API_KEY) {
      await sendViaResend(email);
    } else if (provider === "sendgrid" && process.env.SENDGRID_API_KEY) {
      await sendViaSendgrid(email);
    } else {
      await sendViaConsole(email);
    }
  } catch (err) {
    console.error("Email notification failed:", err);
  }
}

/** Builds the "new guest request" notification for the owner. */
export function buildRequestEmail(opts: {
  to: string;
  propertyName: string;
  category: string;
  message: string;
  dashboardUrl: string;
}): EmailPayload {
  const subject = `🔔 Νέο αίτημα επισκέπτη — ${opts.propertyName}`;
  const text = `Νέο αίτημα επισκέπτη στο "${opts.propertyName}"

Κατηγορία: ${opts.category}
Μήνυμα: "${opts.message}"

Διαχείριση: ${opts.dashboardUrl}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
      <div style="background:#0E2A3B;color:#FAF8F2;padding:20px 24px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:18px">Νέο αίτημα επισκέπτη</h2>
        <p style="margin:4px 0 0;opacity:.7;font-size:13px">${opts.propertyName}</p>
      </div>
      <div style="border:1px solid #e5e0d5;border-top:0;padding:20px 24px;border-radius:0 0 12px 12px">
        <p style="margin:0 0 6px;font-size:13px;color:#666">Κατηγορία: <b>${opts.category}</b></p>
        <p style="background:#F1EADB;padding:12px 16px;border-radius:8px;font-size:15px;margin:0 0 16px">"${opts.message}"</p>
        <a href="${opts.dashboardUrl}" style="display:inline-block;background:#1D63A8;color:#fff;text-decoration:none;padding:10px 20px;border-radius:999px;font-size:14px">Άνοιγμα αιτημάτων</a>
      </div>
    </div>`;
  return { to: opts.to, subject, html, text };
}
