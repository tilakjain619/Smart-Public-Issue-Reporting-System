const axios = require('axios');

const sendDynamicEmail = async ({ email, type = 'generic', templateData = {}, subject, message, html }) => {
    const mailEnabled = String(process.env.MAIL_ENABLED).toLowerCase() === 'true';
    if (!mailEnabled) {
        return { success: true, skipped: true, reason: 'MAIL_ENABLED is false' };
    }
    console.log('Send email function called');

    if (!email) {
        return { success: false, error: 'Recipient email is required' };
    }

    const senderEmail = process.env.MAILJET_SENDER_EMAIL;
    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_SECRET_KEY;
    const apiEndpoint = process.env.MAILJET_API_ENDPOINT || 'https://api.mailjet.com/v3.1/send';

    if (!senderEmail || !apiKey || !apiSecret) {
        return {
            success: false,
            error: 'Mailjet configuration is incomplete (MAILJET_SENDER_EMAIL, MAILJET_API_KEY, MAILJET_SECRET_KEY)'
        };
    }

    const templates = {
        issue_resolved: (data = {}) => {
            const issueTitle = data.issueTitle || 'your reported issue';
            const cityState = [data.city, data.state].filter(Boolean).join(', ');
            return {
                subject: `Issue Resolved: ${issueTitle}`,
                message: `Good news! Your reported issue "${issueTitle}" has been marked as resolved.${cityState ? ` Location: ${cityState}.` : ''}${data.issueId ? ` Issue ID: ${data.issueId}.` : ''}`,
                html: `
                    <p>Hello ${data.userName || 'Citizen'},</p>
                    <p>Your reported issue <strong>${issueTitle}</strong> has been marked as <strong>resolved</strong>.</p>
                    ${cityState ? `<p><strong>Location:</strong> ${cityState}</p>` : ''}
                    ${data.issueId ? `<p><strong>Issue ID:</strong> ${data.issueId}</p>` : ''}
                    <p>Thank you for helping improve your community.</p>
                    <p>Best,<br>Jagruk Team</p>
                `
            };
        },
        issue_status_updated: (data = {}) => ({
            subject: `Issue Status Updated: ${data.issueTitle || 'Your Issue'}`,
            message: `Your issue "${data.issueTitle || 'your issue'}" status changed from "${data.previousStatus || 'unknown'}" to "${data.currentStatus || 'updated'}".`,
            html: `
                <p>Hello ${data.userName || 'Citizen'},</p>
                <p>Your issue <strong>${data.issueTitle || 'your issue'}</strong> was updated.</p>
                <p><strong>Previous Status:</strong> ${data.previousStatus || 'unknown'}</p>
                <p><strong>Current Status:</strong> ${data.currentStatus || 'updated'}</p>
                ${data.issueId ? `<p><strong>Issue ID:</strong> ${data.issueId}</p>` : ''}
                <p>Best,<br>Jagruk Team</p>
            `
        }),
        generic: (data = {}) => ({
            subject: data.subject || 'Notification from Jagruk',
            message: data.message || 'You have a new update from Jagruk.',
            html: data.html || `<p>${data.message || 'You have a new update from Jagruk.'}</p>`
        })
    };

    const selectedTemplate = templates[type] || templates.generic;
    const rendered = selectedTemplate(templateData);

    const finalSubject = subject || rendered.subject;
    const finalMessage = message || rendered.message;
    const finalHtml = html || rendered.html;

    const payload = {
        Messages: [
            {
                From: {
                    Email: senderEmail,
                    Name: 'Jagruk Alerts'
                },
                To: [{ Email: email }],
                Subject: finalSubject,
                TextPart: finalMessage,
                HTMLPart: finalHtml
            }
        ]
    };

    try {
        const response = await axios.post(
            apiEndpoint,
            payload,
            {
                auth: {
                    username: apiKey,
                    password: apiSecret
                },
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000
            }
        );

        return { success: true, type, data: response.data };
    } catch (error) {
        const providerError = error.response?.data || error.message;
        return { success: false, type, error: providerError };
    }
};

module.exports = {
    sendDynamicEmail
};
