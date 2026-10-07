// Where the shop is on Google Maps: its place on Google (the listing with the
// opening hours and reviews), the map the footer embeds, and the link that
// opens the listing for directions. The address people read comes from
// Settings; this is the pin behind it, which does not move. Pure.

/** The shop's Google Maps place id ("Astaad Sports", MD Market, Pitampura). */
export const PLACE_ID = "ChIJy6WZzuT9DDkR2bQvPvjS6sQ";

/** The pin, as Google Maps places it. */
export const SHOP_COORDINATES = { latitude: 28.6999709, longitude: 77.1413689 };

/**
 * Google Maps' own "Share > Embed a map" address for the place, which needs
 * no API key. Loaded by the footer's map only when it scrolls into view.
 */
export const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3499.654806691904!2d77.1413689!3d28.699970899999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfde4ce99a5cb%3A0xc4ead2f83e2fb4d9!2sAstaad%20Sports!5e0!3m2!1sen!2sin!4v1791358356870!5m2!1sen!2sin";

/**
 * Opens the shop's listing in Google Maps (the app on a phone), ready for
 * directions. The place id picks the listing; the address is what Maps
 * shows if the id is ever unknown to it.
 */
export function mapsPlaceUrl(address: string | null): string {
  const query = encodeURIComponent(address || "Astaad Sports, MD Market, Pitampura, Delhi");
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${PLACE_ID}`;
}
