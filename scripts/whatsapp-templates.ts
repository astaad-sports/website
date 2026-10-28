/**
 * Submit the store's WhatsApp message templates to Meta for approval.
 *
 *   bun scripts/whatsapp-templates.ts          submits each template not there yet
 *   bun scripts/whatsapp-templates.ts --list   only shows each template's status
 *
 * Needs WHATSAPP_ACCESS_TOKEN, WHATSAPP_BUSINESS_ACCOUNT_ID and SITE_URL (the
 * buttons open the site, and a template's address can't change once
 * approved). Reads .env files the way Next.js does. Meta reviews Utility
 * templates in minutes to a day; WhatsApp Manager shows the result.
 */
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";

import { siteUrl } from "../src/lib/site";
import { whatsappConfig } from "../src/lib/whatsapp/config";
import { parameterCount, TEMPLATES, templateSubmission } from "../src/lib/whatsapp/templates";

const root = fileURLToPath(new URL("..", import.meta.url));
loadEnvConfig(root, process.env.NODE_ENV !== "production", { info: () => {}, error: console.error });

const listOnly = process.argv.includes("--list");

interface ExistingTemplate {
  name: string;
  language: string;
  status: string;
}

async function main() {
  const { accessToken, businessAccountId, graphVersion, templateLanguage } = whatsappConfig();
  if (!accessToken || !businessAccountId) {
    throw new Error("Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID first (see .env.example).");
  }
  const site = siteUrl();
  if (!listOnly && !process.env.SITE_URL?.trim()) {
    throw new Error(`Set SITE_URL to the live address first: the buttons would open ${site}.`);
  }
  const api = `https://graph.facebook.com/${graphVersion}/${businessAccountId}/message_templates`;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  const listed = await fetch(`${api}?fields=name,language,status&limit=200`, { headers });
  if (!listed.ok) throw new Error(`Meta (${listed.status}): ${await listed.text()}`);
  const existing = ((await listed.json()) as { data?: ExistingTemplate[] }).data ?? [];

  for (const template of Object.values(TEMPLATES)) {
    if (parameterCount(template.body) !== template.example.length) {
      throw new Error(`${template.name}: the example has ${template.example.length} values for ${parameterCount(template.body)} parameters`);
    }
    const found = existing.find((row) => row.name === template.name && row.language === templateLanguage);
    if (found || listOnly) {
      console.log(`${template.name}: ${found ? found.status : "not submitted"}`);
      continue;
    }
    const response = await fetch(api, {
      method: "POST",
      headers,
      body: JSON.stringify(templateSubmission(template, site, templateLanguage)),
    });
    const body = await response.text();
    console.log(`${template.name}: ${response.ok ? `submitted (${JSON.parse(body).status ?? "pending"})` : `refused: ${body}`}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
