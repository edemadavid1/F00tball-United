/**
 * Football United - Firebase Cloud Functions
 * Automated Administrator Email Notification System for New User Registrations
 * FA Safeguarding & Access Control Protocol
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Cloud Function Trigger: Listen for new document creations in /users/{userId}
 * Verifies status: 'pending' and dispatches alert email to the admin team.
 */
exports.notifyAdminOnNewPendingUser = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap, context) => {
        const userId = context.params.userId;
        const userData = snap.data();

        if (!userData) {
            console.log(`[notifyAdminOnNewPendingUser] Document users/${userId} has no data.`);
            return null;
        }

        // STEP 1: Verify status condition
        const status = (userData.status || 'pending').toLowerCase();
        if (status !== 'pending') {
            console.log(`[notifyAdminOnNewPendingUser] User ${userId} (${userData.email || 'no-email'}) has status '${status}'. Skipping notification.`);
            return null;
        }

        // Check if user is a bootstrapped admin that was auto-approved or developer bypass
        const email = (userData.email || '').toLowerCase().trim();
        const isBootstrappedAdmin = (
            email === 'developer@footballunited.local' ||
            email === 'edemadavid1@gmail.com' ||
            email === 'ralph.boer@hillsong.co.uk' ||
            email === 'refugeeresponse@hillsong.co.uk' ||
            email.endsWith('@hillsong.co.uk')
        );

        if (isBootstrappedAdmin) {
            console.log(`[notifyAdminOnNewPendingUser] User ${email} is a recognized bootstrapped administrator. Skipping pending alert.`);
            return null;
        }

        // STEP 2: Extract user details
        const displayName = (userData.displayName || userData.name || email.split('@')[0] || 'New Registrant').trim();
        const requestedRole = userData.role || 'user';
        const registeredAt = userData.createdAt || new Date().toISOString();

        // STEP 3: Setup Admin recipient and Deep Link
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 
                           functions.config()?.notifications?.admin_email || 
                           'admin@football-united.com';

        const appBaseUrl = process.env.APP_BASE_URL || 
                           functions.config()?.app?.url || 
                           'https://www.football-united.com';

        const adminDashboardUrl = `${appBaseUrl.replace(/\/$/, '')}/admin`;

        const subject = 'Action Required: New User Registration';

        // Plaintext version
        const textContent = `
ACTION REQUIRED: New User Registration Awaiting Approval
Football United FA Safeguarding & Access Control

A new user has registered on Football United and requires administrator verification before being granted access:

- Name: ${displayName}
- Email: ${email}
- Requested Role: ${requestedRole.toUpperCase()}
- User ID: ${userId}
- Registration Date: ${registeredAt}
- Status: PENDING APPROVAL

Under FA Youth Safeguarding regulations, all adult accounts must be verified and approved by an administrator before accessing player profiles, youth rosters, or session attendance.

To review and approve or reject this registration, visit the Admin Management Dashboard:
${adminDashboardUrl}

---
Football United SafeGuard UK
https://www.football-united.com
        `.trim();

        // Rich HTML version
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f1f5f9; margin: 0; padding: 24px; line-height: 1.6; }
    .card { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #1e293b, #0f172a); border-bottom: 2px solid #f59e0b; padding: 24px 32px; }
    .header-badge { display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px; }
    .header h1 { font-size: 20px; font-weight: 900; color: #ffffff; margin: 0; }
    .content { padding: 32px; color: #cbd5e1; font-size: 14px; }
    .alert-banner { background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; }
    .alert-banner p { margin: 0; color: #fbbf24; font-size: 13px; font-weight: 600; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #1e293b; border-radius: 12px; overflow: hidden; }
    .details-table td { padding: 12px 18px; border-bottom: 1px solid #334155; font-size: 13px; }
    .details-table tr:last-child td { border-bottom: none; }
    .label { color: #94a3b8; font-weight: 600; width: 35%; }
    .value { color: #f8fafc; font-weight: 700; word-break: break-all; }
    .badge-pending { display: inline-block; background: #f59e0b; color: #0f172a; font-size: 11px; font-weight: 900; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; }
    .cta-container { text-align: center; margin: 32px 0 16px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a !important; font-weight: 800; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); text-transform: uppercase; letter-spacing: 0.03em; }
    .cta-button:hover { background: #d97706; }
    .safeguarding-box { font-size: 11px; color: #64748b; background: rgba(15, 23, 42, 0.6); border: 1px dashed #334155; padding: 12px 16px; border-radius: 8px; margin-top: 24px; }
    .footer { border-top: 1px solid #1e293b; padding: 20px 32px; font-size: 11px; color: #64748b; text-align: center; background: #090d16; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-badge">🛡️ FA Safeguarding Alert</div>
      <h1>Action Required: New User Registration</h1>
    </div>
    <div class="content">
      <div class="alert-banner">
        <p>A new account registration has been submitted and is held in <strong>PENDING REVIEW</strong> status.</p>
      </div>

      <p style="margin-top: 0;">Under FA Safeguarding and UK GDPR policies, all registrations require verification by a designated club administrator before gaining access to youth rosters or coaching data.</p>

      <table class="details-table">
        <tr>
          <td class="label">Full Name</td>
          <td class="value">${displayName}</td>
        </tr>
        <tr>
          <td class="label">Email Address</td>
          <td class="value"><a href="mailto:${email}" style="color: #38bdf8; text-decoration: none;">${email}</a></td>
        </tr>
        <tr>
          <td class="label">Requested Role</td>
          <td class="value" style="text-transform: capitalize;">${requestedRole}</td>
        </tr>
        <tr>
          <td class="label">Registration Status</td>
          <td class="value"><span class="badge-pending">Pending Approval</span></td>
        </tr>
        <tr>
          <td class="label">Registration Time</td>
          <td class="value">${new Date(registeredAt).toUTCString()}</td>
        </tr>
        <tr>
          <td class="label">User UID</td>
          <td class="value" style="font-family: monospace; font-size: 11px; color: #94a3b8;">${userId}</td>
        </tr>
      </table>

      <div class="cta-container">
        <a href="${adminDashboardUrl}" class="cta-button">
          Open Admin Dashboard to Approve &rarr;
        </a>
      </div>

      <div class="safeguarding-box">
        <strong>Direct Link:</strong> <a href="${adminDashboardUrl}" style="color: #38bdf8; word-break: break-all;">${adminDashboardUrl}</a><br>
        <strong>Note:</strong> Approving this account will unlock the club session portal and attendance records for this user.
      </div>
    </div>
    <div class="footer">
      Football United & Game On SafeGuard UK &bull; In accordance with FA Youth Safeguarding Framework.<br>
      This automated alert was dispatched by the Football United Cloud Services Engine.
    </div>
  </div>
</body>
</html>
        `.trim();

        // STEP 4: Send Email via configured provider
        let emailDispatched = false;
        let providerUsed = 'none';

        // 1. Try SendGrid if API key is provided
        const sendgridKey = process.env.SENDGRID_API_KEY || functions.config()?.sendgrid?.key;
        if (sendgridKey) {
            try {
                sgMail.setApiKey(sendgridKey);
                const senderEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@football-united.com';
                await sgMail.send({
                    to: adminEmail,
                    from: senderEmail,
                    subject: subject,
                    text: textContent,
                    html: htmlContent
                });
                emailDispatched = true;
                providerUsed = 'sendgrid';
                console.log(`✅ [notifyAdminOnNewPendingUser] Alert email successfully sent to ${adminEmail} via SendGrid.`);
            } catch (sgErr) {
                console.warn('⚠️ [notifyAdminOnNewPendingUser] SendGrid delivery failed, falling back to SMTP:', sgErr.message);
            }
        }

        // 2. Try SMTP via Nodemailer
        if (!emailDispatched) {
            const smtpHost = process.env.SMTP_HOST || functions.config()?.smtp?.host;
            const smtpUser = process.env.SMTP_USER || functions.config()?.smtp?.user;
            const smtpPass = process.env.SMTP_PASS || functions.config()?.smtp?.pass;
            const smtpPort = Number(process.env.SMTP_PORT || functions.config()?.smtp?.port || 587);
            const smtpSecure = (process.env.SMTP_SECURE === 'true') || (functions.config()?.smtp?.secure === 'true');

            if (smtpHost && smtpUser) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpSecure,
                        auth: {
                            user: smtpUser,
                            pass: smtpPass
                        }
                    });

                    await transporter.sendMail({
                        from: `"Football United SafeGuard" <${smtpUser}>`,
                        to: adminEmail,
                        subject: subject,
                        text: textContent,
                        html: htmlContent
                    });
                    emailDispatched = true;
                    providerUsed = 'smtp';
                    console.log(`✅ [notifyAdminOnNewPendingUser] Alert email successfully sent to ${adminEmail} via SMTP relay (${smtpHost}).`);
                } catch (smtpErr) {
                    console.warn('⚠️ [notifyAdminOnNewPendingUser] SMTP delivery failed:', smtpErr.message);
                }
            }
        }

        // 3. Fallback: Log and record into Firestore mail queue
        if (!emailDispatched) {
            console.log(`📋 [notifyAdminOnNewPendingUser] [Simulated / In-Console Delivery] New user requires approval:\n` +
                        `User: ${displayName} <${email}> | Role: ${requestedRole} | UID: ${userId}\n` +
                        `Admin Link: ${adminDashboardUrl}`);
        }

        // Update user record with notification status to prevent duplicates and enable auditing
        try {
            await snap.ref.update({
                adminNotified: emailDispatched,
                adminNotificationProvider: providerUsed,
                adminNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                adminNotificationTarget: adminEmail
            });
        } catch (updateErr) {
            console.warn('[notifyAdminOnNewPendingUser] Could not update user document with notification flag:', updateErr);
        }

        return {
            success: true,
            userId,
            email,
            status,
            emailDispatched,
            provider: providerUsed,
            adminEmail,
            dashboardUrl: adminDashboardUrl
        };
    });

/**
 * Cloud Function Trigger: Listen for changes to user documents in /users/{userId}
 * Validates state transition: status: 'pending' -> 'approved'
 * Sends an automated welcome/approval email with login CTA to https://www.football-united.com
 */
exports.sendWelcomeApprovalEmail = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const userId = context.params.userId;
        const beforeData = change.before.data();
        const afterData = change.after.data();

        if (!beforeData || !afterData) {
            console.log(`[sendWelcomeApprovalEmail] Missing document data for user ${userId}.`);
            return null;
        }

        // STEP 1 & 2: Validate the State Change
        // Check if change.before.data().status === 'pending' AND change.after.data().status === 'approved'
        const beforeStatus = (beforeData.status || '').toLowerCase().trim();
        const afterStatus = (afterData.status || '').toLowerCase().trim();

        const isApprovalTransition = (
            (beforeData.status === 'pending' && afterData.status === 'approved') ||
            (beforeStatus === 'pending' && afterStatus === 'approved')
        );

        if (!isApprovalTransition) {
            console.log(`[sendWelcomeApprovalEmail] User ${userId} status transition was '${beforeData.status}' -> '${afterData.status}'. Skipping email.`);
            return null;
        }

        // Ensure we do not send multiple emails if document is updated repeatedly after approval
        if (afterData.welcomeEmailSent && beforeData.welcomeEmailSent) {
            console.log(`[sendWelcomeApprovalEmail] Welcome approval email already sent to user ${userId}. Skipping duplicate.`);
            return null;
        }

        // STEP 3: Extract User Details
        const userEmail = (afterData.email || '').trim();
        if (!userEmail) {
            console.warn(`[sendWelcomeApprovalEmail] User ${userId} has no email address. Cannot send approval email.`);
            return null;
        }

        const displayName = (afterData.displayName || afterData.name || userEmail.split('@')[0] || 'Team Member').trim();
        const assignedRole = (afterData.role || 'user').toUpperCase();
        const appLoginUrl = 'https://www.football-united.com';

        // STEP 4: Email Content
        const subject = 'Your Football United Account is Approved!';
        
        const textContent = `
Your Football United Account is Approved!
Welcome to Football United

Hi ${displayName},

Great news! The Football United administration team has reviewed and approved your access.

Your account is now active and ready to use:
- Email: ${userEmail}
- Role: ${assignedRole}
- Status: Approved & Verified

You now have full access to view sessions, submit match results, manage squads, and record attendance in compliance with FA Safeguarding guidelines.

Log in immediately using the link below:
${appLoginUrl}

If you have any questions or need access assistance, please reach out to the administrator team.

Warm regards,
The Football United Team
https://www.football-united.com
        `.trim();

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #064e3b 0%, #059669 100%); padding: 36px 32px; text-align: center;">
                            <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin-bottom: 16px; font-size: 32px;">
                                ⚽
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                                Football United
                            </h1>
                            <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 14px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">
                                Account Approved & Verified
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 32px; color: #1e293b;">
                            <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                                Welcome to Football United, ${displayName}! 🎉
                            </h2>
                            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                                Great news! The admin team has reviewed and approved your access to the Football United management platform. Your account is now officially verified and active.
                            </p>

                            <!-- Account Details Box -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                                            Approved Account Credentials
                                        </p>
                                        <div style="font-size: 14px; color: #1e293b; line-height: 1.8;">
                                            <div><strong>Email:</strong> ${userEmail}</div>
                                            <div><strong>Assigned Role:</strong> <span style="display: inline-block; background-color: #d1fae5; color: #065f46; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 6px;">${assignedRole}</span></div>
                                            <div><strong>Account Status:</strong> <span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 6px;">✓ APPROVED & READY</span></div>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                                You can now sign in to view team fixtures, track attendance, manage squads, and access real-time session logs.
                            </p>

                            <!-- Prominent Call to Action Button -->
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${appLoginUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 36px; border-radius: 10px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4); text-transform: none;">
                                    Sign In to Football United &rarr;
                                </a>
                            </div>

                            <!-- Direct Link Backup -->
                            <p style="margin: 28px 0 0 0; font-size: 13px; line-height: 1.5; color: #94a3b8; text-align: center;">
                                Button not working? Visit directly: <br>
                                <a href="${appLoginUrl}" style="color: #059669; text-decoration: underline; word-break: break-all;">
                                    ${appLoginUrl}
                                </a>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6;">
                            <p style="margin: 0 0 6px 0; font-weight: 600; color: #e2e8f0;">
                                Football United — Dedicated to Community Football & FA Safeguarding
                            </p>
                            <p style="margin: 0; color: #64748b;">
                                Official Web App: <a href="https://www.football-united.com" style="color: #10b981; text-decoration: none;">football-united.com</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();

        let emailDispatched = false;
        let providerUsed = 'none';

        // 1. Try SendGrid
        const sendgridKey = process.env.SENDGRID_API_KEY || functions.config()?.sendgrid?.key;
        if (sendgridKey) {
            try {
                sgMail.setApiKey(sendgridKey);
                const senderEmail = process.env.SENDGRID_FROM_EMAIL || 
                                    functions.config()?.sendgrid?.from_email || 
                                    'noreply@football-united.com';

                await sgMail.send({
                    to: userEmail,
                    from: {
                        name: 'Football United',
                        email: senderEmail
                    },
                    subject: subject,
                    text: textContent,
                    html: htmlContent
                });
                emailDispatched = true;
                providerUsed = 'sendgrid';
                console.log(`✅ [sendWelcomeApprovalEmail] Welcome email sent to ${userEmail} via SendGrid.`);
            } catch (sgErr) {
                console.warn('⚠️ [sendWelcomeApprovalEmail] SendGrid dispatch failed, attempting SMTP fallback:', sgErr.message);
            }
        }

        // 2. Try SMTP via Nodemailer
        if (!emailDispatched) {
            const smtpHost = process.env.SMTP_HOST || functions.config()?.smtp?.host;
            const smtpUser = process.env.SMTP_USER || functions.config()?.smtp?.user;
            const smtpPass = process.env.SMTP_PASS || functions.config()?.smtp?.pass;
            const smtpPort = Number(process.env.SMTP_PORT || functions.config()?.smtp?.port || 587);
            const smtpSecure = (process.env.SMTP_SECURE === 'true') || (functions.config()?.smtp?.secure === 'true');

            if (smtpHost && smtpUser) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpSecure,
                        auth: {
                            user: smtpUser,
                            pass: smtpPass
                        }
                    });

                    await transporter.sendMail({
                        from: `"Football United" <${smtpUser}>`,
                        to: userEmail,
                        subject: subject,
                        text: textContent,
                        html: htmlContent
                    });
                    emailDispatched = true;
                    providerUsed = 'smtp';
                    console.log(`✅ [sendWelcomeApprovalEmail] Welcome email sent to ${userEmail} via SMTP relay (${smtpHost}).`);
                } catch (smtpErr) {
                    console.warn('⚠️ [sendWelcomeApprovalEmail] SMTP delivery failed:', smtpErr.message);
                }
            }
        }

        // 3. Queue into Firestore 'mail' collection (Firebase Trigger Email Extension)
        try {
            await admin.firestore().collection('mail').add({
                to: [userEmail],
                message: {
                    subject: subject,
                    text: textContent,
                    html: htmlContent
                },
                template: {
                    name: 'user_approved_welcome',
                    data: {
                        displayName,
                        email: userEmail,
                        role: assignedRole,
                        loginUrl: appLoginUrl
                    }
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                userId: userId,
                type: 'user_approval_welcome'
            });
            if (!emailDispatched) {
                emailDispatched = true;
                providerUsed = 'firestore_trigger_email_queue';
                console.log(`📬 [sendWelcomeApprovalEmail] Queued welcome approval email in 'mail' collection for Firebase Trigger Email Extension.`);
            }
        } catch (queueErr) {
            console.warn('⚠️ [sendWelcomeApprovalEmail] Notice queueing in mail collection:', queueErr.message);
        }

        // 4. Log in console
        if (!emailDispatched) {
            console.log(`📋 [sendWelcomeApprovalEmail] [Simulated / In-Console Delivery] User account approved:\n` +
                        `Recipient: ${displayName} <${userEmail}> | Role: ${assignedRole} | UID: ${userId}\n` +
                        `Subject: ${subject}\n` +
                        `Login Link: ${appLoginUrl}`);
        }

        // 5. Update user document with welcome email dispatch audit trail
        try {
            await change.after.ref.update({
                welcomeEmailSent: emailDispatched,
                welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
                welcomeEmailProvider: providerUsed,
                welcomeEmailTarget: userEmail
            });
        } catch (updateErr) {
            console.warn('[sendWelcomeApprovalEmail] Notice updating user document with welcome email flag:', updateErr.message);
        }

        return {
            success: true,
            userId,
            email: userEmail,
            emailDispatched,
            provider: providerUsed,
            loginUrl: appLoginUrl
        };
    });

// Alias export for compatibility
exports.onUserApproved = exports.sendWelcomeApprovalEmail;

