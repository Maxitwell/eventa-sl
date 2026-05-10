require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST || 'smtp.zoho.com';
const user = process.env.SMTP_TICKETS_USER || process.env.SMTP_USER;
const pass = process.env.SMTP_TICKETS_PASS || process.env.SMTP_PASS;

console.log('--- SMTP Diagnostic ---');
console.log('Host:', host);
console.log('User:', user);
console.log('Pass set:', !!pass, '| Length:', pass?.length);
console.log('');

if (!user || !pass) {
  console.error('❌ SMTP credentials are missing!');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port: 465,
  secure: true,
  auth: { user, pass },
});

console.log('Verifying connection...');
transporter.verify((err, success) => {
  if (err) {
    console.error('❌ SMTP Connection FAILED:', err.message);
    console.error('   Code:', err.code);
    console.error('   Full error:', err);
  } else {
    console.log('✅ SMTP Connection SUCCESSFUL — server is ready to send mail!');
    console.log('Sending test email to:', user);
    
    transporter.sendMail({
      from: `"Eventa Test" <${user}>`,
      to: user,
      subject: 'Eventa SMTP Test ✅',
      html: '<p>If you see this, SMTP is working correctly!</p>',
    }, (sendErr, info) => {
      if (sendErr) {
        console.error('❌ Send FAILED:', sendErr.message);
      } else {
        console.log('✅ Test email sent! Message ID:', info.messageId);
      }
    });
  }
});
