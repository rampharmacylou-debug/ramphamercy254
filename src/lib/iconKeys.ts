// The icons an admin can pick for menu items and staff tabs. Pure data (no React), so the server can
// check a saved value; the actual drawings live in components/DynamicIcon.tsx.

export const ICON_OPTIONS = [
  { key: "package", label: "Box" },
  { key: "boxes", label: "Boxes" },
  { key: "warehouse", label: "Warehouse" },
  { key: "archive", label: "Archive" },
  { key: "layers", label: "Layers" },
  { key: "pill", label: "Pill" },
  { key: "tablets", label: "Tablets" },
  { key: "syringe", label: "Syringe" },
  { key: "stethoscope", label: "Stethoscope" },
  { key: "heart-pulse", label: "Heart pulse" },
  { key: "cross", label: "Medical cross" },
  { key: "shopping-cart", label: "Cart" },
  { key: "shopping-bag", label: "Shopping bag" },
  { key: "store", label: "Shop" },
  { key: "barcode", label: "Barcode" },
  { key: "tag", label: "Tag" },
  { key: "receipt", label: "Receipt" },
  { key: "wallet", label: "Wallet" },
  { key: "banknote", label: "Cash" },
  { key: "credit-card", label: "Card" },
  { key: "percent", label: "Percent" },
  { key: "scale", label: "Scale" },
  { key: "notebook-pen", label: "Notebook" },
  { key: "book-open", label: "Book" },
  { key: "clipboard-list", label: "Clipboard" },
  { key: "clipboard-check", label: "Checked list" },
  { key: "file-text", label: "Document" },
  { key: "list-checks", label: "Checklist" },
  { key: "users", label: "People" },
  { key: "user", label: "Person" },
  { key: "contact", label: "Contact" },
  { key: "phone", label: "Phone" },
  { key: "mail", label: "Mail" },
  { key: "bell", label: "Bell" },
  { key: "truck", label: "Truck" },
  { key: "bike", label: "Bike" },
  { key: "map", label: "Map" },
  { key: "map-pin", label: "Pin" },
  { key: "route", label: "Route" },
  { key: "calendar", label: "Calendar" },
  { key: "clock", label: "Clock" },
  { key: "star", label: "Star" },
  { key: "heart", label: "Heart" },
  { key: "house", label: "Home" },
  { key: "layout-dashboard", label: "Dashboard" },
  { key: "search", label: "Search" },
  { key: "hash", label: "Number" },
  { key: "eye", label: "Eye" },
  { key: "shield-check", label: "Shield" },
  { key: "settings", label: "Settings" },
] as const;

export type IconKey = (typeof ICON_OPTIONS)[number]["key"];

const KNOWN: ReadonlySet<string> = new Set(ICON_OPTIONS.map((o) => o.key));

export function isIconKey(v: unknown): v is IconKey {
  return typeof v === "string" && KNOWN.has(v);
}
