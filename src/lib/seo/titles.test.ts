import { describe, expect, test } from "bun:test";

import { BAT_RANGES, STORE_CATEGORIES } from "@/lib/catalogue";
import { NO_CUSTOMIZATION, seedProductRows, toStoreCatalogue, type StoreBat } from "@/lib/products/model";

import {
  batAlt,
  batDescription,
  batDescriptor,
  batPhotoAlt,
  batTitle,
  categoryAlt,
  categoryDescription,
  gearAlt,
  gearDescription,
  gearDetails,
  gearPhotoAlt,
  gearTitle,
} from "./titles";

const seeded = toStoreCatalogue(seedProductRows());
const bat = (slug: string) => seeded.bats.find((entry) => entry.slug === slug)!;
const gear = (slug: string) => seeded.gear.find((entry) => entry.slug === slug)!;

describe("bat titles", () => {
  test("a graded bat is named with its grade", () => {
    expect(batTitle(bat("goat"))).toBe("G.O.A.T — Grade 1 English Willow Cricket Bat");
    expect(batDescriptor(bat("run-machine"))).toBe("Grade 4 English Willow Cricket Bat");
  });

  test("a grade that would make the title run long gives way to the range", () => {
    expect(batTitle(bat("legacy-one"))).toBe("Legacy One — English Willow Cricket Bat");
  });

  test("a bat with no grade of its own is named after its range", () => {
    // The catalogue puts the range's name in `grade` when the product has none.
    expect(batTitle({ name: "Falcon Pro", grade: "Kashmir Willow", subcategory: "kashmir-willow" })).toBe(
      "Falcon Pro — Kashmir Willow Cricket Bat"
    );
    expect(batTitle({ name: "Falcon Pro", grade: "", subcategory: "kashmir-willow" })).toBe(
      "Falcon Pro — Kashmir Willow Cricket Bat"
    );
  });

  test("a tennis bat is a tennis ball cricket bat, whatever its grade says", () => {
    expect(batTitle({ name: "Scoop Master", grade: "Tennis Bats", subcategory: "tennis-bats" })).toBe(
      "Scoop Master — Tennis Ball Cricket Bat"
    );
    expect(batDescriptor({ name: "Scoop Master", grade: "Kashmir Willow", subcategory: "tennis-bats" })).toBe(
      "Tennis Ball Cricket Bat"
    );
  });
});

describe("bat descriptions", () => {
  test("a customisable bat says what it is and costs, then names its choices", () => {
    expect(batDescription(bat("goat"))).toBe(
      "Astaad G.O.A.T, a Grade 1 English Willow cricket bat at ₹ 16,499. Choose your weight, profile and handle, with free name engraving and knocking."
    );
    const bare = { ...bat("goat"), customization: { ...bat("goat").customization, engraving: false, matchReady: false } };
    // The delivery promise is added while the whole stays within what search results show.
    expect(batDescription(bare)).toEndWith("Choose your weight, profile and handle. Delivered across India.");
  });

  test("a bat without the builder says how many sizes it comes in", () => {
    const plain: StoreBat = { ...bat("goat"), name: "Scoop Master", subcategory: "tennis-bats", grade: "Tennis Bats", customization: NO_CUSTOMIZATION };
    expect(batDescription({ ...plain, sizes: plain.sizes.slice(0, 2) })).toBe(
      "Astaad Scoop Master, a tennis ball cricket bat in two sizes, at ₹ 16,499. Delivered across India."
    );
    expect(batDescription({ ...plain, sizes: plain.sizes.slice(0, 1) })).toBe(
      "Astaad Scoop Master, a tennis ball cricket bat at ₹ 16,499. Delivered across India."
    );
  });

  test("sizes with prices of their own make it a from price", () => {
    const goat = bat("goat");
    const cheaper = { ...goat, variants: goat.variants.map((variant, index) => (index === 0 ? { ...variant, price: 12999 } : variant)) };
    expect(batDescription(cheaper)).toStartWith("Astaad G.O.A.T, a Grade 1 English Willow cricket bat from ₹ 12,999. ");
  });

  test("an ungraded English willow bat takes 'an'", () => {
    expect(batDescription({ ...bat("goat"), grade: "" })).toContain("an English Willow cricket bat");
  });
});

