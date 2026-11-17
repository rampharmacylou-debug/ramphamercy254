import {
  Archive, Banknote, Barcode, Bell, Bike, BookOpen, Boxes, ClipboardCheck, ClipboardList, Clock, Calendar,
  Contact, CreditCard, Cross, Eye, FileText, Hash, Heart, HeartPulse, House, Layers, LayoutDashboard,
  ListChecks, Mail, Map, MapPin, NotebookPen, Package, Percent, Phone, Pill, Receipt, Route, Scale,
  Search, Settings, ShieldCheck, ShoppingBag, ShoppingCart, Star, Stethoscope, Store, Syringe, Tablets,
  Tag, Truck, User, Users, Wallet, Warehouse,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/lib/iconKeys";

// Every icon an admin can pick (keys come from lib/iconKeys.ts). Add a new one in both places.
const ICONS: Record<IconKey, LucideIcon> = {
  package: Package,
  boxes: Boxes,
  warehouse: Warehouse,
  archive: Archive,
  layers: Layers,
  pill: Pill,
  tablets: Tablets,
  syringe: Syringe,
  stethoscope: Stethoscope,
  "heart-pulse": HeartPulse,
  cross: Cross,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  store: Store,
  barcode: Barcode,
  tag: Tag,
  receipt: Receipt,
  wallet: Wallet,
  banknote: Banknote,
  "credit-card": CreditCard,
  percent: Percent,
  scale: Scale,
  "notebook-pen": NotebookPen,
  "book-open": BookOpen,
  "clipboard-list": ClipboardList,
  "clipboard-check": ClipboardCheck,
  "file-text": FileText,
  "list-checks": ListChecks,
  users: Users,
  user: User,
  contact: Contact,
  phone: Phone,
  mail: Mail,
  bell: Bell,
  truck: Truck,
  bike: Bike,
  map: Map,
  "map-pin": MapPin,
  route: Route,
  calendar: Calendar,
  clock: Clock,
  star: Star,
  heart: Heart,
  house: House,
  "layout-dashboard": LayoutDashboard,
  search: Search,
  hash: Hash,
  eye: Eye,
  "shield-check": ShieldCheck,
  settings: Settings,
};

type Props = { name: IconKey; size?: number; strokeWidth?: number; className?: string };

/** Draws one of the icons the admin can choose. Works in server and browser components. */
export default function DynamicIcon({ name, size = 17, strokeWidth = 2, className }: Props) {
  const Icon = ICONS[name] ?? Tag;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
