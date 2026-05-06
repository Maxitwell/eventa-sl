import nodemailer from 'nodemailer';

const ticketsTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_TICKETS_USER || process.env.SMTP_USER,
        pass: process.env.SMTP_TICKETS_PASS || process.env.SMTP_PASS,
    },
});

const supportTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_SUPPORT_USER || process.env.SMTP_USER,
        pass: process.env.SMTP_SUPPORT_PASS || process.env.SMTP_PASS,
    },
});

export async function sendTicketEmail(
    guestEmail: string,
    guestName: string,
    eventName: string,
    qrCodeDataUrl: string,
    opts: {
        orderId?: string;
        eventDate?: string;
        eventTime?: string;
        location?: string;
        ticketType?: string;
        ticketId?: string;
    } = {}
) {
    if (!(process.env.SMTP_TICKETS_USER || process.env.SMTP_USER) || !(process.env.SMTP_TICKETS_PASS || process.env.SMTP_PASS)) {
        console.error("Missing SMTP credentials in .env.local");
        return false;
    }

    const qrBase64 = qrCodeDataUrl.split(',')[1];
    const firstName = guestName ? guestName.split(' ')[0] : 'there';
    const orderRef = opts.orderId ? opts.orderId.slice(-8).toUpperCase() : '';
    const ticketCode = opts.ticketId ? opts.ticketId.slice(-12).toUpperCase() : '';
    const venueParts = (opts.location || '').split(',');
    const venueName = venueParts[0].trim();
    const venueAddress = venueParts.slice(1).join(',').trim();
    const ticketUrl = 'https://eventa.africa/tickets';
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventName)}${opts.location ? `&location=${encodeURIComponent(opts.location)}` : ''}`;
    const icalUrl = ticketUrl; // Apple Calendar: user clicks through to ticket page
    const supportPhone = process.env.SUPPORT_WHATSAPP_NUMBER || '23279000000';
    const supportPhoneDisplay = process.env.SUPPORT_WHATSAPP_DISPLAY || '+232 79 000 000';

    const htmlContent = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Your Eventa ticket</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a { text-decoration: none; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .px-mobile { padding-left: 24px !important; padding-right: 24px !important; }
      .qr-mobile { width: 220px !important; height: 220px !important; }
      .h1-mobile { font-size: 26px !important; line-height: 1.15 !important; }
      .footer-stack { display: block !important; width: 100% !important; text-align: left !important; padding-top: 8px !important; }
      .header-meta { display: none !important; }
    }
    @media (prefers-color-scheme: dark) {
      .auto-dark-bg { background-color: #1a1a1a !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EB;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#F5F1EB;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your pass for ${eventName}${opts.eventDate ? ' on ' + opts.eventDate : ''}. Show the QR at the door &mdash; no app needed.
  </div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F5F1EB;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(20,20,20,0.06);">
          <tr>
            <td style="background-color:#141414;padding:24px 40px;" class="px-mobile">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="left" style="font-family:'Fraunces',Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#FFFFFF;letter-spacing:-0.02em;">
                    eventa<span style="color:#E2552C;">.</span>
                  </td>
                  <td align="right" class="header-meta" style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:500;color:#888888;letter-spacing:0.14em;text-transform:uppercase;">
                    Ticket Confirmation
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0F7A4F;padding:14px 40px;" class="px-mobile">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:#FFFFFF;font-weight:500;letter-spacing:-0.005em;">
                    &#10003;&nbsp; Payment received
                  </td>
                  <td align="right" style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.82);font-variant-numeric:tabular-nums;">
                    ${orderRef ? '#' + orderRef : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 0 40px;" class="px-mobile">
              <p style="margin:0 0 10px 0;font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:#7A7A7A;font-weight:400;">
                Hi ${firstName},
              </p>
              <h1 class="h1-mobile" style="margin:0;font-family:'Fraunces',Georgia,'Times New Roman',serif;font-size:32px;line-height:1.12;color:#141414;font-weight:600;letter-spacing:-0.025em;">
                You're going to<br>
                <span style="color:#E2552C;">${eventName}</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0 40px;" class="px-mobile">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #ECE5DA;border-radius:12px;background-color:#FCFAF6;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      ${opts.eventDate ? `<tr>
                        <td style="padding-bottom:14px;border-bottom:1px solid #ECE5DA;">
                          <div style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#9A9A9A;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;margin-bottom:4px;">When</div>
                          <div style="font-family:'DM Sans',Arial,sans-serif;font-size:15px;color:#141414;font-weight:500;line-height:1.4;">${opts.eventDate}${opts.eventTime ? ' &middot; ' + opts.eventTime : ''}</div>
                        </td>
                      </tr>` : ''}
                      ${venueName ? `<tr>
                        <td style="padding:14px 0;border-bottom:1px solid #ECE5DA;">
                          <div style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#9A9A9A;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;margin-bottom:4px;">Where</div>
                          <div style="font-family:'DM Sans',Arial,sans-serif;font-size:15px;color:#141414;font-weight:500;line-height:1.4;">${venueName}</div>
                          ${venueAddress ? `<div style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#7A7A7A;margin-top:2px;line-height:1.4;">${venueAddress}</div>` : ''}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding-top:14px;">
                          <div style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#9A9A9A;text-transform:uppercase;letter-spacing:0.12em;font-weight:600;margin-bottom:4px;">Ticket</div>
                          <div style="font-family:'DM Sans',Arial,sans-serif;font-size:15px;color:#141414;font-weight:500;line-height:1.4;">${opts.ticketType || 'General Admission'} &times; 1</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0 40px;" class="px-mobile">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#141414;border-radius:16px;">
                <tr>
                  <td align="center" style="padding:36px 24px 32px 24px;">
                    <div style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#E2552C;text-transform:uppercase;letter-spacing:0.18em;font-weight:600;margin-bottom:22px;">
                      Your digital pass
                    </div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF;border-radius:12px;">
                      <tr>
                        <td align="center" style="padding:20px;">
                          <img src="cid:qrcode@eventa" alt="Ticket QR code" width="240" height="240" class="qr-mobile" style="display:block;width:240px;height:240px;border:0;">
                        </td>
                      </tr>
                    </table>
                    <div style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.78);margin-top:22px;font-weight:500;">
                      Show this at the door
                    </div>
                    ${ticketCode ? `<div style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.42);margin-top:6px;font-variant-numeric:tabular-nums;letter-spacing:0.1em;">${ticketCode}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0 40px;" class="px-mobile">
              <h2 style="margin:0 0 18px 0;font-family:'Fraunces',Georgia,'Times New Roman',serif;font-size:20px;color:#141414;font-weight:600;letter-spacing:-0.015em;">At the door</h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td valign="top" style="width:36px;padding-bottom:14px;">
                    <div style="width:26px;height:26px;background-color:#FBE9DF;color:#E2552C;border-radius:50%;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:600;text-align:center;line-height:26px;">1</div>
                  </td>
                  <td style="padding-bottom:14px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:#3A3A3A;line-height:1.55;">
                    <strong style="color:#141414;">Open this email</strong> &mdash; or your WhatsApp message. The QR works from either.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="width:36px;padding-bottom:14px;">
                    <div style="width:26px;height:26px;background-color:#FBE9DF;color:#E2552C;border-radius:50%;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:600;text-align:center;line-height:26px;">2</div>
                  </td>
                  <td style="padding-bottom:14px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:#3A3A3A;line-height:1.55;">
                    <strong style="color:#141414;">Brighten your screen</strong> so the scanner can read it clearly, even in low light.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="width:36px;">
                    <div style="width:26px;height:26px;background-color:#FBE9DF;color:#E2552C;border-radius:50%;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:600;text-align:center;line-height:26px;">3</div>
                  </td>
                  <td style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:#3A3A3A;line-height:1.55;">
                    <strong style="color:#141414;">Scan once and you're in.</strong> Each pass works for a single entry.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:32px 40px 0 40px;" class="px-mobile">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:10px;background-color:#E2552C;">
                    <a href="${ticketUrl}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;color:#FFFFFF;text-decoration:none;font-weight:600;border-radius:10px;letter-spacing:-0.005em;">
                      View ticket online &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#7A7A7A;margin-top:14px;">
                Add to calendar &middot;
                <a href="${gcalUrl}" style="color:#E2552C;text-decoration:none;font-weight:500;">Google</a>
                &middot;
                <a href="${icalUrl}" style="color:#E2552C;text-decoration:none;font-weight:500;">Apple</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0 40px;" class="px-mobile">
              <div style="border-top:1px solid #ECE5DA;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;" class="px-mobile">
              <p style="margin:0;font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#7A7A7A;line-height:1.65;">
                <strong style="color:#141414;font-weight:600;">Need help?</strong> Reply to this email or message us on WhatsApp at
                <a href="https://wa.me/${supportPhone}" style="color:#E2552C;text-decoration:none;font-weight:600;">${supportPhoneDisplay}</a>. We'll resend or fix it within minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FAF6F0;padding:24px 40px;border-top:1px solid #ECE5DA;" class="px-mobile">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td class="footer-stack" style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#9A9A9A;line-height:1.55;">
                    Eventa Africa &middot; Bluerain Technologies Ltd<br>
                    Freetown, Sierra Leone
                  </td>
                  <td align="right" class="footer-stack" style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:#9A9A9A;">
                    <a href="https://eventa.africa" style="color:#9A9A9A;text-decoration:none;">eventa.africa</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="max-width:600px;margin-top:16px;">
          <tr>
            <td align="center" style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:#9A9A9A;line-height:1.55;padding:0 16px;">
              You received this because you bought a ticket on eventa.africa.<br>
              &copy; 2026 Eventa Africa. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
        await ticketsTransporter.sendMail({
            from: `"Eventa Tickets" <${process.env.SMTP_TICKETS_USER || process.env.SMTP_USER || 'tickets@eventa.africa'}>`,
            to: guestEmail,
            subject: `Your Ticket for ${eventName}`,
            html: htmlContent,
            attachments: [{
                filename: 'ticket-qr.png',
                content: Buffer.from(qrBase64, 'base64'),
                contentType: 'image/png',
                cid: 'qrcode@eventa',
            }],
        });
        console.log(`[Email Delivery] Ticket successfully sent to ${guestEmail}`);
        return true;
    } catch (error) {
        console.error(`[Email Delivery Error] Failed to send to ${guestEmail}:`, error);
        return false;
    }
}

export async function sendRefundEmail(
    recipientEmail: string,
    recipientName: string,
    eventName: string,
    amountRefunded: number,
    currency = "Le"
) {
    if (!(process.env.SMTP_TICKETS_USER || process.env.SMTP_USER) || !(process.env.SMTP_TICKETS_PASS || process.env.SMTP_PASS)) {
        console.error("Missing SMTP credentials for refund email");
        return false;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #111827; padding: 20px; text-align: center;">
                <h1 style="color: #f97316; margin: 0; font-size: 24px;">EVENTA SL</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Hi ${recipientName || 'there'},</h2>
                <p style="color: #4b5563; line-height: 1.6;">Your refund for <strong>${eventName}</strong> has been successfully processed.</p>
                <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
                    <p style="color: #166534; font-size: 28px; font-weight: bold; margin: 0;">${currency} ${amountRefunded.toLocaleString()}</p>
                    <p style="color: #4b5563; font-size: 12px; margin: 8px 0 0;">has been returned to your mobile money account</p>
                </div>
                <p style="color: #4b5563; line-height: 1.6;">Please allow up to 24 hours for the funds to reflect. If you have any questions, reply to this email.</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
                © 2026 Eventa Africa. All rights reserved.
            </div>
        </div>
    `;

    try {
        await ticketsTransporter.sendMail({
            from: `"Eventa Tickets" <${process.env.SMTP_TICKETS_USER || process.env.SMTP_USER || 'tickets@eventa.africa'}>`,
            to: recipientEmail,
            subject: `Refund Confirmed: ${eventName}`,
            html: htmlContent,
        });
        console.log(`[Email Delivery] Refund email sent to ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error(`[Email Delivery Error] Failed to send refund email to ${recipientEmail}:`, error);
        return false;
    }
}

export async function sendPayoutNotificationEmail(
    organizerEmail: string,
    organizerName: string,
    eventName: string,
    amount: number,
    status: "settled" | "failed",
    currency = "Le"
) {
    if (!(process.env.SMTP_SUPPORT_USER || process.env.SMTP_USER) || !(process.env.SMTP_SUPPORT_PASS || process.env.SMTP_PASS)) {
        console.error("Missing SMTP credentials for payout notification email");
        return false;
    }

    const isSettled = status === "settled";
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #111827; padding: 20px; text-align: center;">
                <h1 style="color: #f97316; margin: 0; font-size: 24px;">EVENTA SL</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Hi ${organizerName || 'there'},</h2>
                <p style="color: #4b5563; line-height: 1.6;">
                    Your payout for <strong>${eventName}</strong> has <strong>${isSettled ? 'been successfully sent' : 'failed to process'}</strong>.
                </p>
                <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: ${isSettled ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${isSettled ? '#86efac' : '#fca5a5'}; border-radius: 8px;">
                    <p style="color: ${isSettled ? '#166534' : '#991b1b'}; font-size: 28px; font-weight: bold; margin: 0;">${currency} ${amount.toLocaleString()}</p>
                    <p style="color: #4b5563; font-size: 12px; margin: 8px 0 0;">${isSettled ? 'sent to your mobile money account' : 'payout failed — contact support'}</p>
                </div>
                ${!isSettled ? `<p style="color: #4b5563; line-height: 1.6;">Please contact <a href="mailto:support@eventa.africa" style="color: #f97316;">support@eventa.africa</a> to resolve this.</p>` : ''}
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
                © 2026 Eventa Africa. All rights reserved.
            </div>
        </div>
    `;

    try {
        await supportTransporter.sendMail({
            from: `"Eventa Support" <${process.env.SMTP_SUPPORT_USER || process.env.SMTP_USER || 'support@eventa.africa'}>`,
            to: organizerEmail,
            subject: `Payout ${isSettled ? 'Received' : 'Failed'}: ${eventName}`,
            html: htmlContent,
        });
        console.log(`[Email Delivery] Payout notification sent to ${organizerEmail}`);
        return true;
    } catch (error) {
        console.error(`[Email Delivery Error] Failed to send payout email to ${organizerEmail}:`, error);
        return false;
    }
}

export async function sendEventReminderEmail(
    recipientEmail: string,
    recipientName: string,
    eventName: string,
    eventDate: string,
    eventTime: string,
    eventLocation: string,
    qrCodeDataUrl: string
) {
    if (!(process.env.SMTP_TICKETS_USER || process.env.SMTP_USER) || !(process.env.SMTP_TICKETS_PASS || process.env.SMTP_PASS)) {
        console.error("Missing SMTP credentials for reminder email");
        return false;
    }

    const qrBase64 = qrCodeDataUrl.split(',')[1];
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #111827; padding: 20px; text-align: center;">
                <h1 style="color: #f97316; margin: 0; font-size: 24px;">EVENTA SL</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Hey ${recipientName || 'there'} — it's almost time! 🎉</h2>
                <p style="color: #4b5563; line-height: 1.6;">
                    <strong>${eventName}</strong> is happening <strong>tomorrow</strong>. Here's your ticket — have it ready at the door.
                </p>
                <div style="margin: 24px 0; padding: 20px; background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
                    <p style="margin: 0 0 6px; font-size: 13px; color: #92400e; font-weight: bold;">📅 ${eventDate} at ${eventTime}</p>
                    <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: bold;">📍 ${eventLocation}</p>
                </div>
                <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="text-transform: uppercase; color: #6b7280; font-size: 12px; font-weight: bold; margin-top: 0;">Your Ticket — Scan at the Door</p>
                    <img src="cid:qrcode@eventa" alt="Ticket QR Code" style="width: 200px; height: 200px; border-radius: 8px;" />
                </div>
                <p style="color: #4b5563; line-height: 1.6; text-align: center;">See you there!</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
                © 2026 Eventa Africa. All rights reserved.
            </div>
        </div>
    `;

    try {
        await ticketsTransporter.sendMail({
            from: `"Eventa Tickets" <${process.env.SMTP_TICKETS_USER || process.env.SMTP_USER || 'tickets@eventa.africa'}>`,
            to: recipientEmail,
            subject: `See you tomorrow at ${eventName}! 🎟️`,
            html: htmlContent,
            attachments: [{
                filename: 'ticket-qr.png',
                content: Buffer.from(qrBase64, 'base64'),
                contentType: 'image/png',
                cid: 'qrcode@eventa',
            }],
        });
        console.log(`[Email Delivery] Reminder sent to ${recipientEmail}`);
        return true;
    } catch (error) {
        console.error(`[Email Delivery Error] Failed to send reminder to ${recipientEmail}:`, error);
        return false;
    }
}

export async function sendSignupEmail(userEmail: string, userName: string) {
    if (!(process.env.SMTP_SUPPORT_USER || process.env.SMTP_USER) || !(process.env.SMTP_SUPPORT_PASS || process.env.SMTP_PASS)) {
        console.error("Missing SMTP credentials for support emails in .env.local");
        return false;
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #111827; padding: 20px; text-align: center;">
                <h1 style="color: #f97316; margin: 0; font-size: 24px;">Welcome to EVENTA SL</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Hi ${userName},</h2>
                <p style="color: #4b5563; line-height: 1.6;">Thank you for joining the Eventa platform. Your account has been successfully created.</p>
                <p style="color: #4b5563; line-height: 1.6;">You can now purchase tickets, build events, and experience the best of Sierra Leone.</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
                © 2026 Eventa Africa. All rights reserved.
            </div>
        </div>
    `;

    try {
        await supportTransporter.sendMail({
            from: `"Eventa Support" <${process.env.SMTP_SUPPORT_USER || process.env.SMTP_USER || 'support@eventa.africa'}>`,
            to: userEmail,
            subject: `Welcome to Eventa!`,
            html: htmlContent,
        });
        console.log(`[Email Delivery] Signup confirmation sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error(`[Email Delivery Error] Failed to send signup email to ${userEmail}:`, error);
        return false;
    }
}
