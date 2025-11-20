import dayjs from 'dayjs';

// Use emailImage.jpg from uploads/email folder
const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        // Client-side: use current origin
        const origin = window.location.origin;
        // If localhost, check if we should use production URL for email preview
        if (origin.includes('localhost')) {
            // For email preview in development, use production URL so images work
            return 'https://flyawayballooning-system.com';
        }
        return origin;
    }
    // Server-side: use environment variable or production URL
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'PRODUCTION';
    if (isProduction || !process.env.NODE_ENV) {
        return process.env.BASE_URL || 'https://flyawayballooning-system.com';
    }
    // Development: use environment variable or default
    return process.env.REACT_APP_API_URL || process.env.BASE_URL || 'http://localhost:3002';
};

const HERO_IMAGE_URL = `${getBaseUrl()}/uploads/email/emailImage.jpg`;
const PERSONAL_NOTE_PLACEHOLDER = '<!--PERSONAL_NOTE-->';

const normalizeTemplateName = (name = '') => (name || '').trim();

const escapeHtml = (unsafe = '') => {
    const str = unsafe == null ? '' : String(unsafe);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export const isHtmlContent = (value = '') =>
    typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value);

export const sanitizeTemplateHtml = (html = '') => {
    const raw = html == null ? '' : String(html);
    return raw
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?(html|head|body)[^>]*>/gi, '')
        .trim();
};

// Normalize template body HTML to match Booking Confirmation template styles
// This ensures consistent font-size, font-family, and line-height across all templates
const normalizeTemplateBodyStyles = (html = '') => {
    if (!html) return html;
    
    // Remove font-size, font-family, and line-height from inline styles
    // This allows the wrapper styles in buildEmailLayout to take precedence
    // Use a more robust approach: replace style attributes and rebuild them
    let normalized = html.replace(/style="([^"]*)"/gi, (match, styleContent) => {
        if (!styleContent) return '';
        
        // Split style content by semicolons and filter out font-size, font-family, line-height
        const styles = styleContent.split(';')
            .map(s => s.trim())
            .filter(s => {
                const lower = s.toLowerCase();
                return s && 
                       !lower.startsWith('font-size') && 
                       !lower.startsWith('font-family') && 
                       !lower.startsWith('line-height');
            });
        
        // Rebuild style attribute if there are remaining styles
        if (styles.length > 0) {
            return `style="${styles.join('; ')}"`;
        }
        return '';
    });
    
    // Also handle single quotes
    normalized = normalized.replace(/style='([^']*)'/gi, (match, styleContent) => {
        if (!styleContent) return '';
        
        const styles = styleContent.split(';')
            .map(s => s.trim())
            .filter(s => {
                const lower = s.toLowerCase();
                return s && 
                       !lower.startsWith('font-size') && 
                       !lower.startsWith('font-family') && 
                       !lower.startsWith('line-height');
            });
        
        if (styles.length > 0) {
            return `style="${styles.join('; ')}"`;
        }
        return '';
    });
    
    return normalized;
};

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

export const extractMessageFromTemplateBody = (html = '') => {
    const sanitized = sanitizeTemplateHtml(html);
    if (!sanitized) return '';
    
    // Normalize styles to match Booking Confirmation template
    const normalized = normalizeTemplateBodyStyles(sanitized);
    
    // Check if [Receipt] prompt exists (new way)
    // Use indexOf instead of test() to avoid regex lastIndex issues
    const hasReceiptPrompt = normalized.toLowerCase().indexOf('[receipt]') !== -1;
    if (hasReceiptPrompt) {
        // If [Receipt] prompt exists, return the entire normalized HTML
        // The [Receipt] prompt will be replaced by replacePrompts function
        // This ensures text after [Receipt] is preserved
        return normalized;
    }
    
    // Check for old receipt markers (backward compatibility)
    const markerIndex = normalized.indexOf(RECEIPT_MARKER_START);
    if (markerIndex !== -1) {
        return normalized.slice(0, markerIndex).trim();
    }
    return normalized;
};

