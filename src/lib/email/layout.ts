// The shell every order email shares, and the blocks the templates build
// from. Email clients are not browsers: layout is tables, styles are inline,
// and there are no web fonts, images or scripts, so Gmail, Apple Mail and
// Outlook show the same thing. Colours are the tokens in src/app/globals.css.
import { html, raw, type SafeHtml } from "./html";

/** The design tokens the emails use (src/app/globals.css, light theme). */
export const EMAIL_COLOURS = {
  ink: "#0e0e0e",
  inkMuted: "#5f5e5e",
  /** surface-sunken: the page behind the card, and panels on it. */
  sunken: "#f5f5f5",
  /** surface-raised: the card. */
  raised: "#ffffff",
  border: "#ececec",
  borderStrong: "#0e0e0e",
  /** surface-dark: the header band. */
  stage: "#0e0e0e",
  onDark: "#fefefe",
  brandYellow: "#fec502",
  onYellow: "#0e0e0e",
  danger: "#c62828",
} as const;

const C = EMAIL_COLOURS;

/** No web fonts in email: Arial stands in for the storefront's Inter. */
export const EMAIL_FONT = "Arial, Helvetica, sans-serif";

/** Body copy, 15px on 22px (type-body). */
export const TEXT = `font-family:${EMAIL_FONT};font-size:15px;line-height:22px;color:${C.ink};mso-line-height-rule:exactly;`;

/** Small print, 13px on 18px (type-body-sm). */
export const SMALL = `font-family:${EMAIL_FONT};font-size:13px;line-height:18px;color:${C.ink};mso-line-height-rule:exactly;`;

/** Muted ink, added after TEXT or SMALL. */
export const MUTED = `color:${C.inkMuted};`;

/** The attributes of every layout table. */
export const TABLE = raw('role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"');

const CARD_PADDING = 28;

/** One block of the card, full width, with `gap` pixels under it. */
export function block(content: SafeHtml, options: { gap?: number; style?: string } = {}): SafeHtml {
  const { gap = 24, style = "" } = options;
  return html`<table ${TABLE}><tr><td style="padding:0 0 ${gap}px 0;${style}">${content}</td></tr></table>`;
}

/** The tracked capitals above a heading (type-eyebrow). */
export function eyebrow(text: string): SafeHtml {
  return block(html`${text.toUpperCase()}`, {
    gap: 8,
    style: `font-family:${EMAIL_FONT};font-size:12px;line-height:16px;font-weight:bold;letter-spacing:3px;color:${C.inkMuted};mso-line-height-rule:exactly;`,
  });
}

/** The email's one headline (type-heading-lg). */
export function heading(text: SafeHtml | string): SafeHtml {
  return block(
    html`<h1 style="margin:0;font-family:${EMAIL_FONT};font-size:24px;line-height:32px;font-weight:bold;color:${C.ink};mso-line-height-rule:exactly;">${text}</h1>`,
    { gap: 12 }
  );
}

/** A paragraph of body copy; `small` and `muted` for asides. */
export function paragraph(
  content: SafeHtml | string,
  options: { gap?: number; muted?: boolean; small?: boolean } = {}
): SafeHtml {
  const style = (options.small ? SMALL : TEXT) + (options.muted ? MUTED : "");
  return block(html`${content}`, { gap: options.gap ?? 16, style });
}

/** A section's title over a rule, like the panels on the order pages (type-heading-sm). */
export function sectionHeading(text: string): SafeHtml {
  return html`<table ${TABLE}><tr><td style="border-top:1px solid ${C.border};padding:20px 0 12px 0;"><h2 style="margin:0;font-family:${EMAIL_FONT};font-size:16px;line-height:22px;font-weight:bold;color:${C.ink};mso-line-height-rule:exactly;">${text}</h2></td></tr></table>`;
}

/**
 * A bulletproof button: the colour and padding sit on a table cell, so it
 * shows as a button even where the link's own styles are dropped (Outlook).
 * Primary is the yellow call to action; secondary is outlined in ink.
 */
