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
const CUSTOMER_PORTAL_BASE_URL = 'https://flyawayballooning-system.com/customerPortal';

const base64Encode = (value = '') => {
    try {
        if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
            return window.btoa(unescape(encodeURIComponent(String(value))));
        }
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(String(value), 'utf8').toString('base64');
        }
    } catch (error) {
        console.warn('Error encoding portal token:', error);
    }
    return null;
};

const buildCustomerPortalToken = (booking = {}) => {
    const explicitToken =
        booking.customerPortalToken ||
        booking.customer_portal_token ||
        booking.portal_token ||
        booking.portalToken ||
        booking.portal_link_token;
    if (explicitToken) return explicitToken;

    // For Flight Voucher, use voucher ID instead of booking ID
    // For Gift Voucher, use voucher ID
    // For other types, use booking ID
    const isFlightVoucher = booking.book_flight === 'Flight Voucher' || booking.is_flight_voucher;
    const isGiftVoucher = booking.book_flight === 'Gift Voucher';
    
    // Get voucher ID from _original if available, or from booking.voucher_id
    const voucherId = booking._original?.id || booking.voucher_id || null;
    
    // Determine ID to use: voucher ID for Flight/Gift Voucher, booking ID for others
    let idToUse = '';
    if (isFlightVoucher || isGiftVoucher) {
        // Use voucher ID with prefix for Flight/Gift Voucher
        if (voucherId) {
            idToUse = `voucher-${voucherId}`;
        } else if (booking.id && String(booking.id).startsWith('voucher-')) {
            // Already in voucher- format
            idToUse = String(booking.id);
        } else {
            // Fallback: use booking ID if voucher ID not available
            idToUse = booking.id ?? booking.booking_id ?? booking.bookingId ?? '';
        }
    } else {
        // For regular bookings, use booking ID
        idToUse = booking.id ?? booking.booking_id ?? booking.bookingId ?? '';
    }
    
    // For Flight Voucher, use purchaser_email instead of email
    // For Gift Voucher, use recipient_email
    // For other types, use email
    let emailToUse = '';
    if (isFlightVoucher) {
        emailToUse = booking.purchaser_email || booking._original?.purchaser_email || booking.email || booking.customer_email || '';
    } else if (isGiftVoucher) {
        emailToUse = booking.recipient_email || booking._original?.recipient_email || booking.email || booking.customer_email || '';
    } else {
        emailToUse = booking.email || booking.customer_email || '';
    }

    // Format created_at to DD/MM/YYYY HH:mm format (same as server-side)
    let formattedCreatedAt = '';
    const rawCreatedAt = booking.created_at ?? booking.created ?? '';
    if (rawCreatedAt) {
        try {
            // Try to parse and format the date using dayjs
            const dateObj = dayjs(rawCreatedAt);
            if (dateObj.isValid()) {
                // Format as DD/MM/YYYY HH:mm (same as server-side)
                formattedCreatedAt = dateObj.format('DD/MM/YYYY HH:mm');
            } else {
                // If parsing fails, use the original value
                formattedCreatedAt = String(rawCreatedAt).trim();
            }
        } catch (e) {
            // If error, use original value
            formattedCreatedAt = String(rawCreatedAt).trim();
        }
    }

    const sourceParts = [
        idToUse,
        booking.voucher_code ?? booking.voucherCode ?? booking.voucher_ref ?? '',
        emailToUse,
        formattedCreatedAt
    ].map((part) => (part == null ? '' : String(part).trim()))
     .filter((part) => part !== '');

    if (!sourceParts.length) return null;
    return base64Encode(sourceParts.join('|'));
};