const resolveBodyHtml = (template = {}, fallbackParagraphsHtml = '') => {
    const raw = template?.body;
    if (raw && raw.trim() !== '') {
        if (isHtmlContent(raw)) {
            const sanitized = sanitizeTemplateHtml(raw);
            // Normalize styles to match Booking Confirmation template
            return normalizeTemplateBodyStyles(sanitized);
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
    signatureLines = [],
    footerLinks = [],
    emoji = '🎈'
}) => {
    const safeName = escapeHtml(customerName || 'Guest');
    const filteredSignatureLines = Array.isArray(signatureLines)
        ? signatureLines.filter((line) => typeof line === 'string' && line.trim() !== '')
        : [];
    const signatureHtml = filteredSignatureLines.length
        ? filteredSignatureLines
              .map(
                  (line) =>
                      `<div style="font-size:16px; line-height:1.6; color:#1f2937; margin:0;">${line}</div>`
              )
              .join('')
        : '';

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
    <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 12px 35px rgba(20,23,38,0.12);">
                    <tr>
                        <td style="padding:0; margin:0; line-height:0; font-size:0; width:100%;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%; border-collapse:collapse;">
                                <tr>
                                    <td style="padding:0; margin:0; line-height:0; font-size:0; width:100%;">
                                        <!--[if mso]>
                                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:auto; width:640px;" stroke="false">
                                        <v:fill type="frame" src="${heroImage}" color="#ffffff" />
                                        <w:anchorlock/>
                                        <v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true;">
                                        <div style="font-size:1px; line-height:1px;">&nbsp;</div>
                                        </v:textbox>
                                        </v:rect>
                                        <![endif]-->
                                        <img src="${heroImage}" alt="Fly Away Ballooning" width="640" style="width:100%; height:auto; min-height:220px; display:block; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; background-color:#ffffff; vertical-align:top; object-fit:cover; object-position:center; border-radius:24px 24px 0 0;" />
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            ${headline ? `<div style="font-size:26px; line-height:1.35; font-weight:700; color:#111827; margin-bottom:20px;">${headline}</div>` : ''}
                            ${highlightSection}
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

const RECEIPT_MARKER_START = '<!-- RECEIPT_SECTION_START -->';
const RECEIPT_MARKER_END = '<!-- RECEIPT_SECTION_END -->';

const wrapParagraphs = (paragraphs = []) =>
    paragraphs
        .map(
            (text, index) =>
                `<p style="margin:0 0 ${index === paragraphs.length - 1 ? '24px' : '16px'};">${text}</p>`
        )
        .join('');

const getBookingConfirmationMessageHtml = (booking = {}) => {
    const name = escapeHtml(booking?.name || booking?.customer_name || 'Guest');
    const flightDate = escapeHtml(formatDateTime(booking?.flight_date) || 'November 14, 2025 at 3:30 PM');
    const location = escapeHtml(booking?.location || 'Bath');
    const experience = escapeHtml(booking?.flight_type || 'Private Charter');

    return wrapParagraphs([
        `Dear ${name},`,
        `We’re thrilled to confirm your balloon flight experience with us!`,
        `🗓 <strong>Date:</strong> ${flightDate}`,
        `📍 <strong>Meeting point:</strong> ${location}`,
        `🎫 <strong>Experience:</strong> ${experience}`,
        'We’ll be in touch again closer to the flight with weather updates and meeting instructions. In the meantime, feel free to reply directly if you have any questions.',
        'Thank you,',
        'Fly Away Ballooning Team'
    ]);
};

const getBookingConfirmationReceiptHtml = (booking = {}) => {
    const receiptItems = Array.isArray(booking?.passengers) ? booking.passengers : [];
    
    // Get paid, due, and subtotal from booking object
    // If subtotal is already provided, use it; otherwise calculate from paid + due
    const paidAmount = booking?.paid != null ? Number(booking.paid) : null;
    const dueAmount = booking?.due != null ? Number(booking.due) : null;
    
    // Use provided subtotal if available, otherwise calculate
    let subtotal = booking?.subtotal != null ? Number(booking.subtotal) : null;
    if (subtotal == null) {
        // Calculate subtotal from paid + due
        if (paidAmount != null && dueAmount != null) {
            subtotal = paidAmount + dueAmount;
        } else if (paidAmount != null) {
            subtotal = paidAmount;
        } else if (dueAmount != null) {
            subtotal = dueAmount;
        }
    }
    
    // Fallback to total if subtotal is still null
    if (subtotal == null && booking?.total != null) {
        subtotal = Number(booking.total);
    }
    const receiptId = booking?.receipt_number || booking?.booking_reference || booking?.id || '';
    
    // Format receipt sold date (DD/MM/YYYY format)
    // Priority: booking.created (if in DD/MM/YYYY format) > booking.created_at
    let receiptSoldDate = null;
    const createdValue = booking?.created || booking?.created_at;
    
    if (createdValue) {
        const createdStr = String(createdValue).trim();
        
        // Check if it's already in DD/MM/YYYY format (with or without time)
        if (typeof createdValue === 'string' && createdStr.includes('/')) {
            // Extract date part (before space if time exists, e.g., "20/11/2025 14:30" -> "20/11/2025")
            const datePart = createdStr.split(' ')[0];
            // Check if date part is in DD/MM/YYYY format
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) {
                // Already in DD/MM/YYYY format, use it directly
                receiptSoldDate = datePart;
            } else {
                // Try to parse with dayjs and format as DD/MM/YYYY
                try {
                    const dateObj = dayjs(createdValue);
                    if (dateObj.isValid()) {
                        receiptSoldDate = dateObj.format('DD/MM/YYYY');
                    }
                } catch (e) {
                    console.warn('Error formatting created/created_at date for receipt:', e);
                }
            }
        } else {
            // Try to parse with dayjs and format as DD/MM/YYYY
            try {
                const dateObj = dayjs(createdValue);
                if (dateObj.isValid()) {
                    receiptSoldDate = dateObj.format('DD/MM/YYYY');
                }
            } catch (e) {
                console.warn('Error formatting created/created_at date for receipt:', e);
            }
        }
    }
    const location = escapeHtml(booking?.location || 'Bath');
    const experience = escapeHtml(booking?.flight_type || 'Flight Experience');
    const guestCount = receiptItems.length;
    
    // Format flight date and time for receipt (DD/MM/YYYY HH:mm format)
    let flightDateTime = null;
    if (booking?.flight_date) {
        try {
            // If flight_date contains time, use it directly
            const flightDateObj = dayjs(booking.flight_date);
            if (flightDateObj.isValid()) {
                // Check if time_slot is separate or included in flight_date
                if (booking?.time_slot && !booking.flight_date.includes(' ')) {
                    // Combine date and time_slot
                    const combinedDateTime = `${booking.flight_date} ${booking.time_slot}`;
                    flightDateTime = dayjs(combinedDateTime).format('DD/MM/YYYY HH:mm');
                } else {
                    // flight_date already contains time or use default time
                    flightDateTime = flightDateObj.format('DD/MM/YYYY HH:mm');
                }
            }
        } catch (e) {
            console.warn('Error formatting flight date for receipt:', e);
        }
    }

    return `<div style="margin:32px 0; padding:24px; background:#f9fafb; border-radius:16px; border:1px solid #e2e8f0;">
        <div style="font-size:12px; letter-spacing:0.2em; color:#64748b; text-transform:uppercase; margin-bottom:12px;">Receipt</div>
        <div style="display:flex; flex-wrap:wrap; gap:16px; font-size:14px; color:#475569;">
            <div style="min-width:220px;">
                <div><strong>Sold:</strong> ${receiptSoldDate || '—'}</div>
                <div><strong>Confirmation:</strong> ${escapeHtml(receiptId)}</div>
            </div>
            <div style="min-width:220px;">
                <div><strong>Sold to:</strong></div>
                <div>${escapeHtml(booking?.name || booking?.customer_name || 'Guest')}</div>
                <div>${escapeHtml(booking?.phone || '')}</div>
                <div>${escapeHtml(booking?.email || '')}</div>
                <div>${escapeHtml(booking?.billing_address || '')}</div>
            </div>
            <div style="min-width:220px; background:#f8fafc; border-radius:12px; padding:16px;">
                <div style="font-weight:700; margin-bottom:8px;">Questions?</div>
                <div style="font-size:13px;">Contact us by calling <a href="tel:+441823778127" style="color:#2563eb; text-decoration:none;">+44 1823 778 127</a></div>
            </div>
        </div>
        <div style="margin-top:24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-size:13px; color:#475569;">
                <thead>
                    <tr>
                        <th align="left" style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:0.08em;">Item</th>
                        <th align="left" style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:0.08em;">Description</th>
                        <th align="right" style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:0.08em;">Amount</th>
                        <th align="right" style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:0.08em;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding:12px 0; border-bottom:1px solid #f1f5f9; font-weight:600;">
                            ${experience}
                            ${flightDateTime ? `<div style="margin-top:4px; font-size:12px; color:#64748b; font-weight:400;">Booked For: ${escapeHtml(flightDateTime)}</div>` : ''}
                        </td>
                        <td style="padding:12px 0; border-bottom:1px solid #f1f5f9;">
                            ${location}
                            ${guestCount > 0 ? `<div style="margin-top:4px; font-size:12px; color:#64748b;">Guests: ${guestCount}</div>` : ''}
                        </td>
                        <td style="padding:12px 0; border-bottom:1px solid #f1f5f9;" align="right">
                            £${subtotal != null ? subtotal.toFixed(2) : '—'}
                        </td>
                        <td style="padding:12px 0; border-bottom:1px solid #f1f5f9;" align="right">
                            £${subtotal != null ? subtotal.toFixed(2) : '—'}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div style="margin-top:16px; font-size:13px; color:#475569;">
            <div style="text-align:right; margin-bottom:8px;"><strong>Subtotal:</strong> £${subtotal != null ? subtotal.toFixed(2) : '—'}</div>
            <div style="text-align:right; margin-bottom:8px;"><strong>Total:</strong> £${subtotal != null ? subtotal.toFixed(2) : '—'}</div>
            <div style="text-align:right; margin-bottom:8px;"><strong>Paid:</strong> £${paidAmount != null ? paidAmount.toFixed(2) : '—'}</div>
            <div style="text-align:right;"><strong>Due:</strong> £${dueAmount != null ? dueAmount.toFixed(2) : '—'}</div>
        </div>
    </div>`;
};

const getFollowUpMessageHtml = (booking = {}) =>
    wrapParagraphs([
        'As the chief pilot of Fly Away Ballooning, I wanted to personally thank you for trusting us with your flight.',
        'If you have a moment to share what the day felt like for you, our whole crew would love to hear it. Your feedback helps us keep improving every single launch.',
        'Thanks for choosing FAB — we hope to see you floating with us again soon! 🎈'
    ]);

const getBookingRescheduledMessageHtml = (booking = {}) => {
    const previousDate = escapeHtml(formatDateTime(booking?.flight_date) || 'soon');
    return wrapParagraphs([
        'Thanks for your flexibility — we’ve updated your booking and are ready to help you choose a new launch window.',
        `Originally scheduled for <strong>${previousDate}</strong>, we’ll reach out shortly with next available alternatives that match your preferences.`,
        'If you already have a date in mind, simply reply to this email and we’ll take care of the rest.',
        'We appreciate your patience as we work around the weather. Ballooning is worth waiting for!'
    ]);
};

const getGiftCardMessageHtml = (booking = {}) => {
    const recipient = escapeHtml(booking?.recipient_name || 'your recipient');
    return wrapParagraphs([
        'Thanks for choosing Fly Away Ballooning — your gift voucher is confirmed and ready to deliver!',
        `🎁 <strong>Recipient:</strong> ${recipient}`,
        '📬 We’ll email the voucher directly, and you’ll also receive a printable copy in your account.',
        'If you’d prefer to add a personal note or change the delivery date, just reply to this message and our team will help right away.'
    ]);
};

const getFlightVoucherMessageHtml = (booking = {}) => {
    const name = escapeHtml(booking?.name || booking?.customer_name || 'Guest');
    return wrapParagraphs([
        `Dear ${name},`,
        'Thank you for choosing Fly Away Ballooning!',
        'Your hot air balloon experience voucher has been purchased. What an extraordinary gift — the experience awaits you or your lucky recipient!',
        '<strong>Next Steps:</strong>',
        'If you provided recipient details during checkout, we’ll be sending your personalised voucher shortly. We will also contact the recipient directly 24 hours after the gifted date you selected to welcome them and provide instructions on how to book their flight.',
        'If you skipped the recipient details section, simply reply to this email with their information, and we’ll create their voucher and send it to you.',
        'Should you have any questions in the meantime, please don’t hesitate to reach out.',
        'Warm regards,',
        'Fly Away Ballooning Team'
    ]);
};

const buildStandardTemplateLayout = (template = {}, booking = {}) => {
    const subject = template?.subject || '🎈 Fly Away Ballooning';
    const bodyHtmlRaw = resolveBodyHtml(template, template?.body || '');
    const bodyWithPrompts = replacePrompts(bodyHtmlRaw, booking);
    const customerName = booking?.name || booking?.customer_name || 'Guest';

    return buildEmailLayout({
        subject,
        headline: '',
        heroImage: HERO_IMAGE_URL,
        bodyHtml: bodyWithPrompts,
        customerName,
        signatureLines: [],
        footerLinks: []
    });
};

const getPaymentRequestMessageHtml = (booking = {}) => {
    const amountDue = booking?.due != null ? `£${Number(booking?.due).toFixed(2)}` : 'the remaining balance';
    return wrapParagraphs([
        `We’re looking forward to hosting you! There’s just one small step left — completing ${escapeHtml(amountDue)} for your booking.`,
        'You can securely pay online using the button below. Once the payment is confirmed, you’ll receive an updated receipt straight away.',
        '<a href="https://flyawayballooning.com/pay" style="display:inline-block; margin:16px 0 24px; background:#6366f1; color:#fff; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:600;">Complete payment</a>',
        'If you have any questions or would prefer to pay over the phone, reply to this email and we’ll be happy to help.'
    ]);
};

const getUpcomingFlightReminderMessageHtml = (booking = {}) => {
    const flightDate = escapeHtml(formatDateTime(booking?.flight_date) || 'soon');
    return wrapParagraphs([
        `Just a quick reminder that your flight is scheduled for <strong>${flightDate}</strong>.`,
        'Please arrive at least 30 minutes before your scheduled launch so we can complete check-in and the safety briefing.',
        'Keep an eye on your inbox - we will notify you if weather conditions require any last-minute adjustments.'
    ]);
};

const getToBeUpdatedMessageHtml = (booking = {}) => 
    wrapParagraphs([
        'We wanted to let you know that we are still finalizing the details of your flight.',
        'We will be in touch as soon as we have an update. Thank you for your patience!'
    ]);

const DEFAULT_EDITOR_BOOKING = {
    name: 'First Name',
    customer_name: 'First Name',
    flight_date: dayjs().add(5, 'day').toISOString(),
    location: 'Bath',
    flight_type: 'Private Charter',
    phone: '+44 1234 567890',
    email: 'guest@example.com',
    billing_address: '123 High Street, Bath, UK',
    paid: 150,
    due: 500,
    passengers: [{ first_name: 'First', last_name: 'Guest' }]
};

const DEFAULT_TEMPLATE_BUILDERS = {
    'Follow up': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🎈 Thank you';
        const defaultBodyHtml = getFollowUpMessageHtml(booking);
        const bodyHtml = resolveBodyHtml(template, defaultBodyHtml);
        // Replace prompts in the message
        const bodyHtmlWithPrompts = replacePrompts(bodyHtml, booking);

        return buildEmailLayout({
            subject,
            headline: '',
            highlightHtml: '',
            bodyHtml: bodyHtmlWithPrompts,
            customerName,
            signatureLines: [],
            footerLinks: [
                { label: 'Instagram', url: 'https://www.instagram.com/flyawayballooning' },
                { label: 'Facebook', url: 'https://www.facebook.com/flyawayballooning' }
            ]
        });
    },
    'Flight Voucher Confirmation': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🎈 Your Flight Voucher is ready';

        const customMessageHtml = template?.body
            ? extractMessageFromTemplateBody(template.body)
            : '';
        const messageHtml = customMessageHtml || getFlightVoucherMessageHtml(booking);

        // Replace prompts in the message
        const messageWithPrompts = replacePrompts(messageHtml, booking);

        return buildEmailLayout({
            subject,
            headline: '',
            heroImage: HERO_IMAGE_URL,
            bodyHtml: messageWithPrompts,
            customerName,
            signatureLines: [],
            footerLinks: [
                { label: 'Download voucher', url: 'https://flyawayballooning.com/account/vouchers' },
                { label: 'Gift FAQs', url: 'https://flyawayballooning.com/gift-faqs' }
            ]
        });
    },
    'Booking Confirmation': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🎈 Your flight is confirmed';

        const customMessageHtml = template?.body
            ? extractMessageFromTemplateBody(template.body)
            : '';
        const messageHtml = customMessageHtml || getBookingConfirmationMessageHtml(booking);
        
        // Replace prompts in the message (including [Receipt] if present)
        const messageWithPrompts = replacePrompts(messageHtml, booking);
        
        // Check if [Receipt] prompt exists in the original message
        // Only use messageWithPrompts (which already has receipt if prompt was present)
        // Do NOT add receipt if [Receipt] prompt was not in the template
        // Use indexOf instead of test() to avoid regex lastIndex issues
        const hasReceiptPrompt = messageHtml.toLowerCase().indexOf('[receipt]') !== -1;
        const bodyHtml = messageWithPrompts;

        return buildEmailLayout({
            subject,
            headline: '',
            heroImage: HERO_IMAGE_URL,
            bodyHtml,
            customerName,
            signatureLines: [],
            footerLinks: [
                { label: 'View FAQs', url: 'https://flyawayballooning.com/faq' },
                { label: 'Contact us', url: 'mailto:hello@flyawayballooning.com' }
            ]
        });
    },
    'Booking Rescheduled': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🎈 Your flight is rescheduled';
        const defaultBodyHtml = getBookingRescheduledMessageHtml(booking);
        const bodyHtml = resolveBodyHtml(template, defaultBodyHtml);
        // Replace prompts in the message
        const bodyHtmlWithPrompts = replacePrompts(bodyHtml, booking);

        return buildEmailLayout({
            subject,
            headline: '',
            bodyHtml: bodyHtmlWithPrompts,
            customerName,
            signatureLines: [],
            footerLinks: [
                { label: 'View FAQs', url: 'https://flyawayballooning.com/faq' },
                { label: 'Contact us', url: 'mailto:hello@flyawayballooning.com' }
            ]
        });
    },
    'Gift Card Confirmation': ({ template, booking }) => {
        const purchaserName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🎁 Your Gift Voucher is ready';

        const customMessageHtml = template?.body
            ? extractMessageFromTemplateBody(template.body)
            : '';
        const messageHtml = customMessageHtml || getGiftCardMessageHtml(booking);
        
        // Replace prompts in the message (including [Receipt] if present)
        const messageWithPrompts = replacePrompts(messageHtml, booking);

        return buildEmailLayout({
            subject,
            headline: '',
            heroImage: HERO_IMAGE_URL,
            bodyHtml: messageWithPrompts,
            customerName: purchaserName,
            signatureLines: [],
            footerLinks: [
                { label: 'Download voucher', url: 'https://flyawayballooning.com/account/vouchers' },
                { label: 'Gift FAQs', url: 'https://flyawayballooning.com/gift-faqs' }
            ]
        });
    },
    'Gift Voucher Confirmation': ({ template, booking }) => {
        const purchaserName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🎁 Your Gift Voucher is ready';

        const customMessageHtml = template?.body
            ? extractMessageFromTemplateBody(template.body)
            : '';
        const messageHtml = customMessageHtml || getGiftCardMessageHtml(booking);
        
        // Replace prompts in the message (including [Receipt] if present)
        const messageWithPrompts = replacePrompts(messageHtml, booking);

        return buildEmailLayout({
            subject,
            headline: '',
            heroImage: HERO_IMAGE_URL,
            bodyHtml: messageWithPrompts,
            customerName: purchaserName,
            signatureLines: [],
            footerLinks: [
                { label: 'Download voucher', url: 'https://flyawayballooning.com/account/vouchers' },
                { label: 'Gift FAQs', url: 'https://flyawayballooning.com/gift-faqs' }
            ]
        });
    },
    'Request for Payment/Deposit': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '💳 Payment request';
        const defaultBodyHtml = getPaymentRequestMessageHtml(booking);

        return buildEmailLayout({
            subject,
            headline: 'Almost there — complete your booking',
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName,
            signatureLines: [],
            footerLinks: [
                { label: 'Pay online', url: 'https://flyawayballooning.com/pay' },
                { label: 'Call us', url: 'tel:+441234567890' }
            ]
        });
    },
    'Upcoming Flight Reminder': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🚀 Your flight is coming up';
        const defaultBodyHtml = getUpcomingFlightReminderMessageHtml(booking);

        return buildEmailLayout({
            subject,
            headline: '',
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName,
            signatureLines: [],
            footerLinks: [
                { label: 'Manage booking', url: 'https://flyawayballooning.com/manage' },
                { label: 'Weather FAQs', url: 'https://flyawayballooning.com/weather' }
            ]
        });
    },
    'To Be Updated': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🛠️ Update in progress';
        const defaultBodyHtml = getToBeUpdatedMessageHtml(booking);

        return buildEmailLayout({
            subject,
            headline: '',
            bodyHtml: resolveBodyHtml(template, defaultBodyHtml),
            customerName,
            signatureLines: [],
            footerLinks: [
                { label: 'Contact support', url: 'mailto:hello@flyawayballooning.com' }
            ]
        });
    }
};

