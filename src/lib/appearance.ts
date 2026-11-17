// Everything about the look of the app that the admin can change (Settings > Appearance).
// Shared by the server (layout, API) and the browser (settings panel, stat cards).

import { IconKey, isIconKey } from "@/lib/iconKeys";

export type ThemeName = "store" | "classic";
export type FontStyle = "store" | "system";

/** The menu items of the admin sidebar. The admin can rename them and pick their icons. */
export const NAV_ITEMS = [
  { key: "products", href: "/products", defaultLabel: "Products", defaultIcon: "package" },
  { key: "diary", href: "/diary", defaultLabel: "Diary", defaultIcon: "notebook-pen" },
  { key: "clients", href: "/clients", defaultLabel: "Clients", defaultIcon: "users" },
  { key: "transport", href: "/transport", defaultLabel: "Transport", defaultIcon: "truck" },
  { key: "settings", href: "/settings", defaultLabel: "Settings", defaultIcon: "settings" },
] as const satisfies readonly { key: string; href: string; defaultLabel: string; defaultIcon: IconKey }[];

export type NavKey = (typeof NAV_ITEMS)[number]["key"];
export type NavEntry = { label: string; icon: IconKey };
export type NavConfig = Record<NavKey, NavEntry>;
export const MAX_NAV_LABEL_LENGTH = 20;

export function defaultNav(): NavConfig {
  return Object.fromEntries(
    NAV_ITEMS.map((n) => [n.key, { label: n.defaultLabel, icon: n.defaultIcon }]),
  ) as NavConfig;
}

export type Appearance = {
  appName: string;
  /** "store" = same look as the pharmacy store website. "classic" = the original Manifest look. */
  theme: ThemeName;
  /** The main color. Used by the "store" theme (buttons, highlights, tints). */
  brandColor: string;
  /** "store" = Bricolage Grotesque + Figtree, the pharmacy store's fonts. */
  fontStyle: FontStyle;
  /** Ids of stat cards the admin switched off (see STAT_CARD_GROUPS). */
  hiddenCards: string[];
  /** Names and icons of the admin sidebar items. */
  nav: NavConfig;
};

// The pharmacy store's default green. If you changed the brand color in the store's
// Site settings, enter the same color here to keep both identical.
export const STORE_BRAND_COLOR = "#0b7a62";

export const DEFAULT_APPEARANCE: Appearance = {
  appName: "Manifest",
  theme: "store",
  brandColor: STORE_BRAND_COLOR,
  fontStyle: "store",
  hiddenCards: [],
  nav: defaultNav(),
};

export const COLOR_PRESETS = [
  { name: "Pharmacy store green", value: STORE_BRAND_COLOR },
  { name: "Teal", value: "#0f766e" },
  { name: "Blue", value: "#1d4ed8" },
  { name: "Indigo", value: "#4338ca" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Rose", value: "#be123c" },
  { name: "Orange", value: "#c2410c" },
  { name: "Slate", value: "#334155" },
];

export const MAX_APP_NAME_LENGTH = 30;

// Every stat card in the app. A card shows unless its id is in `hiddenCards`.
export const STAT_CARD_GROUPS = [
  {
    title: "Products page",
    cards: [
      { id: "products.tracked", label: "Products tracked" },
      { id: "products.missingBarcode", label: "Missing barcode" },
      { id: "products.showing", label: "Showing" },
    ],
  },
  {
    title: "Diary page",
    cards: [
      { id: "diary.entries", label: "Entries logged" },
      { id: "diary.last7", label: "Last 7 days" },
      { id: "diary.outstanding", label: "Outstanding" },
    ],
  },
  {
    title: "Clients page",
    cards: [
      { id: "clients.saved", label: "Clients saved" },
      { id: "clients.showing", label: "Showing" },
    ],
  },
  {
    title: "Client details page",
    cards: [
      { id: "clientDetail.riderPrice", label: "Default rider price" },
      { id: "clientDetail.phamPrice", label: "Default pham price" },
      { id: "clientDetail.trips", label: "Trips logged" },
      { id: "clientDetail.outstanding", label: "Outstanding" },
    ],
  },
  {
    title: "Transport page",
    cards: [
      { id: "transport.trips", label: "Trips logged" },
      { id: "transport.rider", label: "Rider total" },
      { id: "transport.pham", label: "Pham total" },
      { id: "transport.combined", label: "Combined" },
    ],
  },
  {
    title: "Staff view",
    cards: [
      { id: "staff.products.tracked", label: "Products: tracked" },
      { id: "staff.products.showing", label: "Products: showing" },
      { id: "staff.diary.entries", label: "Diary: entries logged" },
      { id: "staff.diary.matches", label: "Diary: matches" },
      { id: "staff.clients.saved", label: "Clients: saved" },
      { id: "staff.clients.matches", label: "Clients: matches" },
      { id: "staff.transport.trips", label: "Transport: trips logged" },
      { id: "staff.transport.price", label: "Transport: price total" },
    ],
  },
] as const;

export type StatCardId = (typeof STAT_CARD_GROUPS)[number]["cards"][number]["id"];

const KNOWN_CARDS: Set<string> = new Set(STAT_CARD_GROUPS.flatMap((g) => g.cards.map((c) => c.id)));

/** Turns anything (database row, request body) into a safe Appearance. Unknown things are dropped. */
export function resolveAppearance(raw: unknown): Appearance {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof r.appName === "string" ? r.appName.trim().slice(0, MAX_APP_NAME_LENGTH) : "";
  return {
    appName: name || DEFAULT_APPEARANCE.appName,
    theme: r.theme === "classic" ? "classic" : "store",
    brandColor:
      typeof r.brandColor === "string" && /^#[0-9a-fA-F]{6}$/.test(r.brandColor)
        ? r.brandColor.toLowerCase()
        : DEFAULT_APPEARANCE.brandColor,
    fontStyle: r.fontStyle === "system" ? "system" : "store",
    hiddenCards: Array.isArray(r.hiddenCards)
      ? [...new Set(r.hiddenCards.filter((id): id is string => typeof id === "string" && KNOWN_CARDS.has(id)))]
      : [],
    nav: resolveNav(r.nav),
  };
}

function resolveNav(raw: unknown): NavConfig {
  const nav = defaultNav();
  if (!raw || typeof raw !== "object") return nav;
  const input = raw as Record<string, Partial<NavEntry> | undefined>;
  for (const item of NAV_ITEMS) {
    const e = input[item.key];
    if (!e || typeof e !== "object") continue;
    const label = typeof e.label === "string" ? e.label.trim().slice(0, MAX_NAV_LABEL_LENGTH) : "";
    nav[item.key] = {
      label: label || item.defaultLabel,
      icon: isIconKey(e.icon) ? e.icon : item.defaultIcon,
    };
  }
  return nav;
}
