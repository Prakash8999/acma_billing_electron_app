import type { Client, Invoice, Receipt, SystemSettings } from '../shared/types';

export const validateClient = (client: Client) => {
  if (!client.name || client.name.trim() === '') {
    throw new Error('Client name is required.');
  }
  if (!client.gstin || client.gstin.length !== 15) {
    throw new Error('GSTIN must be exactly 15 characters.');
  }
  if (!client.state || client.state.trim() === '') {
    throw new Error('State is required.');
  }
};

export const validateSystemSettings = (settings: SystemSettings) => {
  if (typeof settings.cgstPercentage !== 'number' || settings.cgstPercentage < 0) {
    throw new Error('CGST Percentage must be a valid positive number.');
  }
  if (typeof settings.sgstPercentage !== 'number' || settings.sgstPercentage < 0) {
    throw new Error('SGST Percentage must be a valid positive number.');
  }
  if (typeof settings.defaultWaterRate !== 'number' || settings.defaultWaterRate < 0) {
    throw new Error('Default Water Rate must be a valid positive number.');
  }
};

export const validateInvoice = (invoice: Invoice) => {
  if (!invoice.invoiceNo || invoice.invoiceNo.trim() === '') {
    throw new Error('Invoice Number is required.');
  }
  if (!invoice.clientId) {
    throw new Error('Client ID is required.');
  }
  if (!invoice.items || invoice.items.length === 0) {
    throw new Error('Invoice must have at least one item.');
  }
  
  // Validate mathematical properties loosely
  if (typeof invoice.totals.amountAfterTax !== 'number' || isNaN(invoice.totals.amountAfterTax)) {
    throw new Error('Invalid Invoice Total Amount.');
  }

  for (const item of invoice.items) {
    if (typeof item.waterConsumption !== 'number' || isNaN(item.waterConsumption)) {
      throw new Error('Invalid water consumption on invoice item.');
    }
  }
};

export const validateReceipt = (receipt: Receipt) => {
  if (!receipt.invoiceId) {
    throw new Error('Invoice ID is required for a receipt.');
  }
  if (typeof receipt.amountReceived !== 'number' || isNaN(receipt.amountReceived) || receipt.amountReceived <= 0) {
    throw new Error('Amount received must be a valid number greater than 0.');
  }
  if (receipt.paymentMethod !== 'Cash') {
    if (!receipt.refNumber || receipt.refNumber.trim() === '') {
      throw new Error(`Reference number is required for ${receipt.paymentMethod} payments.`);
    }
    if (!receipt.instrumentDate || receipt.instrumentDate.trim() === '') {
      throw new Error(`Instrument Date is required for ${receipt.paymentMethod} payments.`);
    }
  }
};