const getCustomerPortalLink = (booking = {}) => {
    const portalUrl =
        booking.customer_portal_url ||
        booking.customerPortalUrl ||
        booking.portal_url ||
        booking.portalUrl;
    if (portalUrl) return portalUrl;

    const token = buildCustomerPortalToken(booking);
    if (!token) return null;
    const sanitizedToken = token.replace(/[^a-zA-Z0-9+/=_-]/g, '');
    return `${CUSTOMER_PORTAL_BASE_URL}/${sanitizedToken}/index`;
};

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
    emoji = '🎈',
    disableFormatDetection = false
}) => {
    // Normalize body/highlight styles so all templates share the same typography
    // (font-size, font-family, line-height) as the Upcoming Flight Reminder.
    const normalizedBodyHtml = normalizeTemplateBodyStyles(bodyHtml);
    const normalizedHighlightHtml = normalizeTemplateBodyStyles(highlightHtml);

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

    const highlightSection = normalizedHighlightHtml
        ? `<div style="background:#e8e7ff; border-radius:12px; padding:16px 18px; margin-bottom:24px; color:#4338ca; font-size:15px; line-height:1.5;">
                ${normalizedHighlightHtml}
           </div>`
        : '';

    const responsiveStyles = `
    <style>
        @media only screen and (max-width: 600px) {
            /* Hero image - mobile optimized (preserve aspect ratio and quality) */
            img[alt="Fly Away Ballooning"] {
                min-height: auto !important;
                max-height: none !important;
                height: auto !important;
                width: 100% !important;
                max-width: 100% !important;
                object-fit: contain !important;
                object-position: center !important;
                border-radius: 16px 16px 0 0 !important;
                -webkit-backface-visibility: hidden !important;
                backface-visibility: hidden !important;
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: crisp-edges !important;
            }
            
            /* Images in content - responsive (preserve quality) */
            img {
                max-width: 100% !important;
                height: auto !important;
                object-fit: contain !important;
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: crisp-edges !important;
            }
        }
    </style>
    `;

    const formatDetectionMeta = disableFormatDetection
        ? '<meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />'
        : '';
    const bodyContentAttrs = disableFormatDetection ? ' x-apple-data-detectors="false"' : '';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${formatDetectionMeta}
    <title>${escapeHtml(subject)}</title>
    ${responsiveStyles}
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 12px 35px rgba(20,23,38,0.12);">
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
                                        <img src="${heroImage}" alt="Fly Away Ballooning" width="640" style="width:100%; height:auto; min-height:200px; display:block; margin:0 auto; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; background-color:#ffffff; vertical-align:top; object-fit:contain; object-position:center; border-radius:24px 24px 0 0;" />
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
                            <div style="font-size:16px; line-height:1.7; color:#1f2937;"${bodyContentAttrs}>
                                ${normalizedBodyHtml}
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

const buildBookingConfirmationEmail = ({ template, booking }) => {
    const customerName = booking?.name || booking?.customer_name || 'Guest';
    const subject = '🎈 Your flight is confirmed';

    // Prefer custom template body if provided; otherwise use default message HTML
    const customMessageHtml = template?.body
        ? extractMessageFromTemplateBody(template.body)
        : '';
    const messageHtml = customMessageHtml || getBookingConfirmationMessageHtml(booking);
    
    // Replace prompts in the message (including [Receipt] if present)
    const messageWithPrompts = replacePrompts(messageHtml, booking);
    
    // Check if [Receipt] prompt exists in the original message
    // Only use messageWithPrompts (which already has receipt if prompt was present)
    const hasReceiptPrompt = messageHtml.toLowerCase().indexOf('[receipt]') !== -1;
    const bodyHtml = hasReceiptPrompt ? messageWithPrompts : messageWithPrompts;

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
        ],
        disableFormatDetection: true
    });
};

