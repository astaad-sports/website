import { describe, expect, test } from "bun:test";

import { escapeHtml, html, raw, SafeHtml } from "./html";

test("escapeHtml turns & < > \" and ' into entities", () => {
  expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
    "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;"
  );
  expect(escapeHtml("plain text")).toBe("plain text");
});

describe("html", () => {
  test("strings and numbers are escaped", () => {
    const name = `<script>alert("hi")</script>`;
    expect(html`<p>${name} × ${3}</p>`.value).toBe(
      "<p>&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt; × 3</p>"
    );
  });

  test("values in attributes cannot break out of the quotes", () => {
    const href = `https://example.com/?a=1&b="><script>`;
    expect(html`<a href="${href}">x</a>`.value).toBe(
      '<a href="https://example.com/?a=1&amp;b=&quot;&gt;&lt;script&gt;">x</a>'
    );
  });

  test("SafeHtml passes through, so blocks nest", () => {
    const inner = html`<strong>${"A & B"}</strong>`;
    expect(html`<p>${inner}</p>`.value).toBe("<p><strong>A &amp; B</strong></p>");
    expect(html`${raw("<br>")}`.value).toBe("<br>");
  });

  test("arrays are joined, each item escaped or passed through", () => {
    const items = ["<a>", html`<b>${"&"}</b>`, 2];
    expect(html`<li>${items}</li>`.value).toBe("<li>&lt;a&gt;<b>&amp;</b>2</li>");
    expect(html`${[["<", html`<i></i>`]]}`.value).toBe("&lt;<i></i>");
  });

  test("null, undefined and false render nothing; zero renders", () => {
    const offer: string | null = null;
    expect(html`[${null}${undefined}${false}${offer && html`<em>${offer}</em>`}${0}]`.value).toBe("[0]");
  });

  test("SafeHtml reads as its markup", () => {
    const safe = new SafeHtml("<p>x</p>");
    expect(String(safe)).toBe("<p>x</p>");
    expect(`${raw("<hr>")}`).toBe("<hr>");
  });
});
