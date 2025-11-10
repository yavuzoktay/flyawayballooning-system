import dayjs from 'dayjs';

const HERO_IMAGE_URL =
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80';
const PERSONAL_NOTE_PLACEHOLDER = '<!--PERSONAL_NOTE-->';

const escapeHtml = (unsafe = '') =>
    unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

export const isHtmlContent = (value = '') =>
    typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value);

const stripDocumentTags = (html = '') =>
    html
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?(html|head|body)[^>]*>/gi, '');

const textToParagraphHtml = (text = '') =>
    text
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.trim() !== '')
        .map(
            (paragraph) =>
                `<p style="margin:0 0 16px;">${escapeHtml(paragraph)
                    .replace(/\n/g, '<br>')
                    .trim()}</p>`
        )
        .join('') || '<p style="margin:0 0 16px;">&nbsp;</p>';

const resolveBodyHtml = (template = {}, fallbackParagraphsHtml = '') => {
    const raw = template?.body;
    if (raw && raw.trim() !== '') {
        if (isHtmlContent(raw)) {
            return stripDocumentTags(raw);
        }
        return textToParagraphHtml(raw);
    }
    return fallbackParagraphsHtml;
};

const buildEmailLayout = ({
    subject,
    headline = '',
    heroImage = HERO_IMAGE_URL,
    highlightHtml = '',
    bodyHtml = '',
    customerName = 'Guest',
    signatureLines = ['Fly Away Ballooning Team'],
    footerLinks = [],
    emoji = '🎈'
}) => {
    const safeName = escapeHtml(customerName || 'Guest');
    const signatureHtml = signatureLines
        .map(
            (line) =>
                `<div style="font-size:16px; line-height:1.6; color:#1f2937; margin:0;">${line}</div>`
        )
        .join('');

    const footerHtml =
        footerLinks.length > 0
            ? `<div style="margin-top:32px; text-align:center;">
                    ${footerLinks
                        .map(
                            ({ label, url }) =>
                                `<a href="${url}" style="font-size:14px; color:#1976d2; text-decoration:none; margin:0 8px;">${label}</a>`
                        )
                        .join('')}
               </div>`
            : '';

    const highlightSection = highlightHtml
        ? `<div style="background:#e8e7ff; border-radius:12px; padding:16px 18px; margin-bottom:24px; color:#4338ca; font-size:15px; line-height:1.5;">
                ${highlightHtml}
           </div>`
        : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 12px 35px rgba(20,23,38,0.12);">
                    <tr>
                        <td>
                            <img src="${heroImage}" alt="Fly Away Ballooning" style="width:100%; height:220px; object-fit:cover; display:block;" />
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <div style="font-size:15px; text-transform:uppercase; letter-spacing:0.08em; color:#6366f1; font-weight:700; margin-bottom:8px;">${emoji} Fly Away Ballooning</div>
                            <div style="font-size:26px; line-height:1.35; font-weight:700; color:#111827; margin-bottom:20px;">${headline}</div>
                            ${highlightSection}
                            <div style="font-size:16px; line-height:1.7; color:#1f2937; margin-bottom:18px;">Dear ${safeName},</div>
                            ${PERSONAL_NOTE_PLACEHOLDER}
                            <div style="font-size:16px; line-height:1.7; color:#1f2937;">
                                ${bodyHtml}
                            </div>
                            <div style="font-size:16px; line-height:1.7; color:#1f2937; margin-top:24px;">
                                ${signatureHtml}
                            </div>
                        </td>
                    </tr>
                </table>
                ${footerHtml}
                <div style="font-size:12px; color:#6b7280; margin-top:24px;">
                    You are receiving this email because you recently interacted with Fly Away Ballooning.<br/>
                    <a href="https://flyawayballooning.com" style="color:#6b7280; text-decoration:underline;">Visit our website</a>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>`;

    return {
        subject,
        body: html
    };
};

const formatDateTime = (value) =>
    value ? dayjs(value).format('MMMM D, YYYY [at] h:mm A') : null;

const formatDate = (value) => (value ? dayjs(value).format('MMMM D, YYYY') : null);

const DEFAULT_TEMPLATE_BUILDERS = {
    'Follow up': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🎈 Thank you';
        const highlightHtml =
            'This sends automatically a few hours after the flight. It can also be cancelled beforehand from the Tripworks customer profile email section.';
        const defaultBodyHtml = [
            'As the chief pilot of Fly Away Ballooning, I wanted to personally thank you for trusting us with your flight.',
            'If you have a moment to share what the day felt like for you, our whole crew would love to hear it. Your feedback helps us keep improving every single launch.',
            'Thanks for choosing FAB — we hope to see you floating with us again soon! 🎈'
        ]
            .map(
                (paragraph) =>
                    `<p style="margin:0 0 16px;">${paragraph}</p>`
            )
            .join('');

        return buildEmailLayout({
            subject,
            headline: 'Thank you for flying with us!',
            highlightHtml,
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName,
            signatureLines: ['Hugo Hall', 'Chief Pilot'],
            footerLinks: [
                { label: 'Instagram', url: 'https://www.instagram.com/flyawayballooning' },
                { label: 'Facebook', url: 'https://www.facebook.com/flyawayballooning' }
            ]
        });
    },
    'Booking Confirmation': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const flightDate = formatDateTime(booking?.flight_date);
        const location = booking?.location || 'our launch site';
        const experience = booking?.flight_type || 'your flight';
        const subject = '🎈 Your flight is confirmed';

        const defaultBodyHtml = [
            `We’re thrilled to confirm your balloon flight experience with us!`,
            `🗓 <strong>Date:</strong> ${escapeHtml(flightDate || 'We will reach out to schedule with you shortly.')}`,
            `📍 <strong>Meeting point:</strong> ${escapeHtml(location)}`,
            `🎫 <strong>Experience:</strong> ${escapeHtml(experience)}`,
            'We’ll be in touch again closer to the flight with weather updates and meeting instructions. In the meantime, feel free to reply directly if you have any questions.'
        ]
            .map((paragraph, index) => {
                const margin = index === 0 ? 'margin:0 0 16px;' : 'margin:0 0 14px;';
                return `<p style="${margin}">${paragraph}</p>`;
            })
            .join('');

        return buildEmailLayout({
            subject,
            headline: 'Your balloon flight is booked!',
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName,
            signatureLines: ['Fly Away Ballooning Team'],
            footerLinks: [
                { label: 'View FAQs', url: 'https://flyawayballooning.com/faq' },
                { label: 'Contact us', url: 'mailto:hello@flyawayballooning.com' }
            ]
        });
    },
    'Booking Rescheduled': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const previousDate = formatDateTime(booking?.flight_date);
        const subject = '✈️ Your flight is rescheduled';
        const defaultBodyHtml = [
            `Thanks for your flexibility — we’ve updated your booking and are ready to help you choose a new launch window.`,
            previousDate
                ? `Originally scheduled for <strong>${escapeHtml(previousDate)}</strong>, we’ll reach out shortly with next available alternatives that match your preferences.`
                : 'We’ll reach out shortly with new availability options that match your preferences.',
            'If you already have a date in mind, simply reply to this email and we’ll take care of the rest.',
            'We appreciate your patience as we work around the weather. Ballooning is worth waiting for!'
        ]
            .map((paragraph) => `<p style="margin:0 0 16px;">${paragraph}</p>`)
            .join('');

        return buildEmailLayout({
            subject,
            headline: 'We’ve updated your booking details.',
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName,
            signatureLines: ['Operations Team', 'Fly Away Ballooning'],
            footerLinks: [
                { label: 'Reschedule options', url: 'https://flyawayballooning.com/rebook' },
                { label: 'Call us', url: 'tel:+441234567890' }
            ]
        });
    },
    'Gift Card Confirmation': ({ template, booking }) => {
        const purchaserName = booking?.name || booking?.customer_name || 'Guest';
        const recipient = booking?.recipient_name || 'your recipient';
        const subject = '🎁 Your Gift Voucher is ready';
        const defaultBodyHtml = [
            'Thanks for choosing Fly Away Ballooning — your gift voucher is confirmed and ready to deliver!',
            `🎁 <strong>Recipient:</strong> ${escapeHtml(recipient)}`,
            '📬 We’ll email the voucher directly, and you’ll also receive a printable copy in your account.',
            'If you’d prefer to add a personal note or change the delivery date, just reply to this message and our team will help right away.'
        ]
            .map((paragraph, index) => {
                const margin = index === 0 ? 'margin:0 0 16px;' : 'margin:0 0 14px;';
                return `<p style="${margin}">${paragraph}</p>`;
            })
            .join('');

        return buildEmailLayout({
            subject,
            headline: 'Your gift experience is all set!',
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName: purchaserName,
            signatureLines: ['Fly Away Ballooning Team'],
            footerLinks: [
                { label: 'Download voucher', url: 'https://flyawayballooning.com/account/vouchers' },
                { label: 'Gift FAQs', url: 'https://flyawayballooning.com/gift-faqs' }
            ]
        });
    },
    'Request for Payment/Deposit': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const amountDue = booking?.due
            ? `£${Number(booking?.due).toFixed(2)}`
            : 'the remaining balance';
        const subject = '💳 Payment request';
        const defaultBodyHtml = [
            `We’re looking forward to hosting you! There’s just one small step left — completing ${escapeHtml(
                amountDue
            )} for your booking.`,
            'You can securely pay online using the button below. Once the payment is confirmed, you’ll receive an updated receipt straight away.',
            '<a href="https://flyawayballooning.com/pay" style="display:inline-block; margin:16px 0 24px; background:#6366f1; color:#fff; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:600;">Complete payment</a>',
            'If you have any questions or would prefer to pay over the phone, reply to this email and we’ll be happy to help.'
        ]
            .map((paragraph) => `<p style="margin:0 0 16px;">${paragraph}</p>`)
            .join('');

        return buildEmailLayout({
            subject,
            headline: 'Almost there — complete your booking',
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName,
            signatureLines: ['Accounts Team', 'Fly Away Ballooning'],
            footerLinks: [
                { label: 'Payment FAQs', url: 'https://flyawayballooning.com/payment-help' },
                { label: 'Call us', url: 'tel:+441234567890' }
            ]
        });
    },
    'Upcoming Flight Reminder': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const flightDate = formatDateTime(booking?.flight_date);
        const subject = '⏰ Your flight is coming up';
        const defaultBodyHtml = [
            `Just a quick reminder that your flight is scheduled for <strong>${escapeHtml(
                flightDate || 'soon'
            )}</strong>.`,
            'Please arrive at least 30 minutes before your scheduled launch so we can complete check-in and the safety briefing.',
            'Keep an eye on your inbox — we’ll notify you if weather conditions require any last-minute adjustments.'
        ]
            .map((paragraph) => `<p style="margin:0 0 16px;">${paragraph}</p>`)
            .join('');

        return buildEmailLayout({
            subject,
            headline: 'Your adventure is right around the corner!',
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName,
            signatureLines: ['Operations Team', 'Fly Away Ballooning'],
            footerLinks: [
                { label: 'Directions', url: 'https://flyawayballooning.com/directions' },
                { label: 'What to bring', url: 'https://flyawayballooning.com/checklist' }
            ]
        });
    }
};

export const getDefaultEmailTemplateContent = (template, booking = {}) => {
    if (!template) return null;
    const templateName = template.name || template.subject;
    const builder = DEFAULT_TEMPLATE_BUILDERS[templateName];
    const templateBody =
        template.body && template.body.trim() !== '' ? template.body : null;

    if (!builder) {
        if (!templateBody) return null;
        if (isHtmlContent(templateBody)) {
            return {
                subject: template.subject,
                body: stripDocumentTags(templateBody)
            };
        }
        return {
            subject: template.subject,
            body: textToParagraphHtml(templateBody)
        };
    }

    return builder({ template, booking });
};

export const applyPersonalNote = (message, personalNote = '') => {
    if (!personalNote) {
        if (message && message.includes(PERSONAL_NOTE_PLACEHOLDER)) {
            return message.replace(PERSONAL_NOTE_PLACEHOLDER, '');
        }
        return message;
    }

    const trimmedNote = personalNote.trim();
    if (!trimmedNote) return message;

    const noteHtml = `<div style="margin:0 0 16px; padding:14px 18px; background:#f3f4f6; border-radius:12px; font-size:16px; line-height:1.65; color:#1f2937;">${escapeHtml(trimmedNote).replace(/\n/g, '<br>')}</div>`;

    if (!message || message.trim() === '') {
        return noteHtml;
    }

    if (isHtmlContent(message)) {
        if (message.includes(PERSONAL_NOTE_PLACEHOLDER)) {
            return message.replace(PERSONAL_NOTE_PLACEHOLDER, noteHtml);
        }

        const closingBodyIndex = message.indexOf('</div>');
        if (closingBodyIndex !== -1) {
            return (
                message.slice(0, closingBodyIndex) +
                noteHtml +
                message.slice(closingBodyIndex)
            );
        }

        const bodyTagIndex = message.indexOf('</body>');
        if (bodyTagIndex !== -1) {
            return (
                message.slice(0, bodyTagIndex) +
                noteHtml +
                message.slice(bodyTagIndex)
            );
        }

        return noteHtml + message;
    }

    return `${trimmedNote}\n\n${message}`;
};

export const getPreviewHtml = (message, personalNote = '') => {
    const messageWithNote = applyPersonalNote(message || '', personalNote);
    if (isHtmlContent(messageWithNote)) {
        return messageWithNote
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .replace(/<\/?html[^>]*>/gi, '')
            .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, '')
            .replace(/<\/?body[^>]*>/gi, '');
    }
    return `<div style="font-size:16px; line-height:1.7; color:#1f2937;">${escapeHtml(
        messageWithNote
    ).replace(/\n/g, '<br>')}</div>`;
};

export const PERSONAL_NOTE_TOKEN = PERSONAL_NOTE_PLACEHOLDER;

