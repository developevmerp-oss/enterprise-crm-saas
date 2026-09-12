const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const nodemailer = require('nodemailer');
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');

// 1x1 transparent GIF buffer (43 bytes)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Email Transporter Config
function getEmailTransporter(customConfig = null) {
  const config = customConfig || (process.env.SMTP_HOST && process.env.SMTP_USER ? {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : null);

  if (config && config.host && config.user) {
    return nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port || '587', 10),
      secure: config.secure === true || config.secure === 'true' || parseInt(config.port, 10) === 465,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }
  return null; // Null means simulated/preview mode
}

// --------------------------------------------------------------------------
// 1. PUBLIC TRACKING: OPEN PIXEL
// --------------------------------------------------------------------------
// GET /api/v1/emails/track/open/:token
router.get('/track/open/:token', async (req, res) => {
  const { token } = req.params;

  try {
    if (isPostgresConnected()) {
      const emailRes = await pool.query(
        'SELECT * FROM tracked_emails WHERE tracking_token = $1',
        [token]
      );

      if (emailRes.rows.length > 0) {
        const email = emailRes.rows[0];
        const userAgent = req.headers['user-agent'] || 'Unknown Client';
        const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

        // Update email tracking counters
        const updatedEmail = await pool.query(`
          UPDATE tracked_emails
          SET 
            opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP),
            open_count = open_count + 1,
            last_opened_at = CURRENT_TIMESTAMP,
            status = CASE WHEN status = 'SENT' THEN 'OPENED' ELSE status END,
            user_agent = $1,
            ip_address = $2
          WHERE tracking_token = $3
          RETURNING *
        `, [userAgent, ipAddress, token]);

        const currentOpens = updatedEmail.rows[0].open_count;

        // Update lead score and email tracking status
        if (email.lead_id) {
          await pool.query(`
            UPDATE leads
            SET 
              email_tracking_status = 'OPENED',
              score = LEAST(score + 10, 99),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [email.lead_id]);

          // Log in activity timeline
          await pool.query(`
            INSERT INTO activities (tenant_id, type, description, related_type, related_id)
            VALUES ($1, 'EMAIL_OPENED', $2, 'LEAD', $3)
          `, [
            email.tenant_id,
            `Client opened email "${email.subject}" from inbox (Open count: ${currentOpens})`,
            email.lead_id
          ]);
        }
      }
    }
  } catch (err) {
    console.error('[Tracking Pixel Error]:', err.message);
  }

  // Always return transparent GIF with anti-caching headers so client inboxes trigger every open
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': TRANSPARENT_GIF_BUFFER.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  return res.end(TRANSPARENT_GIF_BUFFER);
});

// --------------------------------------------------------------------------
// 2. PUBLIC TRACKING: PROPOSAL / CTA CLICK REDIRECT
// --------------------------------------------------------------------------
// GET /api/v1/emails/track/click/:token
router.get('/track/click/:token', async (req, res) => {
  const { token } = req.params;
  const targetUrl = req.query.target;

  let redirectDestination = 'http://localhost:3000';

  try {
    if (isPostgresConnected()) {
      const emailRes = await pool.query(
        'SELECT * FROM tracked_emails WHERE tracking_token = $1',
        [token]
      );

      if (emailRes.rows.length > 0) {
        const email = emailRes.rows[0];

        // Update email tracking record
        await pool.query(`
          UPDATE tracked_emails
          SET 
            clicked_at = COALESCE(clicked_at, CURRENT_TIMESTAMP),
            click_count = click_count + 1,
            last_clicked_at = CURRENT_TIMESTAMP,
            status = 'CLICKED'
          WHERE tracking_token = $1
        `, [token]);

        // If quotation linked, mark viewed
        if (email.quotation_id) {
          await pool.query(`
            UPDATE quotations
            SET status = CASE WHEN status = 'DRAFT' THEN 'SENT' ELSE status END,
                view_count = COALESCE(view_count, 0) + 1
            WHERE id = $1
          `, [email.quotation_id]);
        }

        // Update lead score for high engagement
        if (email.lead_id) {
          await pool.query(`
            UPDATE leads
            SET 
              email_tracking_status = 'CLICKED',
              score = LEAST(score + 20, 99),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [email.lead_id]);

          await pool.query(`
            INSERT INTO activities (tenant_id, type, description, related_type, related_id)
            VALUES ($1, 'PROPOSAL_CLICKED', $2, 'LEAD', $3)
          `, [
            email.tenant_id,
            `Client clicked Proposal link in email "${email.subject}"!`,
            email.lead_id
          ]);
        }

        // Determine destination
        const proposalToken = email.proposal_token || token;
        const defaultProposalPage = `http://localhost:3000/proposal/${proposalToken}`;
        redirectDestination = targetUrl ? decodeURIComponent(targetUrl) : defaultProposalPage;
      }
    }
  } catch (err) {
    console.error('[Tracking Click Error]:', err.message);
  }

  return res.redirect(302, redirectDestination);
});