const getBookingConfirmationReceiptHtml = (booking = {}) => {
    const receiptItems = Array.isArray(booking?.passengers) ? booking.passengers : [];
    
    // Get paid, due, and subtotal from booking object
    // Check multiple possible field names for paid amount
    const paidAmount = 
        (booking?.paid != null ? Number(booking.paid) : null) ||
        (booking?.paid_amount != null ? Number(booking.paid_amount) : null) ||
        (booking?.paidAmount != null ? Number(booking.paidAmount) : null) ||
        null;
    
    // Check multiple possible field names for due amount
    const dueAmount = 
        (booking?.due != null ? Number(booking.due) : null) ||
        (booking?.due_amount != null ? Number(booking.due_amount) : null) ||
        (booking?.dueAmount != null ? Number(booking.dueAmount) : null) ||
        null;
    
    // Check multiple possible field names for total amount
    const totalAmount = 
        (booking?.total != null ? Number(booking.total) : null) ||
        (booking?.total_amount != null ? Number(booking.total_amount) : null) ||
        (booking?.totalAmount != null ? Number(booking.totalAmount) : null) ||
        (booking?.price != null ? Number(booking.price) : null) ||
        (booking?.amount != null ? Number(booking.amount) : null) ||
        null;
    
    // Check for original_amount (used in getAllBookingData)
    const originalAmount = 
        (booking?.original_amount != null ? Number(booking.original_amount) : null) ||
        (booking?.originalAmount != null ? Number(booking.originalAmount) : null) ||
        null;
    
    // Use provided subtotal if available, otherwise calculate
    let subtotal = 
        (booking?.subtotal != null ? Number(booking.subtotal) : null) ||
        (booking?.subtotal_amount != null ? Number(booking.subtotal_amount) : null) ||
        (booking?.subtotalAmount != null ? Number(booking.subtotalAmount) : null) ||
        null;
    
    if (subtotal == null) {
        // Calculate subtotal from paid + due
        if (paidAmount != null && dueAmount != null) {
            // Both are available, sum them
            subtotal = paidAmount + dueAmount;
        } else if (dueAmount != null && dueAmount > 0) {
            subtotal = dueAmount;
        } else if (paidAmount != null && paidAmount > 0) {
            // Only use paid if it's greater than 0
            subtotal = paidAmount;
        }
    }
    
    // Priority: Use original_amount if available (it represents the actual booking total)
    // This is especially important for vouchers where paid might be 0
    if (subtotal == null && originalAmount != null && originalAmount > 0) {
        subtotal = originalAmount;
    }
    
    // Fallback to total if subtotal is still null
    if (subtotal == null && totalAmount != null && totalAmount > 0) {
        subtotal = totalAmount;
    }
    
    // If still no subtotal, try to calculate from passengers and price
    if (subtotal == null && receiptItems.length > 0) {
        // Try to get price from voucher data or booking
        const voucherPrice = booking?.voucherData?.price || 
                            booking?.voucherData?.basePrice || 
                            booking?.voucherData?.totalPrice ||
                            booking?.voucher_price ||
                            null;
        if (voucherPrice != null && Number(voucherPrice) > 0) {
            subtotal = Number(voucherPrice) * receiptItems.length;
        }
    }
    
    // If still no subtotal and we have paid amount > 0, use paid as subtotal
    // This handles cases where only paid is available (e.g., fully paid vouchers)
    if (subtotal == null && paidAmount != null && paidAmount > 0) {
        subtotal = paidAmount;
    }
    
    // Final fallback: if paid is 0 and we have original_amount, use it
    // This handles voucher cases where paid is 0 but original_amount has the actual price
    if (subtotal == null && (paidAmount === 0 || paidAmount == null) && originalAmount != null && originalAmount > 0) {
        subtotal = originalAmount;
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
    // For Flight Voucher and Gift Voucher, location should not be shown in Description
    // Check multiple ways to identify Flight Voucher:
    // 1. book_flight === 'Flight Voucher' or contains 'Flight Voucher'
    // 2. is_flight_voucher === true
    // 3. contextType === 'voucher' and not Gift Voucher
    // 4. location is already "-" (set from frontend)
    // 5. voucher_type contains 'Flight Voucher' or is a Flight Voucher type
    // 6. template name is 'Flight Voucher Confirmation' (passed via booking.templateName)
    // Check multiple ways to identify Gift Voucher:
    // 1. book_flight === 'Gift Voucher' or contains 'Gift Voucher'
    // 2. template name is 'Gift Voucher Confirmation' (passed via booking.templateName)
    const bookFlight = String(booking?.book_flight || '').toLowerCase();
    const voucherType = String(booking?.voucher_type || '').toLowerCase();
    const templateName = String(booking?.templateName || '').toLowerCase();
    const isFlightVoucher = 
        bookFlight.includes('flight voucher') || 
        booking?.is_flight_voucher === true ||
        (booking?.contextType === 'voucher' && bookFlight !== 'gift voucher' && !bookFlight.includes('gift')) ||
        booking?.location === '-' ||
        voucherType.includes('flight voucher') ||
        templateName === 'flight voucher confirmation' ||
        templateName === 'flight voucher';
    const isGiftVoucher = 
        bookFlight.includes('gift voucher') || 
        templateName === 'gift voucher confirmation' ||
        templateName === 'gift voucher';
    // For both Flight Voucher and Gift Voucher, location should show "-" instead of actual location
    // This ensures "Bath" or any other location is not displayed for vouchers
    const location = (isFlightVoucher || isGiftVoucher) ? '—' : (booking?.location ? escapeHtml(booking.location) : '');
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
                            ${(isFlightVoucher || isGiftVoucher) ? `—${guestCount > 0 ? `<div style="margin-top:4px; font-size:12px; color:#64748b;">Guests: ${guestCount}</div>` : ''}` : (location ? `${location}${guestCount > 0 ? `<div style="margin-top:4px; font-size:12px; color:#64748b;">Guests: ${guestCount}</div>` : ''}` : (guestCount > 0 ? `<div style="font-size:12px; color:#64748b;">Guests: ${guestCount}</div>` : ''))}
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

        // Add template name to booking object so receipt can identify Flight Voucher
        const bookingWithTemplate = {
            ...booking,
            templateName: 'Flight Voucher Confirmation'
        };

        // Replace prompts in the message
        const messageWithPrompts = replacePrompts(messageHtml, bookingWithTemplate);

        return buildEmailLayout({
            subject,
            headline: '',
            heroImage: HERO_IMAGE_URL,
            bodyHtml: messageWithPrompts,
            customerName,
            signatureLines: [],
            footerLinks: []
        });
    },
    // Alias for "Your Flight Voucher" - uses same builder as "Flight Voucher Confirmation"
    'Your Flight Voucher': ({ template, booking }) => {
        const customerName = booking?.name || booking?.customer_name || 'Guest';
        const subject = template?.subject || '🎈 Your Flight Voucher is ready';

        const customMessageHtml = template?.body
            ? extractMessageFromTemplateBody(template.body)
            : '';
        const messageHtml = customMessageHtml || getFlightVoucherMessageHtml(booking);

        // Add template name to booking object so receipt can identify Flight Voucher
        const bookingWithTemplate = {
            ...booking,
            templateName: 'Your Flight Voucher'
        };

        // Replace prompts in the message
        const messageWithPrompts = replacePrompts(messageHtml, bookingWithTemplate);

        return buildEmailLayout({
            subject,
            headline: '',
            heroImage: HERO_IMAGE_URL,
            bodyHtml: messageWithPrompts,
            customerName,
            signatureLines: [],
            footerLinks: []
        });
    },
    // Booking Confirmation builder (reused for "Your Flight Confirmation" alias)
    'Booking Confirmation': buildBookingConfirmationEmail,
    'Your Flight Confirmation': buildBookingConfirmationEmail,
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
            footerLinks: []
        });
    },
    'Gift Voucher Confirmation': ({ template, booking }) => {
        const purchaserName = booking?.name || booking?.customer_name || 'Guest';
        const subject = '🎁 Your Gift Voucher is ready';

        // Add template name to booking object so receipt can identify Gift Voucher
        const bookingWithTemplate = {
            ...booking,
            templateName: 'Gift Voucher Confirmation'
        };

        const customMessageHtml = template?.body
            ? extractMessageFromTemplateBody(template.body)
            : '';
        const messageHtml = customMessageHtml || getGiftCardMessageHtml(booking);
        
        // Replace prompts in the message (including [Receipt] if present)
        const messageWithPrompts = replacePrompts(messageHtml, bookingWithTemplate);

        return buildEmailLayout({
            subject,
            headline: '',
            heroImage: HERO_IMAGE_URL,
            bodyHtml: messageWithPrompts,
            customerName: purchaserName,
            signatureLines: [],
            footerLinks: []
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
        case 'your flight confirmation':
            return getBookingConfirmationMessageHtml(booking);
        case 'booking rescheduled':
            return getBookingRescheduledMessageHtml(booking);
        case 'gift card confirmation':
            return getGiftCardMessageHtml(booking);
        case 'flight voucher confirmation':
            return getFlightVoucherMessageHtml(booking);
        case 'your flight voucher':
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

        // Insert note at the TOP of the body - right after the opening <body> tag
        const bodyOpenMatch = message.match(/<body[^>]*>/i);
        if (bodyOpenMatch) {
            const insertPos = message.indexOf(bodyOpenMatch[0]) + bodyOpenMatch[0].length;
            return message.slice(0, insertPos) + noteHtml + message.slice(insertPos);
        }

        // No body tag (e.g. partial HTML) - prepend at top
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
    
    // Replace [Customer Portal Link] and [Customer Portal Link:Link Text]
    const customerPortalLink = getCustomerPortalLink(booking);
    
    // Replace [Customer Portal Link:Link Text] format (with custom link text)
    result = result.replace(
        /\[Customer Portal Link:([^\]]+)\]/gi,
        (match, linkText) => {
            if (!customerPortalLink) return '';
            const escapedLinkText = escapeHtml(linkText.trim());
            return `<a href="${customerPortalLink}" target="_blank" rel="noopener noreferrer">${escapedLinkText}</a>`;
        }
    );
    
    // Replace [Customer Portal Link] (without custom text, use URL as text)
    result = result.replace(
        /\[Customer Portal Link\]/gi,
        customerPortalLink
            ? `<a href="${customerPortalLink}" target="_blank" rel="noopener noreferrer">${customerPortalLink}</a>`
            : ''
    );
    
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

// Replace SMS template placeholders with booking data (plain text, no HTML)
export const replaceSmsPrompts = (text = '', booking = {}) => {
    if (!text) return text;
    if (!booking || Object.keys(booking).length === 0) {
        console.warn('⚠️ replaceSmsPrompts: booking is empty, placeholders will not be replaced');
        return text;
    }
    
    // Extract name parts from booking name - try multiple field names
    const bookingName = booking.name || booking.customer_name || booking.booking_name || '';
    const nameParts = bookingName.trim().split(/\s+/).filter(part => part.length > 0);
    const firstName = nameParts.length > 0 ? nameParts[0] : (bookingName || 'Guest');
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const fullName = bookingName || 'Guest';
    
    console.log('🔍 Frontend replaceSmsPrompts - bookingName:', bookingName, 'extracted:', { firstName, lastName, fullName });
    
    // Company name - default to "Fly Away Ballooning"
    const companyName = 'Fly Away Ballooning';
    
    let result = text;
    
    // Replace [First Name] (case-insensitive)
    result = result.replace(/\[First Name\]/gi, firstName);
    
    // Replace [Last Name] (case-insensitive)
    result = result.replace(/\[Last Name\]/gi, lastName);
    
    // Replace [Full Name] (case-insensitive)
    result = result.replace(/\[Full Name\]/gi, fullName);
    
    // Replace [Company Name] (case-insensitive)
    result = result.replace(/\[Company Name\]/gi, companyName);
    
    // Replace [Email] (case-insensitive)
    result = result.replace(/\[Email\]/gi, booking.email || booking.customer_email || '');
    
    // Replace [Phone] (case-insensitive)
    result = result.replace(/\[Phone\]/gi, booking.phone || booking.customer_phone || '');
    
    // Replace [Booking ID] (case-insensitive)
    result = result.replace(/\[Booking ID\]/gi, booking.id ? String(booking.id) : '');
    
    // Replace [Customer Portal Link] (case-insensitive) - for SMS, just return the URL
    const customerPortalLink = getCustomerPortalLink(booking);
    result = result.replace(/\[Customer Portal Link\]/gi, customerPortalLink || '');
    
    // Replace [Flight Date] (case-insensitive)
    const flightDate = booking.flight_date || booking.flightDate || '';
    if (flightDate) {
        try {
            const formattedDate = dayjs(flightDate).format('DD/MM/YYYY');
            result = result.replace(/\[Flight Date\]/gi, formattedDate);
        } catch (e) {
            result = result.replace(/\[Flight Date\]/gi, flightDate);
        }
    } else {
        result = result.replace(/\[Flight Date\]/gi, '');
    }
    
    // Replace [Location] (case-insensitive)
    result = result.replace(/\[Location\]/gi, booking.location || '');
    
    // Replace [Voucher Code] (case-insensitive)
    result = result.replace(/\[Voucher Code\]/gi, booking.voucher_code || booking.voucherCode || '');
    
    // Replace [Experience Data] (case-insensitive)
    // Format: "01/02/2026 11:00" (DD/MM/YYYY HH:mm) - matches "Booked For" format
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
    result = result.replace(/\[Experience Data\]/gi, experienceData);
    
    return result;
};

export const buildEmailHtml = ({ templateName, messageHtml, booking, personalNote }) => {
    const effectiveTemplateName = templateName || 'Custom Message';
    const baseMessage = messageHtml && messageHtml.trim() !== ''
        ? normalizeTemplateBodyStyles(sanitizeTemplateHtml(messageHtml))
        : getDefaultTemplateMessageHtml(effectiveTemplateName, booking);
    const messageWithNote = applyPersonalNote(baseMessage, personalNote);
    
    // Normalize template name for Flight Voucher detection
    const normalizedTemplateName = normalizeTemplateName(effectiveTemplateName).toLowerCase();
    const isFlightVoucherTemplate = normalizedTemplateName === 'flight voucher confirmation' || 
                                     normalizedTemplateName === 'your flight voucher' ||
                                     normalizedTemplateName.includes('flight voucher');
    
    // For Flight Voucher templates, ensure booking object has correct fields for Customer Portal URL generation
    // This matches the structure used in server-side generateFlightVoucherConfirmationEmail
    let bookingWithTemplate = {
        ...booking,
        templateName: effectiveTemplateName
    };
    
    // If this is a Flight Voucher template, ensure Flight Voucher fields are set correctly
    if (isFlightVoucherTemplate) {
        // Set Flight Voucher identification fields
        bookingWithTemplate = {
            ...bookingWithTemplate,
            book_flight: bookingWithTemplate.book_flight || 'Flight Voucher',
            is_flight_voucher: true,
            // Ensure voucher_id is set - use id if it's a voucher, or extract from id if it has voucher- prefix
            voucher_id: bookingWithTemplate.voucher_id || (() => {
                const id = bookingWithTemplate.id || bookingWithTemplate.booking_id || bookingWithTemplate.bookingId;
                if (id && String(id).startsWith('voucher-')) {
                    // Extract voucher ID from voucher-{id} format
                    return String(id).replace(/^voucher-/, '');
                }
                // If id doesn't have voucher- prefix but this is a Flight Voucher, use id as voucher_id
                return id || null;
            })(),
            // Ensure id is set (without voucher- prefix) so buildCustomerPortalToken can add it
            id: bookingWithTemplate.id || bookingWithTemplate.booking_id || bookingWithTemplate.bookingId || null,
            // For Flight Voucher, use purchaser_email if available, otherwise fall back to email
            purchaser_email: bookingWithTemplate.purchaser_email || bookingWithTemplate.email || bookingWithTemplate.customer_email || '',
            // Ensure created_at is formatted (if available)
            created_at: bookingWithTemplate.created_at || bookingWithTemplate.created || '',
            created: bookingWithTemplate.created || bookingWithTemplate.created_at || ''
        };
    }
    
    // Replace prompts in the message (including [Receipt] if present)
    const messageWithPromptsReplaced = replacePrompts(messageWithNote, bookingWithTemplate);
    
    // Use template builder to get the email layout
    // The template builder will handle [Receipt] prompt correctly
    // Pass bookingWithTemplate to ensure templateName is available for receipt generation
    const layout = getDefaultEmailTemplateContent(
        { name: effectiveTemplateName, body: messageWithPromptsReplaced, edited: true },
        bookingWithTemplate
    );
    
    return layout?.body || messageWithPromptsReplaced;
};

export const PERSONAL_NOTE_TOKEN = PERSONAL_NOTE_PLACEHOLDER;