describe("gear titles and descriptions", () => {
  test("a name that says it is cricket or batting gear stands alone", () => {
    expect(gearTitle(gear("elite-batting-gloves"))).toBe("Elite Batting Gloves");
    expect(gearTitle(gear("club-cricket-helmet"))).toBe("Club Cricket Helmet");
  });

  test("any other name is followed by what it is", () => {
    expect(gearTitle({ name: "Legacy Pro Helmet", categorySlug: "helmets" })).toBe("Legacy Pro Helmet — Cricket Helmet");
    expect(gearTitle({ name: "Player Series Kitbag", categorySlug: "cricket-kitbags" })).toBe(
      "Player Series Kitbag — Cricket Kitbag"
    );
  });

  test("the description has the range and note, what it is sold in and the price", () => {
    expect(gearDescription(gear("pro-cricket-kitbag"))).toBe(
      "Astaad Pro Cricket Kitbag: Pro · Wheelie · full kit. A wheeled cricket kitbag with room for a full kit, in one size. ₹ 3,499, delivered across India."
    );
  });

  test("a note that runs to paragraphs is left to the page and the structured data", () => {
    const note = "Introducing the players helmet, a benchmark of safety, ventilation, and comfort. ".repeat(4).trim();
    const wordy = { ...gear("club-cricket-helmet"), note };
    expect(gearDescription(wordy)).toBe(
      "Astaad Club Cricket Helmet. A cricket helmet with a steel grille and an adjustable fit, in medium, large and XL shells. ₹ 6,999, delivered across India."
    );
    expect(gearDetails(wordy)).toContain("benchmark of safety");
    // The note's own full stop is not doubled.
    expect(gearDetails(wordy)).not.toContain("..");
  });
});

describe("category descriptions", () => {
  const category = (slug: string) => STORE_CATEGORIES.find((entry) => entry.slug === slug)!;

  test("say cricket where the name doesn't, with the count and the lowest price", () => {
    expect(categoryDescription(category("helmets"), 3, 6999)).toBe(
      "Astaad cricket helmets: Head protection you forget you are wearing. 3 models from ₹ 6,999, delivered across India."
    );
    expect(categoryDescription(category("cricket-kitbags"), 1, 3499)).toStartWith(
      "Astaad cricket kitbags: Room for the full kit, built for the road. 1 model from"
    );
  });

  test("a bat range reads as its own words", () => {
    expect(categoryDescription(BAT_RANGES[0], 2, 2499)).toStartWith("Astaad Kashmir willow bats: Durable, value-driven.");
    expect(categoryDescription(BAT_RANGES[1], 1, 999)).toStartWith("Astaad tennis bats: Light, fast");
  });

  test("with nothing on sale there is no count or price", () => {
    expect(categoryDescription(category("helmets"), 0, null)).toBe(
      "Astaad cricket helmets: Head protection you forget you are wearing."
    );
  });
});

describe("photo descriptions", () => {
  const photos = ["https://blob.example/a.webp", "https://blob.example/b.webp", "https://blob.example/c.webp"];

  test("a bat's photo says what the bat is", () => {
    expect(batAlt(bat("goat"))).toBe("Astaad G.O.A.T Grade 1 English Willow Cricket Bat");
    expect(batAlt({ name: "Scoop Master", grade: "Tennis Bats", subcategory: "tennis-bats" })).toBe(
      "Astaad Scoop Master Tennis Ball Cricket Bat"
    );
  });

  test("a gallery photo names its side when the admin marked one, and is numbered otherwise", () => {
    const goat = {
      ...bat("goat"),
      images: photos,
      turn: [
        { side: "face" as const, url: photos[2] },
        { side: "back" as const, url: photos[1] },
      ],
    };
    expect(batPhotoAlt(goat, 0)).toBe("Astaad G.O.A.T Grade 1 English Willow Cricket Bat, photo 1 of 3");
    expect(batPhotoAlt(goat, 1)).toBe("Astaad G.O.A.T Grade 1 English Willow Cricket Bat, back");
    expect(batPhotoAlt(goat, 2)).toBe("Astaad G.O.A.T Grade 1 English Willow Cricket Bat, face");
  });

  test("a product with one photo is not numbered", () => {
    expect(batPhotoAlt({ ...bat("goat"), images: photos.slice(0, 1), turn: [] }, 0)).toBe(
      "Astaad G.O.A.T Grade 1 English Willow Cricket Bat"
    );
    expect(gearPhotoAlt({ ...gear("club-cricket-helmet"), images: photos.slice(0, 1) }, 0)).toBe("Astaad Club Cricket Helmet");
  });

  test("gear says what it is where its name doesn't", () => {
    expect(gearAlt(gear("elite-batting-gloves"))).toBe("Astaad Elite Batting Gloves");
    expect(gearAlt({ name: "Legacy Pro Helmet", categorySlug: "helmets" })).toBe("Astaad Legacy Pro Helmet, cricket helmet");
    expect(gearPhotoAlt({ name: "Player Series Kitbag Black", categorySlug: "cricket-kitbags", images: photos }, 1)).toBe(
      "Astaad Player Series Kitbag Black, cricket kitbag, photo 2 of 3"
    );
  });

  test("a category's or range's photo is named in words", () => {
    const category = (slug: string) => STORE_CATEGORIES.find((entry) => entry.slug === slug)!;
    expect(categoryAlt(category("bats"))).toBe("Astaad cricket bats");
    expect(categoryAlt(category("batting-pads"))).toBe("Astaad cricket batting pads");
    expect(categoryAlt(category("cricket-kitbags"))).toBe("Astaad cricket kitbags");
    expect(categoryAlt(BAT_RANGES[0])).toBe("Astaad Kashmir willow bats");
    expect(categoryAlt(BAT_RANGES[1])).toBe("Astaad tennis bats");
  });
});
