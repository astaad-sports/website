// A small HTML builder for emails. Every value is escaped unless it is
// already SafeHtml, so a customer's name, address or engraving can never
// add markup to an email.

/** Markup that is already safe: built by `html`, or wrapped by `raw`. */
export class SafeHtml {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Text for HTML body copy or an attribute: & < > " and ' become entities. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

function render(value: unknown): string {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  return escapeHtml(String(value));
}

/**
 * The template tag: html`<p>${name}</p>`. Strings and numbers are escaped,
 * SafeHtml passes through, arrays are joined with each item treated the same
 * way, and null, undefined and false render nothing, so `${offer && html`…`}`
 * works.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0];
  values.forEach((value, index) => {
    out += render(value) + strings[index + 1];
  });
  return new SafeHtml(out);
}

/** Trusted markup, as is. Never pass it anything a customer typed. */
export function raw(value: string): SafeHtml {
  return new SafeHtml(value);
}