export function button(
  href: string,
  label: string,
  options: { variant?: "primary" | "secondary"; gap?: number } = {}
): SafeHtml {
  const primary = (options.variant ?? "primary") === "primary";
  const background = primary ? C.brandYellow : C.raised;
  const border = primary ? C.brandYellow : C.borderStrong;
  const colour = primary ? C.onYellow : C.ink;
  return block(
    html`<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${background}" style="background-color:${background};border:1px solid ${border};border-radius:10px;padding:13px 24px;"><a href="${href}" target="_blank" style="display:inline-block;font-family:${EMAIL_FONT};font-size:15px;line-height:20px;font-weight:bold;color:${colour};text-decoration:none;mso-line-height-rule:exactly;">${label}</a></td></tr></table>`,
    { gap: options.gap ?? 12 }
  );
}

/**
 * An inline link in body copy or small print: bold and underlined, in ink,
 * or muted ink in the small print (Outlook ignores `color: inherit`).
 */
export function textLink(href: string, label: string, options: { muted?: boolean } = {}): SafeHtml {
  const colour = options.muted ? C.inkMuted : C.ink;
  return html`<a href="${href}" target="_blank" style="color:${colour};text-decoration:underline;font-weight:bold;">${label}</a>`;
}

/** A sunken panel, for what the reader needs to find again (a tracking ID). */
export function panel(content: SafeHtml, options: { gap?: number } = {}): SafeHtml {
  return block(
    html`<table ${TABLE}><tr><td bgcolor="${C.sunken}" style="background-color:${C.sunken};border-radius:10px;padding:16px 20px;">${content}</td></tr></table>`,
    { gap: options.gap ?? 20 }
  );
}

/** A warning that must not be missed: bold danger text in a danger outline, always in words. */
export function notice(content: SafeHtml | string): SafeHtml {
  return block(
    html`<table ${TABLE}><tr><td style="border:1px solid ${C.danger};border-radius:10px;padding:14px 16px;${TEXT}color:${C.danger};font-weight:bold;">${content}</td></tr></table>`,
    { gap: 20 }
  );
}

// Hidden after the preheader so inboxes don't pad the preview with the body.
const PREHEADER_FILLER = raw("&#847;&zwnj;&nbsp;".repeat(60));

/**
 * The whole email: a light page, a 600px card under a dark band carrying the
 * store name as a caps wordmark (after the brand's yellow rule), the body
 * blocks, and small print under the card. Returns the HTML document.
 */
export function emailDocument(input: {
  /** The subject, for the document title. */
  title: string;
  /** The preview line inboxes show after the subject. */
  preheader: string;
  /** The store name, set as the wordmark. */
  brand: string;
  /** Where the wordmark links: the home page. */
  homeUrl: string;
  body: SafeHtml[];
  /** Small print under the card. */
  footer: SafeHtml;
}): string {
  return html`<!DOCTYPE html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${input.title}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;background-color:${C.sunken};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.sunken};">${input.preheader}${PREHEADER_FILLER}</div>
<table ${TABLE} bgcolor="${C.sunken}" style="background-color:${C.sunken};">
<tr>
<td align="center" style="padding:24px 12px 32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table ${TABLE} style="max-width:600px;border-collapse:separate;">
<tr>
<td bgcolor="${C.stage}" style="background-color:${C.stage};border-radius:10px 10px 0 0;padding:22px ${CARD_PADDING}px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding:0 12px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="32" height="3" bgcolor="${C.brandYellow}" style="width:32px;height:3px;background-color:${C.brandYellow};font-size:3px;line-height:3px;mso-line-height-rule:exactly;">&nbsp;</td></tr></table></td>
<td valign="middle"><a href="${input.homeUrl}" target="_blank" style="font-family:'Arial Black', Arial, Helvetica, sans-serif;font-size:20px;line-height:24px;font-weight:900;font-style:italic;letter-spacing:1px;color:${C.onDark};text-decoration:none;mso-line-height-rule:exactly;">${input.brand.toUpperCase()}</a></td>
</tr></table>
</td>
</tr>
<tr>
<td bgcolor="${C.raised}" style="background-color:${C.raised};border:1px solid ${C.border};border-top:0;border-radius:0 0 10px 10px;padding:32px ${CARD_PADDING}px 12px ${CARD_PADDING}px;">
${input.body}
</td>
</tr>
<tr>
<td style="padding:24px ${CARD_PADDING}px 0 ${CARD_PADDING}px;${SMALL}${MUTED}">
${input.footer}
</td>
</tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td>
</tr>
</table>
</body>
</html>
`.value;
}
