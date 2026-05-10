const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'in-v3.mailjet.com',
  port: 587,
  secure: false,

  auth: {
    user: process.env.MJ_APIKEY_PUBLIC,
    pass: process.env.MJ_APIKEY_PRIVATE
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

async function sendVerificationEmail(
  user,
  otp
) {

  const info =
    await transporter.sendMail({

      from:
        process.env.MJ_SENDER,

      to:
        user.email,

      subject:
        'Student Task Analyser OTP',

      html: `

        <div style="font-family:Arial;padding:20px;">

          <h2>
            Email Verification
          </h2>

          <p>
            Hello ${user.name}
          </p>

     <div style="
  font-size:36px;
  font-weight:800;
  letter-spacing:8px;
  color:#7c3aed;
  background:#f3e8ff;
  padding:18px;
  border-radius:12px;
  text-align:center;
  margin:24px 0;
">
  ${otp}
</div>

          <p>
            OTP expires in 10 minutes.
          </p>

        </div>
      `
    });

  console.log(
    'EMAIL SENT:',
    info.response
  );
}
async function sendPasswordResetEmail(
  user,
  otp
) {

  const info =
    await transporter.sendMail({

      from:
        process.env.MJ_SENDER,

      to:
        user.email,

      subject:
        'Password Reset OTP',

      html: `

        <div style="font-family:Arial;padding:20px;">

          <h2>
            Reset Password OTP
          </h2>

          <p>
            Hello ${user.name}
          </p>

<div style="
  font-size:36px;
  font-weight:800;
  letter-spacing:8px;
  color:#7c3aed;
  background:#f3e8ff;
  padding:18px;
  border-radius:12px;
  text-align:center;
  margin:24px 0;
">
  ${otp}
</div>

          <p>
            OTP expires in 10 minutes.
          </p>

        </div>
      `
    });

  console.log(
    'RESET OTP SENT:',
    info.response
  );
}
module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};