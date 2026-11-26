// Message text lives here, not in the services that send it, so a wording or
// branding change is one file. Every builder returns plain text plus HTML; the
// plain part is what `LogMailTransport` scans for the link.

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(heading: string, bodyHtml: string, footer: string): string {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#171717">
  <h1 style="font-size:20px;font-weight:600;margin:0 0 16px">${escapeHtml(heading)}</h1>
  ${bodyHtml}
  <p style="font-size:13px;color:#6b7280;margin-top:24px">${escapeHtml(footer)}</p>
</div>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#171717;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(label)}</a></p>`;
}

export function passwordResetMail(
  name: string,
  url: string,
  minutes: number,
): RenderedMail {
  const subject = 'Reset your Arise KMS password';
  return {
    subject,
    text: `Hello ${name},

Use the link below to choose a new password. It expires in ${minutes} minutes and works once.

${url}

If you did not ask for this, you can ignore this message: your password stays as it is.`,
    html: layout(
      'Reset your password',
      `<p>Hello ${escapeHtml(name)},</p>
<p>Use the button below to choose a new password. The link expires in ${minutes} minutes and works once.</p>
${button(url, 'Choose a new password')}
<p style="font-size:13px;color:#6b7280;word-break:break-all">${escapeHtml(url)}</p>
<p>If you did not ask for this, you can ignore this message: your password stays as it is.</p>`,
      'Arise KMS',
    ),
  };
}

export function inviteMail(name: string, url: string, hours: number): RenderedMail {
  const subject = 'You have been invited to Arise KMS';
  return {
    subject,
    text: `Hello ${name},

An account has been created for you. Use the link below to set a password and sign in. It expires in ${hours} hours.

${url}`,
    html: layout(
      'You have been invited',
      `<p>Hello ${escapeHtml(name)},</p>
<p>An account has been created for you. Use the button below to set a password and sign in. The link expires in ${hours} hours.</p>
${button(url, 'Set your password')}
<p style="font-size:13px;color:#6b7280;word-break:break-all">${escapeHtml(url)}</p>`,
      'Arise KMS',
    ),
  };
}