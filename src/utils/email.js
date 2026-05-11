/* ==============================================
   email.js  —  Mailjet REST API (no SMTP)
   Works on Render free tier because it uses
   HTTPS not SMTP ports (465/587).
   
   Required .env variables:
     MJ_APIKEY_PUBLIC=your_public_key
     MJ_APIKEY_PRIVATE=your_private_key
     MJ_SENDER=your_verified_sender@email.com
============================================== */

const https = require('https');

/* ── Low-level Mailjet REST call ── */
function mailjetSend(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const auth = Buffer.from(
      `${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`
    ).toString('base64');

    const options = {
      hostname: 'api.mailjet.com',
      path:     '/v3.1/send',
      method:   'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('EMAIL SENT via Mailjet:', res.statusCode);
            resolve(parsed);
          } else {
            console.error('Mailjet error:', data);
            reject(new Error(`Mailjet ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ── OTP Verification Email ── */
async function sendVerificationEmail(user, otp) {
  console.log(`📧 Sending OTP ${otp} to ${user.email}`);
  return mailjetSend({
    Messages: [{
      From: {
        Email: process.env.MJ_SENDER,
        Name:  'Student Task Analyser'
      },
      To: [{ Email: user.email, Name: user.name }],
      Subject: 'Your Verification OTP – Student Task Analyser',
      HTMLPart: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;
                    padding:32px;background:#f9f7ff;border-radius:16px;">
          <h2 style="color:#7c3aed;margin-bottom:8px;">Email Verification</h2>
          <p style="color:#444;">Hello <strong>${user.name}</strong>,</p>
          <p style="color:#444;">Your verification code is:</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:10px;
                      color:#7c3aed;margin:24px 0;text-align:center;
                      background:#ede9fe;padding:16px;border-radius:12px;">
            ${otp}
          </div>
          <p style="color:#666;font-size:0.9rem;">
            This code expires in <strong>10 minutes</strong>.
            If you didn't request this, ignore this email.
          </p>
        </div>
      `
    }]
  });
}

/* ── Password Reset Email ── */
async function sendPasswordResetEmail(user, resetUrl) {
  console.log(`🔑 Sending reset link to ${user.email}`);
  return mailjetSend({
    Messages: [{
      From: {
        Email: process.env.MJ_SENDER,
        Name:  'Student Task Analyser'
      },
      To: [{ Email: user.email, Name: user.name }],
      Subject: 'Reset Your Password – Student Task Analyser',
      HTMLPart: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;
                    padding:32px;background:#f9f7ff;border-radius:16px;">
          <h2 style="color:#7c3aed;margin-bottom:8px;">Password Reset</h2>
          <p style="color:#444;">Hello <strong>${user.name}</strong>,</p>
          <p style="color:#444;">Click the button below to reset your password:</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}"
               style="background:#7c3aed;color:#fff;padding:14px 32px;
                      border-radius:10px;text-decoration:none;
                      font-weight:700;font-size:1rem;">
              Reset Password
            </a>
          </div>
          <p style="color:#666;font-size:0.88rem;">
            This link expires in <strong>15 minutes</strong>.
            If you didn't request this, ignore this email.
          </p>
          <p style="color:#aaa;font-size:0.8rem;margin-top:1rem;word-break:break-all;">
            Or copy: ${resetUrl}
          </p>
        </div>
      `
    }]
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };