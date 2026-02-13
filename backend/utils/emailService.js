const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


const sendPasswordResetEmail = async (email, otpCode, resetUrl) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Password Reset Code - Nexus SIEM System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; letter-spacing: 8px; padding: 20px; background-color: white; border: 2px dashed #2563eb; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nexus SIEM System</h1>
            </div>
            <div class="content">
              <h2>Password Reset Code</h2>
              <p>You have requested to reset your password. Use the code below to reset your password:</p>
              <div class="otp-code">${otpCode}</div>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Go to Reset Password Page</a>
              </p>
              <p>Or visit this page manually:</p>
              <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
              <div class="warning">
                <p><strong>Important:</strong></p>
                <ul>
                  <li>This code will expire in 10 minutes</li>
                  <li>If you did not request this password reset, please ignore this email</li>
                  <li>For security reasons, do not share this code with anyone</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 Nexus SIEM System. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Code - Nexus SIEM System
        
        You have requested to reset your password. Use the code below to reset your password:
        
        Your reset code: ${otpCode}
        
        Visit this page to reset your password: ${resetUrl}
        
        Important:
        - This code will expire in 10 minutes
        - If you did not request this password reset, please ignore this email
        - For security reasons, do not share this code with anyone
        
        © 2025 Nexus SIEM System. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};


const sendMFAPinEmail = async (email, pinCode) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Login PIN Code - Nexus SIEM',
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Nexus SIEM System</h2>
          <p>Your login PIN code:</p>
          <div style="font-size: 32px; font-weight: bold; color: #2563eb; text-align: center; letter-spacing: 8px; padding: 20px; border: 2px solid #2563eb; border-radius: 8px; margin: 20px 0;">
            ${pinCode}
          </div>
          <p style="color: #dc2626; font-size: 14px;">This code expires in 2 minutes. If you didn't request this, secure your account.</p>
        </div>
      `,
      text: `Your login PIN: ${pinCode}\n\nExpires in 2 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending MFA PIN email:', error);
    throw error;
  }
};

const getSeverityColor = (severity) => {
  const colorMap = {
    'critical': '#dc3545',
    'high': '#fd7e14',
    'medium': '#ffc107',
    'low': '#28a745'
  };
  return colorMap[severity.toLowerCase()] || '#6c757d';
};

const sendAlertEmail = async (alertData) => {
  const { title, description, severity, source } = alertData;

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ALERT_RECIPIENT_EMAIL,
      subject: `[${severity.toUpperCase()}] ${title}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
             Nexus SIEM Alert
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Alert Details</h3>
            
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Severity:</strong> <span style="color: ${getSeverityColor(severity)}; font-weight: bold;">${severity.toUpperCase()}</span></p>
            <p><strong>Source:</strong> ${source}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background-color: #fff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #495057;">Description</h4>
            <p style="color: #666;">${description}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
            <p>This is an automated alert from Nexus SIEM System</p>
          </div>
        </div>
      `
    };

    const emailResult = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', emailResult.messageId);

    return {
      success: true,
      messageId: emailResult.messageId
    };

  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendMFAPinEmail,
  sendAlertEmail,
};

