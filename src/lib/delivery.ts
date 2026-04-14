import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendTicketEmail(guestEmail: string, guestName: string, eventName: string, qrCodeDataUrl: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("Missing SMTP credentials in .env.local");
        return false;
    }

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
                    <img src="${qrCodeDataUrl}" alt="Ticket QR Code" style="width: 200px; height: 200px; border-radius: 8px;" />
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
        await transporter.sendMail({
            from: `"Eventa Tickets" <tickets@eventa.africa>`,
            to: guestEmail,
            subject: `Your Ticket for ${eventName}`,
            html: htmlContent,
        });
        console.log(`[Email Delivery] Ticket successfully sent to ${guestEmail}`);
        return true;
    } catch (error) {
        console.error(`[Email Delivery Error] Failed to send to ${guestEmail}:`, error);
        return false;
    }
}

export async function sendSignupEmail(userEmail: string, userName: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("Missing SMTP credentials in .env.local");
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
        await transporter.sendMail({
            from: `"Eventa Support" <support@eventa.africa>`,
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
