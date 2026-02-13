/**
 * Email/SMTP Health Check Script
 * Tests the email configuration without sending an actual email
 * Run: npm run check:email
 */

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(msg, color = '') {
    console.log(`${color}${msg}${COLORS.reset}`);
}

async function main() {
    log('\n' + '='.repeat(50), COLORS.bold);
    log('📧 NEXUS SIEM - Email/SMTP Health Check', COLORS.bold);
    log('='.repeat(50), COLORS.bold);

    // Check env variables
    log('\n📋 Configuration:', COLORS.cyan);

    const config = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
        recipient: process.env.ALERT_RECIPIENT_EMAIL
    };

    let configOk = true;
    for (const [key, value] of Object.entries(config)) {
        if (value) {
            log(`   ✅ ${key}: ${key === 'user' ? value.substring(0, 5) + '***' : value}`, COLORS.green);
        } else {
            log(`   ❌ ${key}: NOT SET`, COLORS.red);
            configOk = false;
        }
    }

    if (!process.env.SMTP_PASS) {
        log(`   ❌ SMTP_PASS: NOT SET`, COLORS.red);
        configOk = false;
    } else {
        log(`   ✅ SMTP_PASS: ****`, COLORS.green);
    }

    if (!configOk) {
        log('\n❌ Configuration incomplete. Check your .env file.', COLORS.red);
        process.exit(1);
    }

    // Test SMTP connection
    log('\n🔌 Testing SMTP connection...', COLORS.cyan);

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10),
            secure: parseInt(process.env.SMTP_PORT, 10) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.verify();
        log('   ✅ SMTP connection successful!', COLORS.green);

        log('\n' + '='.repeat(50), COLORS.bold);
        log('✅ Email configuration is healthy!', COLORS.green + COLORS.bold);
        log('='.repeat(50) + '\n', COLORS.bold);

        process.exit(0);

    } catch (error) {
        log(`   ❌ SMTP connection failed: ${error.message}`, COLORS.red);

        log('\n' + '='.repeat(50), COLORS.bold);
        log('❌ Email configuration has issues!', COLORS.red + COLORS.bold);
        log('='.repeat(50) + '\n', COLORS.bold);

        process.exit(1);
    }
}

main();
