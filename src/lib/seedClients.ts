import { SavedClient } from "./types";
import { makeId } from "./useLocalCollection";

export const CLIENTS_STORAGE_KEY = "manifest.clients";

export const SEED_CLIENTS: SavedClient[] = [
  {
    id: makeId(),
    clientName: "Acme Traders",
    phone: "+254700000001",
    routeName: "Westlands – CBD",
    riderPrice: 300,
    phamPrice: 50,
  },
  {
    id: makeId(),
    clientName: "Greenfields Ltd",
    phone: "+254700000002",
    routeName: "Industrial Area – CBD",
    riderPrice: 450,
    phamPrice: 70,
  },
];
