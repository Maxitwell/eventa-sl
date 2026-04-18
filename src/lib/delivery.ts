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

export async function sendTicketEmail(guestEmail: string, guestName: string, eventName: string, qrCodeDataUrl: string) {
    if (!(process.env.SMTP_TICKETS_USER || process.env.SMTP_USER) || !(process.env.SMTP_TICKETS_PASS || process.env.SMTP_PASS)) {
        console.error("Missing SMTP credentials in .env.local");
        return false;
    }

    const qrBase64 = qrCodeDataUrl.split(',')[1];
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #111827; padding: 20px; text-align: center;">
                <h1 style="color: #f97316; margin: 0; font-size: 24px;">EVENTA SL</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="color: #111827; font-size: 20px; margin-top: 0;">Hi ${guestName || 'there'},</h2>
                <p style="color: #4b5563; line-height: 1.6;">Your payment was successful! Here is your official digital pass for <strong>${eventName}</strong>.</p>

                <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                    <p style="text-transform: uppercase; color: #6b7280; font-size: 12px; font-weight: bold; margin-top: 0;">Scan at the Door</p>
                    <img src="cid:qrcode@eventa" alt="Ticket QR Code" style="width: 200px; height: 200px; border-radius: 8px;" />
                    <p style="color: #9ca3af; font-family: monospace; font-size: 10px; margin-bottom: 0;">SECURE CRYPTOGRAPHIC PAYLOAD</p>
                </div>

                <p style="color: #4b5563; line-height: 1.6; text-align: center;">See you at the event!</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
                © 2026 Eventa Africa. All rights reserved.
            </div>
        </div>
    `;

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
