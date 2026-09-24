import { describe, expect, test } from "bun:test";

import { batCartItem, gearCartItem, priceCart } from "../cart";
import { seedProductRows, toStoreCatalogue } from "../products/model";

import { parseOfferForm } from "./editor";
import {
  bestOffer,
  couponProblem,
  dayInIndia,
  endOfDayInIndia,
  offerCovers,
  offerDates,
  offerNote,
  offerPrice,
  offerStatus,
  startOfDayInIndia,
  toAppliedCoupon,
} from "./model";

const NOW = new Date("2026-10-23T10:00:00+05:30");

function offer(overrides: Partial<Parameters<typeof toAppliedCoupon>[0]> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Diwali Sale",
    percentOff: 20,
    startsAt: startOfDayInIndia("2026-10-12"),
    endsAt: endOfDayInIndia("2026-10-25"),
    scope: "store" as const,
    categories: [] as string[],
    productIds: [] as string[],
    code: null as string | null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("offer days are India days", () => {
  test("an offer runs from midnight on its first day to the end of its last", () => {
    expect(startOfDayInIndia("2026-10-12").toISOString()).toBe("2026-10-11T18:30:00.000Z");
    expect(endOfDayInIndia("2026-10-25").toISOString()).toBe("2026-10-25T18:29:59.999Z");
    expect(dayInIndia(new Date("2026-10-11T19:00:00Z"))).toBe("2026-10-12");
  });

  test("status and wording follow the dates", () => {
    expect(offerStatus(offer(), NOW)).toBe("active");
    expect(offerNote(offer(), NOW)).toBe("Ends in 2 days");
    expect(offerNote(offer(), new Date("2026-10-25T23:00:00+05:30"))).toBe("Ends today");
    expect(offerStatus(offer(), new Date("2026-10-26T00:00:00+05:30"))).toBe("expired");
    expect(offerNote(offer({ startsAt: startOfDayInIndia("2026-12-30"), endsAt: endOfDayInIndia("2027-01-02") }), NOW)).toBe(
      "Starts 30 Dec"
    );
    expect(offerDates(offer(), NOW)).toBe("12 Oct – 25 Oct");
  });

  test("what an offer covers reads plainly", () => {
    const name = (slug: string) => ({ "batting-pads": "Batting Pads", "batting-gloves": "Batting Gloves" })[slug] ?? slug;
    expect(offerCovers(offer(), name)).toBe("Entire store");
    expect(offerCovers(offer({ scope: "categories", categories: ["batting-pads", "batting-gloves"] }), name)).toBe(
      "Batting Pads, Batting Gloves"
    );
    expect(offerCovers(offer({ scope: "products", productIds: ["a", "b"] }), name)).toBe("2 products");
  });
});

describe("prices", () => {
  test("a percentage comes off to the nearest rupee", () => {
    expect(offerPrice(7699, 20)).toBe(6159);
    expect(offerPrice(4999, 15)).toBe(4249);
  });

  test("the best running offer wins; offers don't add up", () => {
    const product = { id: "p1", category: "helmets" };
    const store = offer({ percentOff: 10 });
    const helmets = offer({ percentOff: 25, scope: "categories", categories: ["helmets"] });
    const later = offer({ percentOff: 50, startsAt: startOfDayInIndia("2026-11-01"), endsAt: endOfDayInIndia("2026-11-05") });
    expect(bestOffer([store, helmets, later], product, NOW)?.percentOff).toBe(25);
    expect(bestOffer([store, helmets], { id: "p2", category: "bats" }, NOW)?.percentOff).toBe(10);
  });

  test("the store shows a running offer's price, and the cart charges it", () => {
    const catalogue = toStoreCatalogue(seedProductRows(), { offers: [offer()], now: NOW });
    const bat = catalogue.bats.find((entry) => entry.slug === "run-machine")!;
    expect(bat.regularPrice).toBe(7699);
    expect(bat.price).toBe(6159);
    expect(bat.offer?.name).toBe("Diwali Sale");

    const cart = priceCart([batCartItem("run-machine", undefined, 2, bat.customization)], catalogue, null, NOW);
    expect(cart.subtotalPaise).toBe(615_900 * 2);
    expect(cart.discountPaise).toBe((769_900 - 615_900) * 2);
    expect(cart.lines[0].offer).toEqual({ name: "Diwali Sale", percentOff: 20, code: null });
  });

  test("a coupon applies only to what it covers, and only when it beats the offer already on", () => {
    const catalogue = toStoreCatalogue(seedProductRows(), {
      offers: [offer({ percentOff: 10, scope: "categories", categories: ["bats"] })],
      now: NOW,
    });
    const gloves = catalogue.gear.find((entry) => entry.slug === "elite-batting-gloves")!;
    const bat = catalogue.bats.find((entry) => entry.slug === "run-machine")!;
    const coupon = toAppliedCoupon(offer({ code: "GLOVES15", percentOff: 15, scope: "categories", categories: ["batting-gloves"] }));

    const cart = priceCart([gearCartItem(gloves), batCartItem("run-machine", undefined, 1, bat.customization)], catalogue, coupon, NOW);
    expect(cart.lines[0].offer).toEqual({ name: "Diwali Sale", percentOff: 15, code: "GLOVES15" });
    expect(cart.lines[0].unitPricePaise).toBe(offerPrice(gloves.regularPrice, 15) * 100);
    expect(cart.lines[1].offer?.code).toBeNull();
    expect(cart.coupon).toEqual({ code: "GLOVES15", name: "Diwali Sale", covered: true, applied: true });

    const weaker = toAppliedCoupon(offer({ code: "BATS5", percentOff: 5, scope: "categories", categories: ["bats"] }));
    const onlyBat = priceCart([batCartItem("run-machine", undefined, 1, bat.customization)], catalogue, weaker, NOW);
    expect(onlyBat.coupon).toMatchObject({ covered: true, applied: false });
    expect(onlyBat.lines[0].offer?.percentOff).toBe(10);
  });

  test("an expired coupon takes nothing off", () => {
    const catalogue = toStoreCatalogue(seedProductRows());
    const coupon = toAppliedCoupon(offer({ code: "OLD", endsAt: endOfDayInIndia("2026-10-20") }));
    const cart = priceCart([gearCartItem(catalogue.gear[0])], catalogue, coupon, NOW);
    expect(cart.discountPaise).toBe(0);
    expect(cart.coupon).toMatchObject({ covered: false, applied: false });
  });

  test("delivery is charged per order when it isn't free", () => {
    const catalogue = toStoreCatalogue(seedProductRows(), { deliveryFeePaise: 15_000 });
    const cart = priceCart([gearCartItem(catalogue.gear[0])], catalogue);
    expect(cart.shippingPaise).toBe(15_000);
    expect(cart.totalPaise).toBe(cart.subtotalPaise + 15_000);
    expect(priceCart([], catalogue).totalPaise).toBe(0);
  });
});

describe("coupon codes", () => {
  test("say why a code can't be used", () => {
    expect(couponProblem(undefined, NOW)).toBe("This code isn't valid.");
    expect(couponProblem(offer({ startsAt: startOfDayInIndia("2026-12-30"), endsAt: endOfDayInIndia("2027-01-02") }), NOW)).toBe(
      "This code works from 30 Dec."
    );
    expect(couponProblem(offer({ endsAt: endOfDayInIndia("2026-10-20") }), NOW)).toBe("This code has expired.");
    expect(couponProblem(offer(), NOW)).toBeNull();
  });
});

describe("the offer form", () => {
  function form(fields: Record<string, string | string[]>) {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) for (const entry of [value].flat()) data.append(name, entry);
    return data;
  }
  const valid = { name: "Diwali Sale", percentOff: "20", startDate: "2026-10-12", endDate: "2026-10-25", scope: "store", code: " diwali20 " };

  test("a valid offer parses into India-day times and an upper-case code", () => {
    const parsed = parseOfferForm(form(valid), { isNew: true, now: NOW });
    expect(parsed.ok && parsed.values).toMatchObject({
      percentOff: 20,
      startsAt: startOfDayInIndia("2026-10-12"),
      endsAt: endOfDayInIndia("2026-10-25"),
      code: "DIWALI20",
    });
  });

  test("uses the brief's messages", () => {
    const parsed = parseOfferForm(form({ ...valid, name: "", percentOff: "95", endDate: "2026-10-01", scope: "categories" }), {
      isNew: true,
      now: NOW,
    });
    expect(!parsed.ok && parsed.fieldErrors).toEqual({
      name: "Enter an offer name",
      percentOff: "Enter a discount between 1 and 90",
      dates: "The end date can't be before the start date",
      scope: "Choose at least one category",
    });
  });

  test("a new offer can't end in the past, but an old one can still be saved", () => {
    const old = { ...valid, startDate: "2026-08-13", endDate: "2026-08-15" };
    expect(parseOfferForm(form(old), { isNew: true, now: NOW }).ok).toBe(false);
    expect(parseOfferForm(form(old), { isNew: false, now: NOW }).ok).toBe(true);
  });
});
