export const site = {
  name: "AgenticForce",
  tagline: "Agentic systems and immersive web",
  /** Where "Start a project" points. Swap for a mailto: or booking link. */
  contactHref: "https://www.connect-agentic.com",
};

export interface Project {
  name: string;
  url: string;
  host: string;
  kind: "Live site" | "Preview build";
  /** Same-origin cover so WebGL can sample it without CORS. */
  cover: string;
}

const cover = (file: string) => `${import.meta.env.BASE_URL}work/${file}.jpg`;

// Names for the preview builds are taken from their hostnames; rename freely.
export const projects: Project[] = [
  {
    name: "Connect Agentic",
    url: "https://www.connect-agentic.com",
    host: "connect-agentic.com",
    kind: "Live site",
    cover: cover("connect-agentic"),
  },
  {
    name: "Elite Professional UAE",
    url: "https://www.eliteprofessionaluae.com",
    host: "eliteprofessionaluae.com",
    kind: "Live site",
    cover: cover("elite-professional"),
  },
  {
    name: "White Aardvark",
    url: "http://white-aardvark-589132.hostingersite.com/#/",
    host: "white-aardvark-589132.hostingersite.com",
    kind: "Preview build",
    cover: cover("white-aardvark"),
  },
  {
    name: "Goldenrod Eagle",
    url: "https://goldenrod-eagle-816596.hostingersite.com/",
    host: "goldenrod-eagle-816596.hostingersite.com",
    kind: "Preview build",
    cover: cover("goldenrod-eagle"),
  },
  {
    name: "Arena",
    url: "https://01a0fcf0-05ef-73d2-9acc-f911cdf2c534.arena.site/",
    host: "arena.site",
    kind: "Preview build",
    cover: cover("arena"),
  },
];

export interface Shot {
  id: string;
  alt: string;
  caption: string;
  /** Shown while the photo streams in, and kept if it never arrives. */
  tint: string;
}

// Unsplash photo ids (images.unsplash.com/<id>).
export const shots: Shot[] = [
  { id: "photo-1451187580459-43490279c0fa", alt: "City lights on the night side of the Earth", caption: "Networks at planetary scale", tint: "#0b1a33" },
  { id: "photo-1518770660439-4636190af475", alt: "Close-up of a green circuit board", caption: "Close to the metal", tint: "#16301f" },
  { id: "photo-1550751827-4bd374c3f58b", alt: "Blue abstract render of a digital network", caption: "Security as a design input", tint: "#0c1f3d" },
  { id: "photo-1526374965328-7f61d4dc18c5", alt: "Green code cascading down a dark screen", caption: "Agents that read the room", tint: "#06210f" },
  { id: "photo-1555066931-4365d14bab8c", alt: "Source code on a monitor in a dark room", caption: "Shipped, not slideware", tint: "#1b1726" },
  { id: "photo-1558494949-ef010cbdcc31", alt: "Server racks lit in blue", caption: "Infrastructure that holds", tint: "#0d1b2e" },
  { id: "photo-1531297484001-80022131f5a1", alt: "Laptop with a glowing screen on a desk", caption: "Interfaces for humans", tint: "#1c1a24" },
  { id: "photo-1504384308090-c894fdcc538d", alt: "Bright open-plan studio workspace", caption: "Studio practice", tint: "#2a2622" },
];

export const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`;
