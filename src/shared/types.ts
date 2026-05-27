export interface Client {
  id: string;
  name: string;
  address: string;
  gstin: string;
  state: string;
  stateCode: string;
  defaultRate: number;
  isActive?: boolean;
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
  systemSettingsSnapshot?: SystemSettings;
  receipts?: Receipt[];
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

export interface SystemSettings {
  // Section 1: Tax Slabs & Classification
  defaultSacCode: string;
  cgstPercentage: number;
  sgstPercentage: number;

  // Section 2: Active Billing Period
  financialYearPrefix: string;

  // Section 3: Society Profile & Bank Identity
  officialPhone: string;
  officialMobile: string;
  officialEmail: string;
  bankAccountNo: string;
  bankIfscCode: string;
  bankMicrCode: string;

  // Global rate
  defaultWaterRate: number;
}

declare global {
  interface Window {
    billingAPI: {
      fetchClients: () => Promise<Client[]>;
      saveClient: (clientData: Client) => Promise<{ success: boolean; data: Client }>;
      toggleClientStatus: (clientId: string, isActive: boolean) => Promise<{ success: boolean }>;
      fetchInvoices: () => Promise<(Invoice & { clientName: string })[]>;
      saveInvoice: (invoiceData: Invoice) => Promise<{ success: boolean; data: Invoice }>;
      saveReceipt: (receiptData: Receipt) => Promise<{ success: boolean; data: Receipt }>;
      printDocument: (
        documentType: 'invoice' | 'receipt' | 'both',
        data: {
          invoiceData: Invoice;
          client: Client;
          settings: SystemSettings;
          amountInWords: string;
          receiptData?: Receipt;
        }
      ) => Promise<{ success: boolean; filePath: string }>;
      getSystemSettings: () => Promise<SystemSettings>;
      updateSystemSettings: (settings: SystemSettings) => Promise<{ success: boolean }>;
      getNextInvoiceNo: (prefix: string) => Promise<number>;
      getNextReceiptNo: (prefix: string) => Promise<number>;
    };
  }
}
