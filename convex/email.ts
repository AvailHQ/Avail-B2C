// Transactional email via Resend (https://resend.com). Sending is best-effort:
// if RESEND_API_KEY is not configured we log and skip rather than failing the
// signup or webhook. Set RESEND_API_KEY and EMAIL_FROM in the Convex env.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Avail <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn('RESEND_API_KEY not set; skipping email to', to);
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error('Resend send failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Resend send threw', error);
    return false;
  }
}

function layout(body: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1B1F23;">
    <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#17333A;margin-bottom:24px;">Avail</div>
    ${body}
    <hr style="border:none;border-top:1px solid #e5eceb;margin:28px 0;" />
    <p style="font-size:12px;color:#8a969b;line-height:1.6;">
      You are receiving this because you signed up for Avail early access.
      Avail is a cycle-aware readiness app for women who train.
    </p>
  </div>`;
}

export function welcomeEmail(firstName: string): { subject: string; html: string } {
  return {
    subject: "You're on the Avail early access list",
    html: layout(`
      <p style="font-size:16px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:16px;line-height:1.6;">
        Thanks for joining the Avail early access list. You're in.
      </p>
      <p style="font-size:16px;line-height:1.6;">
        You can secure your place on the Founding Waitlist for a one-time
        &pound;3 and receive priority consideration for early access.
        Reservations are non-refundable, except where required by law.
      </p>
      <p style="font-size:16px;line-height:1.6;">We'll be in touch as launch gets closer.</p>
    `),
  };
}

export function paymentConfirmationEmail(firstName: string): { subject: string; html: string } {
  return {
    subject: 'Your Avail early access is reserved',
    html: layout(`
      <p style="font-size:16px;line-height:1.6;">Hi ${firstName},</p>
      <p style="font-size:16px;line-height:1.6;">
        Your &pound;3 Founding Waitlist reservation is confirmed. You'll receive
        priority consideration for early access and be among the first to hear
        about launch updates.
      </p>
      <p style="font-size:16px;line-height:1.6;">
        We'll email you with launch updates and the next steps for early access.
        Nothing else to do for now.
      </p>
      <p style="font-size:16px;line-height:1.6;">Thanks for backing Avail early.</p>
    `),
  };
}
