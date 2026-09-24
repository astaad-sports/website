// Photos our players have sent in, for the home page, newest first. Each alt
// describes what the photo shows; there are no quotes or names to show.
import { siteImage, type SiteImage, type SiteImageKey } from "./site-images";

export interface CustomerPhoto extends SiteImage {
  alt: string;
}

const PHOTOS: [SiteImageKey, string][] = [
  ["reviews/01", "A batter in a team jersey holding an Astaad bat"],
  ["reviews/02", "A poster of a player with an Astaad bat: be good at not giving up"],
  ["reviews/03", "A young player with a new Astaad bat"],
  ["reviews/04", "A player holding an Astaad bat upright"],
  ["reviews/05", "A young batter in helmet and pads raising an Astaad bat"],
  ["reviews/06", "A player on the outfield with an Astaad bat"],
  ["reviews/07", "A batter in a helmet walking out with an Astaad bat"],
  ["reviews/08", "Two players in matching jerseys holding Astaad bats"],
  ["reviews/09", "A player in a red cap holding an Astaad bat"],
  ["reviews/10", "A batter in an India jersey holding an Astaad bat"],
  ["reviews/11", "A player with an Astaad bat and the Player Series kitbag"],
  ["reviews/12", "A batter raising an Astaad bat to celebrate"],
  ["reviews/13", "A player seated with two Astaad bats"],
  ["reviews/14", "A player holding a ball and an Astaad bat"],
  ["reviews/15", "A team of players holding their Astaad bats"],
  ["reviews/16", "A batter playing a shot in a match"],
  ["reviews/17", "A batter at the crease with an Astaad bat"],
  ["reviews/18", "A player holding an Astaad bat across the body"],
  ["reviews/19", "A 1000 runs poster of a player holding an Astaad bat"],
  ["reviews/20", "A batter in whites holding two Astaad bats"],
  ["reviews/21", "A batter padded up with an Astaad bat"],
  ["reviews/22", "A batter in the nets with an Astaad bat"],
  ["reviews/23", "A player walking out with an Astaad bat"],
  ["reviews/24", "A batter on a floodlit ground with an Astaad bat"],
  ["reviews/25", "A player with an Astaad bat and a trophy"],
  ["reviews/26", "A player holding an Astaad bat at dusk"],
];

export const CUSTOMER_PHOTOS: CustomerPhoto[] = PHOTOS.map(([key, alt]) => ({ ...siteImage(key), alt }));

export interface CustomerClip extends CustomerPhoto {
  /** The still shown before it plays. */
  poster: string;
}

/** A short silent clip, shown first. */
export const CUSTOMER_CLIP: CustomerClip = {
  ...siteImage("reviews/player-series-kitbag"),
  poster: siteImage("reviews/player-series-kitbag-poster").src,
  alt: "A player carrying the Astaad Player Series kitbag and a bat",
};