// --------------------------------------------------------------------------
// 3. PUBLIC: CLIENT PROPOSAL DATA ENDPOINT
// --------------------------------------------------------------------------
// GET /api/v1/emails/public/proposal/:token
router.get('/public/proposal/:token', async (req, res) => {
  const { token } = req.params;

  try {
    if (isPostgresConnected()) {
      // Find email record by proposal_token or tracking_token
      const emailRes = await pool.query(`
        SELECT te.*, t.name as tenant_name, t.settings as tenant_settings
        FROM tracked_emails te
        LEFT JOIN tenants t ON te.tenant_id = t.id
        WHERE te.proposal_token = $1 OR te.tracking_token = $1
        LIMIT 1
      `, [token]);

      if (emailRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Proposal not found or link expired.' });
      }

      const email = emailRes.rows[0];
      let quotation = null;

      if (email.quotation_id) {
        const qRes = await pool.query('SELECT * FROM quotations WHERE id = $1', [email.quotation_id]);
        if (qRes.rows.length > 0) {
          quotation = qRes.rows[0];
        }
      }

      let lead = null;
      if (email.lead_id) {
        const lRes = await pool.query('SELECT * FROM leads WHERE id = $1', [email.lead_id]);
        if (lRes.rows.length > 0) {
          lead = lRes.rows[0];
        }
      }

      return res.json({
        success: true,
        data: {
          email: {
            id: email.id,
            subject: email.subject,
            recipient_email: email.recipient_email,
            recipient_name: email.recipient_name,
            sender_name: email.sender_name,
            sent_at: email.sent_at,
            status: email.status
          },
          quotation,
          lead,
          tenant_name: email.tenant_name || 'Scaloy Digital Growth',
          tenant_settings: email.tenant_settings || { currency: 'USD' }
        }
      });
    }

    res.status(404).json({ success: false, error: 'Database unavailable' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 4. PUBLIC: CLIENT ACCEPTS PROPOSAL
// --------------------------------------------------------------------------
// POST /api/v1/emails/public/proposal/:token/accept
router.post('/public/proposal/:token/accept', async (req, res) => {
  const { token } = req.params;
  const { notes, signer_name } = req.body;

  try {
    if (isPostgresConnected()) {
      const emailRes = await pool.query(`
        SELECT * FROM tracked_emails
        WHERE proposal_token = $1 OR tracking_token = $1
        LIMIT 1
      `, [token]);

      if (emailRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Proposal record not found.' });
      }

      const email = emailRes.rows[0];

      // Update email status to ACCEPTED
      await pool.query(`
        UPDATE tracked_emails
        SET status = 'ACCEPTED'
        WHERE id = $1
      `, [email.id]);

      // Update quotation status
      if (email.quotation_id) {
        await pool.query(`
          UPDATE quotations
          SET status = 'ACCEPTED', accepted_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [email.quotation_id]);
      }

      // Update Deal if linked
      if (email.deal_id) {
        await pool.query(`
          UPDATE deals
          SET status = 'WON', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [email.deal_id]);
      }

      // Update Lead if linked
      if (email.lead_id) {
        await pool.query(`
          UPDATE leads
          SET status = 'CONVERTED', score = 99, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [email.lead_id]);

        await pool.query(`
          INSERT INTO activities (tenant_id, type, description, related_type, related_id)
          VALUES ($1, 'PROPOSAL_ACCEPTED', $2, 'LEAD', $3)
        `, [
          email.tenant_id,
          `🎉 Proposal ACCEPTED online by ${signer_name || email.recipient_name || 'Client'}! Deal closed successfully.`,
          email.lead_id
        ]);
      }

      return res.json({
        success: true,
        message: 'Proposal successfully signed and approved! Our team has been notified.'
      });
    }

    res.json({ success: true, message: 'Proposal accepted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. AUTHENTICATED: SEND TRACKED EMAIL
// --------------------------------------------------------------------------
// POST /api/v1/emails/send
router.post('/send', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER', 'SALES_EXECUTIVE']), async (req, res) => {
  try {
    const {
      lead_id,
      deal_id,
      quotation_id,
      recipient_email,
      recipient_name,
      subject,
      body_html,
      body_text,
      sender_name,
      track_opens = true,
      deliverability_mode = 'FULL_TRACKING' // 'FULL_TRACKING' or 'HIGH_INBOX'
    } = req.body;

    if (!recipient_email || !subject || !body_html) {
      return res.status(400).json({ success: false, error: 'Recipient email, Subject, and Email body are required.' });
    }

    const trackingToken = uuidv4();
    const proposalToken = quotation_id ? uuidv4() : null;

    const backendUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5080}`;
    const frontendUrl = process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000';

    // 1. Build Proposal Links (Direct or Tracked Redirect)
    let finalBodyHtml = body_html;
    let plainTextBody = body_text || body_html.replace(/<br\s*[\/]?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '').trim();
    let proposalUrl = null;

    if (proposalToken) {
      const rawProposalLink = `${frontendUrl}/proposal/${proposalToken}`;
      proposalUrl = rawProposalLink;

      // In HIGH_INBOX mode, use direct clean links to prevent corporate link-reputation flags
      const proposalLinkToUse = (deliverability_mode === 'HIGH_INBOX')
        ? rawProposalLink
        : `${backendUrl}/api/v1/emails/track/click/${trackingToken}?target=${encodeURIComponent(rawProposalLink)}`;

      if (finalBodyHtml.includes('{{proposal_link}}')) {
        finalBodyHtml = finalBodyHtml.replace(/\{\{proposal_link\}\}/g, proposalLinkToUse);
      } else {
        const ctaHtml = `
          <p style="margin: 18px 0 10px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">
            You can review our itemized scope of work and commercial proposal here:<br/>
            👉 <a href="${proposalLinkToUse}" style="color: #0b57d0; font-weight: bold; text-decoration: underline;">Review Commercial Proposal &amp; Scope of Work &rarr;</a>
          </p>
        `;
        finalBodyHtml = `${finalBodyHtml}${ctaHtml}`;
      }

      plainTextBody += `\n\nReview Commercial Proposal & Scope of Work: ${proposalLinkToUse}\n`;
    }

    // 2. Build open tracking pixel (only if track_opens is active and NOT high inbox mode)
    let trackingPixelUrl = null;
    if (track_opens && deliverability_mode !== 'HIGH_INBOX') {
      trackingPixelUrl = `${backendUrl}/api/v1/emails/track/open/${trackingToken}`;
      // Anti-spam safe tracking pixel: avoid display:none which spam filters penalize
      const trackingPixelHtml = `<br/><img src="${trackingPixelUrl}" width="1" height="1" alt="" border="0" style="width:1px;height:1px;min-height:1px;outline:none;" />`;
      finalBodyHtml = `${finalBodyHtml}${trackingPixelHtml}`;
    }

    // 3. Attempt real SMTP dispatch (prefer tenant custom SMTP settings if configured)
    let tenantSmtp = null;
    if (isPostgresConnected() && req.tenantId) {
      try {
        const tenantRes = await pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId]);
        tenantSmtp = tenantRes.rows[0]?.settings?.smtp || null;
      } catch (tErr) {
        console.warn('Could not query tenant SMTP settings:', tErr.message);
      }
    }

    const transporter = getEmailTransporter(tenantSmtp);
    let messageId = null;
    let isSimulated = true;

    // Use customized human sender name & email (tenant custom SMTP -> env -> fallback)
    const senderUser = req.user || {};
    const effectiveSenderName = sender_name || tenantSmtp?.from_name || process.env.SMTP_FROM_NAME || `${senderUser.first_name || 'Enterprise'} ${senderUser.last_name || 'Solutions'}`.trim();
    const fromEmail = tenantSmtp?.from_email || tenantSmtp?.user || process.env.SMTP_USER || 'sales@scaloy.com';
    const fromAddress = `"${effectiveSenderName.replace(/"/g, '')}" <${fromEmail}>`;

    const recipientFormatted = recipient_name
      ? `"${recipient_name.replace(/"/g, '')}" <${recipient_email}>`
      : recipient_email;

    if (transporter) {
      try {
        const sendInfo = await transporter.sendMail({
          from: fromAddress,
          to: recipientFormatted,
          replyTo: fromEmail,
          subject,
          text: plainTextBody, // CRITICAL: Multipart/alternative RFC 2046 avoids MIME_HTML_ONLY spam penalty
          html: finalBodyHtml,
          headers: {
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'Importance': 'Normal'
          }
        });
        messageId = sendInfo.messageId;
        isSimulated = false;
        console.log(`✅ [Email Sent via SMTP]: ${messageId} to ${recipient_email} as "${effectiveSenderName}"`);
      } catch (smtpErr) {
        console.error('❌ [SMTP Dispatch Error]:', smtpErr.message);
        throw new Error(`Email Delivery Failed (${process.env.SMTP_HOST}): ${smtpErr.message}`);
      }
    }

    // 4. Save to database
    if (isPostgresConnected()) {
      const senderUser = req.user || {};
      const actualSenderName = sender_name || `${senderUser.first_name || 'Enterprise'} ${senderUser.last_name || 'Rep'}`.trim();

      const insertRes = await pool.query(`
        INSERT INTO tracked_emails (
          tenant_id, lead_id, deal_id, quotation_id,
          recipient_email, recipient_name, sender_id, sender_name,
          subject, body_html, tracking_token, proposal_token,
          status, proposal_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'SENT', $13
        ) RETURNING *
      `, [
        req.tenantId, lead_id || null, deal_id || null, quotation_id || null,
        recipient_email, recipient_name || '', senderUser.id || null, actualSenderName,
        subject, finalBodyHtml, trackingToken, proposalToken, proposalUrl
      ]);

      const savedEmail = insertRes.rows[0];

      // Update lead
      if (lead_id) {
        await pool.query(`
          UPDATE leads
          SET 
            last_email_sent_at = CURRENT_TIMESTAMP,
            email_tracking_status = 'SENT',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [lead_id]);

        await pool.query(`
          INSERT INTO activities (tenant_id, type, description, related_type, related_id)
          VALUES ($1, 'EMAIL_SENT', $2, 'LEAD', $3)
        `, [
          req.tenantId,
          `Sent email "${subject}" with open & proposal click tracking to ${recipient_email}.`,
          lead_id
        ]);
      }

      // Update quotation public_token
      if (quotation_id && proposalToken) {
        await pool.query(`
          UPDATE quotations
          SET public_token = $1, status = CASE WHEN status = 'DRAFT' THEN 'SENT' ELSE status END
          WHERE id = $2
        `, [proposalToken, quotation_id]);
      }

      return res.status(201).json({
        success: true,
        message: isSimulated
          ? 'Email dispatched! (Live tracking active with simulated preview)'
          : 'Email sent successfully via SMTP with live tracking enabled!',
        data: savedEmail,
        tracking: {
          trackingToken,
          proposalToken,
          trackingPixelUrl,
          proposalUrl
        }
      });
    }

    res.status(201).json({
      success: true,
      data: { recipient_email, subject, tracking_token: trackingToken, status: 'SENT' }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 6. AUTHENTICATED: LIST SENT EMAILS & TRACKING STATS
// --------------------------------------------------------------------------
// GET /api/v1/emails
router.get('/', async (req, res) => {
  try {
    const { lead_id, quotation_id, status } = req.query;

    if (isPostgresConnected()) {
      let query = `
        SELECT te.*, 
               l.first_name as lead_first_name, l.last_name as lead_last_name, l.company_name as lead_company,
               q.quote_number, q.total_amount as quote_amount
        FROM tracked_emails te
        LEFT JOIN leads l ON te.lead_id = l.id
        LEFT JOIN quotations q ON te.quotation_id = q.id
        WHERE te.tenant_id = $1
      `;
      const params = [req.tenantId];

      if (lead_id) {
        params.push(lead_id);
        query += ` AND te.lead_id = $${params.length}`;
      }

      if (quotation_id) {
        params.push(quotation_id);
        query += ` AND te.quotation_id = $${params.length}`;
      }

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND te.status = $${params.length}`;
      }

      query += ' ORDER BY te.sent_at DESC LIMIT 100';

      const result = await pool.query(query, params);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }

    res.json({ success: true, count: 0, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/emails/stats
router.get('/stats', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const statsRes = await pool.query(`
        SELECT 
          COUNT(*)::int as total_sent,
          COUNT(CASE WHEN open_count > 0 THEN 1 END)::int as total_opened,
          COUNT(CASE WHEN click_count > 0 THEN 1 END)::int as total_clicked,
          COUNT(CASE WHEN status = 'ACCEPTED' THEN 1 END)::int as total_accepted
        FROM tracked_emails
        WHERE tenant_id = $1
      `, [req.tenantId]);

      const row = statsRes.rows[0];
      const totalSent = row.total_sent || 0;
      const totalOpened = row.total_opened || 0;
      const totalClicked = row.total_clicked || 0;

      const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
      const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0';

      return res.json({
        success: true,
        data: {
          totalSent,
          totalOpened,
          totalClicked,
          totalAccepted: row.total_accepted || 0,
          openRate: `${openRate}%`,
          clickRate: `${clickRate}%`
        }
      });
    }

    res.json({
      success: true,
      data: { totalSent: 0, totalOpened: 0, totalClicked: 0, totalAccepted: 0, openRate: '0%', clickRate: '0%' }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 7. TESTING / SIMULATION ENDPOINT
// --------------------------------------------------------------------------
// POST /api/v1/emails/simulate
// Allows instant simulation of client open or click for testing in one click!
router.post('/simulate', async (req, res) => {
  try {
    const { tracking_token, event } = req.body;
    if (!tracking_token) {
      return res.status(400).json({ success: false, error: 'Tracking token is required.' });
    }

    if (isPostgresConnected()) {
      const emailRes = await pool.query('SELECT * FROM tracked_emails WHERE tracking_token = $1', [tracking_token]);
      if (emailRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tracked email record not found.' });
      }

      const email = emailRes.rows[0];

      if (event === 'open') {
        await pool.query(`
          UPDATE tracked_emails
          SET 
            opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP),
            open_count = open_count + 1,
            last_opened_at = CURRENT_TIMESTAMP,
            status = CASE WHEN status = 'SENT' THEN 'OPENED' ELSE status END
          WHERE tracking_token = $1
        `, [tracking_token]);

        if (email.lead_id) {
          await pool.query(`
            UPDATE leads
            SET email_tracking_status = 'OPENED', score = LEAST(score + 10, 99)
            WHERE id = $1
          `, [email.lead_id]);

          await pool.query(`
            INSERT INTO activities (tenant_id, type, description, related_type, related_id)
            VALUES ($1, 'EMAIL_OPENED', $2, 'LEAD', $3)
          `, [email.tenant_id, `[Simulation] Client opened email "${email.subject}"`, email.lead_id]);
        }

        return res.json({ success: true, message: 'Simulated client inbox email open event!' });
      }

      if (event === 'click') {
        await pool.query(`
          UPDATE tracked_emails
          SET 
            clicked_at = COALESCE(clicked_at, CURRENT_TIMESTAMP),
            click_count = click_count + 1,
            last_clicked_at = CURRENT_TIMESTAMP,
            status = 'CLICKED'
          WHERE tracking_token = $1
        `, [tracking_token]);

        if (email.lead_id) {
          await pool.query(`
            UPDATE leads
            SET email_tracking_status = 'CLICKED', score = LEAST(score + 20, 99)
            WHERE id = $1
          `, [email.lead_id]);

          await pool.query(`
            INSERT INTO activities (tenant_id, type, description, related_type, related_id)
            VALUES ($1, 'PROPOSAL_CLICKED', $2, 'LEAD', $3)
          `, [email.tenant_id, `[Simulation] Client clicked Proposal link in email "${email.subject}"!`, email.lead_id]);
        }

        return res.json({ success: true, message: 'Simulated client proposal link click event!' });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------------------------------------------------------
// 8. SMTP & CUSTOM DOMAIN SETTINGS
// --------------------------------------------------------------------------
// GET /api/v1/emails/settings
router.get('/settings', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER']), async (req, res) => {
  try {
    let customSmtp = null;
    let tenantName = 'Primary Workspace';

    if (isPostgresConnected() && req.tenantId) {
      const tenantRes = await pool.query('SELECT name, settings FROM tenants WHERE id = $1', [req.tenantId]);
      if (tenantRes.rows.length > 0) {
        tenantName = tenantRes.rows[0].name;
        customSmtp = tenantRes.rows[0].settings?.smtp || null;
      }
    }

    const systemDefault = {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
      host: process.env.SMTP_HOST || '',
      port: process.env.SMTP_PORT || '587',
      from_name: process.env.SMTP_FROM_NAME || 'Enterprise Solutions',
      from_email: process.env.SMTP_USER || ''
    };

    res.json({
      success: true,
      data: {
        tenant_name: tenantName,
        is_custom_configured: !!(customSmtp?.host && customSmtp?.user),
        smtp: customSmtp ? {
          ...customSmtp,
          pass: customSmtp.pass ? '••••••••' : ''
        } : null,
        system_default: systemDefault
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/emails/settings
router.post('/settings', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER']), async (req, res) => {
  try {
    const { host, port, secure, user, pass, from_name, from_email, domain } = req.body;

    if (!host || !user) {
      return res.status(400).json({ success: false, error: 'SMTP Host and User/Email are required.' });
    }

    if (isPostgresConnected() && req.tenantId) {
      // Get existing settings to preserve password if not updated
      const tenantRes = await pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId]);
      const currentSettings = tenantRes.rows[0]?.settings || {};
      const existingSmtp = currentSettings.smtp || {};

      const newSmtp = {
        host: host.trim(),
        port: parseInt(port || '587', 10),
        secure: secure === true || secure === 'true' || parseInt(port, 10) === 465,
        user: user.trim(),
        pass: (pass && pass !== '••••••••') ? pass.trim() : existingSmtp.pass || '',
        from_name: from_name ? from_name.trim() : (existingSmtp.from_name || 'Enterprise Sales'),
        from_email: from_email ? from_email.trim() : (existingSmtp.from_email || user.trim()),
        domain: domain ? domain.trim() : (existingSmtp.domain || user.split('@')[1] || ''),
        updated_at: new Date().toISOString()
      };

      await pool.query(`
        UPDATE tenants
        SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{smtp}', $1::jsonb)
        WHERE id = $2
      `, [JSON.stringify(newSmtp), req.tenantId]);

      return res.json({
        success: true,
        message: 'Custom business domain SMTP configuration saved successfully!',
        data: {
          ...newSmtp,
          pass: newSmtp.pass ? '••••••••' : ''
        }
      });
    }

    res.json({ success: true, message: 'Settings saved (mock mode)' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/emails/settings/test
router.post('/settings/test', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER']), async (req, res) => {
  try {
    const { host, port, secure, user, pass, from_name, from_email, test_recipient } = req.body;

    if (!host || !user) {
      return res.status(400).json({ success: false, error: 'SMTP Host and User/Email are required to test connection.' });
    }

    // If password is masked, retrieve real password from database
    let actualPass = pass;
    if (pass === '••••••••' && isPostgresConnected() && req.tenantId) {
      const tenantRes = await pool.query('SELECT settings FROM tenants WHERE id = $1', [req.tenantId]);
      actualPass = tenantRes.rows[0]?.settings?.smtp?.pass || '';
    }

    const testTransporter = getEmailTransporter({
      host: host.trim(),
      port: parseInt(port || '587', 10),
      secure: secure === true || secure === 'true' || parseInt(port, 10) === 465,
      user: user.trim(),
      pass: actualPass
    });

    if (!testTransporter) {
      return res.status(400).json({ success: false, error: 'Could not initialize SMTP transport with provided settings.' });
    }

    // Verify SMTP connection handshake
    await testTransporter.verify();

    let messageDispatched = false;
    let recipientTested = test_recipient || user;

    if (recipientTested) {
      const senderName = from_name || 'Enterprise CRM Test';
      const senderEmail = from_email || user;
      await testTransporter.sendMail({
        from: `"${senderName.replace(/"/g, '')}" <${senderEmail}>`,
        to: recipientTested,
        subject: '✅ SMTP & Domain Deliverability Test Probe: Handshake Successful',
        text: `Hi,\n\nYour custom business domain SMTP connection has been verified successfully!\n\nHost: ${host}\nUser: ${user}\nFrom: ${senderName} <${senderEmail}>\nTime: ${new Date().toUTCString()}\n\nAll outgoing lead generation & proposal outreach will now send directly through this server with authentic corporate identity.`,
        html: `
          <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #059669; margin-top: 0;">✅ SMTP Connection &amp; Deliverability Probe Successful</h2>
            <p>Your custom business email domain has been verified and authenticated.</p>
            <table style="font-size: 13px; margin: 15px 0; border-collapse: collapse;">
              <tr><td style="padding: 4px 8px; color: #64748b;">SMTP Host:</td><td style="padding: 4px 8px; font-weight: bold;">${host}:${port}</td></tr>
              <tr><td style="padding: 4px 8px; color: #64748b;">Authenticated User:</td><td style="padding: 4px 8px; font-weight: bold;">${user}</td></tr>
              <tr><td style="padding: 4px 8px; color: #64748b;">From Identity:</td><td style="padding: 4px 8px; font-weight: bold;">${senderName} &lt;${senderEmail}&gt;</td></tr>
            </table>
            <p style="color: #475569; font-size: 12px; margin-top: 15px;">Outgoing lead generation &amp; commercial proposals are now configured to send directly from this corporate address.</p>
          </div>
        `
      });
      messageDispatched = true;
    }

    res.json({
      success: true,
      message: messageDispatched
        ? `SMTP connection verified and probe email successfully sent to ${recipientTested}!`
        : 'SMTP connection handshake verified successfully!'
    });
  } catch (err) {
    console.error('SMTP test error:', err.message);
    res.status(400).json({ success: false, error: `SMTP Connection Failed: ${err.message}` });
  }
});

module.exports = router;