const findTemplateBuilder = (name = '') => {
    const trimmed = normalizeTemplateName(name);
    if (!trimmed) return undefined;
    if (DEFAULT_TEMPLATE_BUILDERS[trimmed]) return DEFAULT_TEMPLATE_BUILDERS[trimmed];
    const lower = trimmed.toLowerCase();
    const match = Object.entries(DEFAULT_TEMPLATE_BUILDERS).find(
        ([key]) => key.toLowerCase() === lower
    );
    return match ? match[1] : undefined;
};

export const getDefaultTemplateMessageHtml = (templateName, booking = DEFAULT_EDITOR_BOOKING) => {
    const normalizedName = normalizeTemplateName(templateName).toLowerCase();
    switch (normalizedName) {
        case 'follow up':
            return getFollowUpMessageHtml(booking);
        case 'booking confirmation':
            return getBookingConfirmationMessageHtml(booking);
        case 'booking rescheduled':
            return getBookingRescheduledMessageHtml(booking);
        case 'gift card confirmation':
            return getGiftCardMessageHtml(booking);
        case 'flight voucher confirmation':
            return getFlightVoucherMessageHtml(booking);
        case 'request for payment/deposit':
            return getPaymentRequestMessageHtml(booking);
        case 'upcoming flight reminder':
            return getUpcomingFlightReminderMessageHtml(booking);
        case 'to be updated':
            return wrapParagraphs([
                'We wanted to let you know that we are still finalizing the details of your flight.',
                'We will be in touch as soon as we have an update. Thank you for your patience!'
            ]);
        default:
            return '';
    }
};

