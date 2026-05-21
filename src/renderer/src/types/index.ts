export interface Client {
  id: string;
  name: string;
  address: string;
  gstin: string;
  state: string;
  stateCode: string;
  defaultRate: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  sacCode: string;
  waterConsumption: number;
  rate: number;
  extraCharges: number;
  baseCharge: number;
  taxableAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  clientId: string;
  items: InvoiceItem[];
  totals: {
    baseCharge: number;
    extraCharges: number;
    amountBeforeTax: number;
    cgstAmount: number;
    sgstAmount: number;
    totalTaxAmount: number;
    amountAfterTax: number;
    previousOutstanding: number;
  };
  dpc: {
    ifPaidAfterDate: string;
    pleasePayRs: number;
  };
  status: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
}

export interface Receipt {
  id: string;
  receiptNo: string;
  date: string;
  invoiceId: string;
  paymentMethod: 'Cash' | 'Cheque' | 'Draft';
  allocation: 'Full' | 'Part';
  amountReceived: number;
  refNumber?: string; // Cheque/Draft Number
  instrumentDate?: string;
}

declare global {
  interface Window {
    billingAPI: {
      fetchClients: () => Promise<Client[]>;
      saveClient: (clientData: Client) => Promise<{ success: boolean; data: Client }>;
      saveInvoice: (invoiceData: Invoice) => Promise<{ success: boolean; data: Invoice }>;
      saveReceipt: (receiptData: Receipt) => Promise<{ success: boolean; data: Receipt }>;
      printDocument: (documentType: 'invoice' | 'receipt' | 'both', data: any) => Promise<boolean>;
    };
  }
}
