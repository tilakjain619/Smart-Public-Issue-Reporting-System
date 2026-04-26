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
            const resolutionImageUrl = data.resolutionImageUrl;
            
            return {
                subject: `Issue Resolved: ${issueTitle}`,
                message: `Good news! Your reported issue "${issueTitle}" has been marked as resolved.${cityState ? ` Location: ${cityState}.` : ''}${data.issueId ? ` Issue ID: ${data.issueId}.` : ''}`,
                html: `
                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #2e7d32;">Issue Resolved!</h2>
                        <p>Hello ${data.userName || 'Citizen'},</p>
                        <p>Good news! Your reported issue <strong>${issueTitle}</strong> has been marked as <strong>resolved</strong> by our team.</p>
                        
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            ${cityState ? `<p><strong>Location:</strong> ${cityState}</p>` : ''}
                            ${data.issueId ? `<p><strong>Issue ID:</strong> ${data.issueId}</p>` : ''}
                        </div>

                        ${resolutionImageUrl ? `
                        <div style="margin: 20px 0;">
                            <p><strong>Proof of Resolution:</strong></p>
                            <img src="${resolutionImageUrl}" alt="Resolution Proof" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
                            <p style="font-size: 12px; margin-top: 8px;"><a href="${resolutionImageUrl}" target="_blank" style="color: #1976d2;">View full image</a></p>
                        </div>
                        ` : ''}

                        <p>Thank you for your patience and for helping improve your community.</p>
                        <p style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                            Best regards,<br>
                            <strong>Jagruk Team</strong>
                        </p>
                    </div>
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
        issue_assigned: (data = {}) => ({
            subject: `New Issue Assigned: ${data.issueTitle || 'Action Required'}`,
            message: `Hello ${data.officerName || 'Officer'}, a new issue "${data.issueTitle || 'Unknown'}" has been assigned to you in ${data.city || 'your area'}.`,
            html: `
                <p>Hello <strong>${data.officerName || 'Officer'}</strong>,</p>
                <p>A new issue has been assigned to you for resolution.</p>
                <p><strong>Issue Title:</strong> ${data.issueTitle || 'Unknown'}</p>
                <p><strong>Location:</strong> ${data.city || 'Unknown'}, ${data.state || 'Unknown'}</p>
                ${data.issueId ? `<p><strong>Issue ID:</strong> ${data.issueId}</p>` : ''}
                <p>Please log in to the officer portal to view details and update progress.</p>
                <p>Best,<br>Jagruk Admin Team</p>
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