export const getDefaultEmailTemplateContent = (template, booking = {}) => {
    if (!template) return null;
    const templateName = template.name || template.subject;
    const builder = findTemplateBuilder(templateName);
    const templateBody = template.body && template.body.trim() !== ''
        ? template.body
        : null;
    const isEdited = template.edited === 1 || template.edited === true;

    if (!builder) {
        if (!templateBody) return null;
        return buildStandardTemplateLayout(template, booking);
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

// Replace prompt placeholders with actual booking data
export const replacePrompts = (html = '', booking = {}) => {
    if (!html || !booking) return html;
    
    // Extract first name from booking name (e.g., "te te" -> "te")
    const bookingName = booking.name || booking.customer_name || '';
    const nameParts = bookingName.trim().split(/\s+/);
    const firstName = nameParts.length > 0 ? nameParts[0] : bookingName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const fullName = bookingName || 'Guest';
    
    const recipientNameRaw = booking.recipient_name || booking.recipientName || booking.recipient?.name || '';
    const recipientFirstName = recipientNameRaw.trim() ? recipientNameRaw.trim().split(/\s+/)[0] : '';
    
    // Replace prompts (case-insensitive)
    let result = html;
    
    // Replace [First Name] or [first name] or [FIRST NAME]
    result = result.replace(/\[First Name\]/gi, escapeHtml(firstName));
    
    // Replace [Last Name] or [last name] or [LAST NAME]
    result = result.replace(/\[Last Name\]/gi, escapeHtml(lastName));
    
    // Replace [Full Name] or [full name] or [FULL NAME]
    result = result.replace(/\[Full Name\]/gi, escapeHtml(fullName));
    
    // Replace [First Name of Recipient]
    result = result.replace(/\[First Name of Recipient\]/gi, escapeHtml(recipientFirstName || ''));
    
    // Replace [Email] or [email] or [EMAIL]
    result = result.replace(/\[Email\]/gi, escapeHtml(booking.email || booking.customer_email || ''));
    
    // Replace [Phone] or [phone] or [PHONE]
    result = result.replace(/\[Phone\]/gi, escapeHtml(booking.phone || booking.customer_phone || ''));
    
    // Replace [Booking ID] or [booking id] or [BOOKING ID]
    result = result.replace(/\[Booking ID\]/gi, escapeHtml(booking.id ? String(booking.id) : ''));
    
    // Replace [Flight Date] or [flight date] or [FLIGHT DATE]
    const flightDate = booking.flight_date || booking.flightDate || '';
    if (flightDate) {
        try {
            const formattedDate = dayjs(flightDate).format('DD/MM/YYYY');
            result = result.replace(/\[Flight Date\]/gi, escapeHtml(formattedDate));
        } catch (e) {
            result = result.replace(/\[Flight Date\]/gi, escapeHtml(flightDate));
        }
    } else {
        result = result.replace(/\[Flight Date\]/gi, '');
    }
    
    // Replace [Location] or [location] or [LOCATION]
    result = result.replace(/\[Location\]/gi, escapeHtml(booking.location || ''));
    
    // Replace [Voucher Code] or [voucher code] or [VOUCHER CODE]
    result = result.replace(/\[Voucher Code\]/gi, escapeHtml(booking.voucher_code || booking.voucherCode || ''));
    
    // Replace [Experience Data] or [experience data] or [EXPERIENCE DATA]
    // Format: "20/11/2025 09:00" (DD/MM/YYYY HH:mm) - matches "Booked For" format
    let experienceData = '';
    const expFlightDate = booking.flight_date || booking.flightDate || '';
    const expTimeSlot = booking.time_slot || booking.timeSlot || '';
    
    if (expFlightDate) {
        try {
            // Parse flight_date
            const dateObj = dayjs(expFlightDate);
            
            // Get time from time_slot if available, otherwise from flight_date
            let timeStr = '';
            if (expTimeSlot) {
                // time_slot format: "HH:mm" or "HH:mm:ss"
                timeStr = expTimeSlot.split(':').slice(0, 2).join(':');
            } else if (expFlightDate.includes(' ') || expFlightDate.includes('T')) {
                // Extract time from flight_date if it contains time
                const timeMatch = expFlightDate.match(/(\d{1,2}):(\d{2})/);
                if (timeMatch) {
                    timeStr = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
                }
            }
            
            // Format date as DD/MM/YYYY
            const formattedDate = dateObj.format('DD/MM/YYYY');
            
            // Combine date and time
            if (timeStr) {
                experienceData = `${formattedDate} ${timeStr}`;
            } else {
                experienceData = formattedDate;
            }
        } catch (e) {
            // Fallback: use raw flight_date if parsing fails
            experienceData = expFlightDate;
        }
    }
    result = result.replace(/\[Experience Data\]/gi, escapeHtml(experienceData));
    
    // Replace [Receipt] or [receipt] or [RECEIPT] with receipt HTML
    // Use replace directly with global flag to replace all occurrences
    const receiptPromptRegex = /\[Receipt\]/gi;
    // Check if [Receipt] exists using indexOf to avoid regex lastIndex issues
    if (result.toLowerCase().indexOf('[receipt]') !== -1) {
        const receiptHtml = getBookingConfirmationReceiptHtml(booking);
        // Replace all occurrences of [Receipt] (case-insensitive)
        result = result.replace(receiptPromptRegex, receiptHtml);
    }
    
    return result;
};

export const buildEmailHtml = ({ templateName, messageHtml, booking, personalNote }) => {
    const effectiveTemplateName = templateName || 'Custom Message';
    const baseMessage = messageHtml && messageHtml.trim() !== ''
        ? normalizeTemplateBodyStyles(sanitizeTemplateHtml(messageHtml))
        : getDefaultTemplateMessageHtml(effectiveTemplateName, booking);
    const messageWithNote = applyPersonalNote(baseMessage, personalNote);
    
    // Replace prompts in the message (including [Receipt] if present)
    const messageWithPromptsReplaced = replacePrompts(messageWithNote, booking);
    
    // Use template builder to get the email layout
    // The template builder will handle [Receipt] prompt correctly
    const layout = getDefaultEmailTemplateContent(
        { name: effectiveTemplateName, body: messageWithPromptsReplaced, edited: true },
        booking
    );
    
    return layout?.body || messageWithPromptsReplaced;
};

export const PERSONAL_NOTE_TOKEN = PERSONAL_NOTE_PLACEHOLDER;

