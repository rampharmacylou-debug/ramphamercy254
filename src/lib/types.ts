export type Product = {
  id: string;
  sku: string;
  no: string;
  product: string;
  packsize: string;
  unitPrice: string;
  price: string;
  barcode: string;
  updatedAt?: string;
};

export type PaidStatus = "paid" | "partial" | "unpaid";

export type InvoiceAction = "goes" | "stays" | "diary";

export type DiaryEntry = {
  id: string;
  clientId?: string;
  clientName: string;
  date: string;
  itemsTaken: string;
  qty: number;
  transport: number;
  paidStatus: PaidStatus;
  /** null/undefined on entries created before this field existed */
  invoiceAction?: InvoiceAction | null;
  /** 0 = no discount */
  discountPercent?: number;
};

export type TransportRecord = {
  id: string;
  clientId?: string;
  clientName: string;
  riderName: string;
  routeName: string;
  riderPrice: number;
  phamPrice: number;
  updatedAt?: string;
};

export type SavedClient = {
  id: string;
  clientName: string;
  phone: string;
  routeName: string;
  riderPrice: number;
  phamPrice: number;
};
