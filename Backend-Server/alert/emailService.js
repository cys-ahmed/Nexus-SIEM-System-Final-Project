const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'alertnexus67@gmail.com',
    pass: 'jjet ksmr lovm cfhb'
  }
});

function getSeverityColor(severity) {
  const colorMap = {
    'critical': '#dc3545',
    'high': '#fd7e14',
    'medium': '#ffc107',
    'low': '#28a745'
  };
  return colorMap[severity.toLowerCase()] || '#6c757d';
}

async function sendAlertEmail(alertData) {
  const { title, description, severity, source } = alertData;

  try {
    const mailOptions = {
      from: 'alertnexus67@gmail.com',
      to: 'test440.t@gmail.com',
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
}

module.exports = {
  sendAlertEmail
};
