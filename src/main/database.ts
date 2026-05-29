import { app } from 'electron';
import * as path from 'path';
import sqlite3 from 'sqlite3';

const dbPath = path.join(app.getPath('userData'), 'billing_database.sqlite');
let db: sqlite3.Database;

// Promisified SQLite wrappers
const run = (query: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        console.error('Error running sql ' + query, err);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const get = (query: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        console.error('Error running sql ' + query, err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const all = (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error running sql ' + query, err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export const initDb = async () => {
  db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('Could not connect to database', err);
    } else {
      console.log('Connected to database at', dbPath);
      await createTables();
      await seedSystemSettings();
    }
  });
};

const createTables = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      defaultSacCode TEXT,
      cgstPercentage REAL,
      sgstPercentage REAL,
      financialYearPrefix TEXT,
      officialPhone TEXT,
      officialMobile TEXT,
      officialEmail TEXT,
      bankAccountNo TEXT,
      bankIfscCode TEXT,
      bankMicrCode TEXT,
      defaultWaterRate REAL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT,
      address TEXT,
      gstin TEXT,
      state TEXT,
      stateCode TEXT,
      defaultRate REAL,
      isActive INTEGER DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoiceNo TEXT UNIQUE,
      date TEXT,
      clientId TEXT,
      status TEXT,
      baseCharge REAL,
      extraCharges REAL,
      additionalCharges REAL DEFAULT 0,
      amountBeforeTax REAL,
      cgstAmount REAL,
      sgstAmount REAL,
      totalTaxAmount REAL,
      amountAfterTax REAL,
      previousOutstanding REAL,
      ifPaidAfterDate TEXT,
      pleasePayRs REAL,
      settingsSnapshot TEXT,
      FOREIGN KEY (clientId) REFERENCES clients (id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoiceId TEXT,
      description TEXT,
      sacCode TEXT,
      waterConsumption REAL,
      rate REAL,
      extraCharges REAL,
      additionalCharges REAL DEFAULT 0,
      baseCharge REAL,
      taxableAmount REAL,
      FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE
    )
  `);



  await run(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      receiptNo TEXT,
      date TEXT,
      invoiceId TEXT,
      paymentMethod TEXT,
      allocation TEXT,
      amountReceived REAL,
      refNumber TEXT,
      instrumentDate TEXT,
      FOREIGN KEY (invoiceId) REFERENCES invoices (id)
    )
  `);
};

const seedSystemSettings = async () => {
  const row = await get('SELECT count(*) as count FROM system_settings');
  if (row.count === 0) {
    await run(`
      INSERT INTO system_settings (
        defaultSacCode, cgstPercentage, sgstPercentage, financialYearPrefix,
        officialPhone, officialMobile, officialEmail, bankAccountNo, bankIfscCode, bankMicrCode, defaultWaterRate
      ) VALUES (
        '9994', 9.0, 9.0, '2026-27',
        '022-12345678', '9876543210', 'contact@society.com', '1234567890', 'IFSC0001234', 'MICR123456', 25.0
      )
    `);
  }
};

// Data Access Methods
export const getSystemSettings = async () => {
  const settings = await get('SELECT * FROM system_settings LIMIT 1');
  return settings;
};

export const updateSystemSettings = async (settings: any) => {
  await run(`
    UPDATE system_settings SET
      defaultSacCode = ?, cgstPercentage = ?, sgstPercentage = ?, financialYearPrefix = ?,
      officialPhone = ?, officialMobile = ?, officialEmail = ?, bankAccountNo = ?, bankIfscCode = ?, bankMicrCode = ?, defaultWaterRate = ?
    WHERE id = (SELECT id FROM system_settings LIMIT 1)
  `, [
    settings.defaultSacCode, settings.cgstPercentage, settings.sgstPercentage, settings.financialYearPrefix,
    settings.officialPhone, settings.officialMobile, settings.officialEmail, settings.bankAccountNo, settings.bankIfscCode, settings.bankMicrCode, settings.defaultWaterRate
  ]);
  return { success: true };
};

export const fetchClients = async () => {
  const rows = await all('SELECT * FROM clients');
  return rows.map(r => ({
    ...r,
    isActive: r.isActive === 1 || r.isActive === undefined
  }));
};

export const saveClient = async (client: any) => {
  const existing = await get('SELECT id FROM clients WHERE id = ?', [client.id]);
  const isActiveInt = client.isActive === false ? 0 : 1;
  
  if (existing) {
    await run(`
      UPDATE clients SET name = ?, address = ?, gstin = ?, state = ?, stateCode = ?, defaultRate = ?, isActive = ?
      WHERE id = ?
    `, [client.name, client.address, client.gstin, client.state, client.stateCode, client.defaultRate, isActiveInt, client.id]);
  } else {
    await run(`
      INSERT INTO clients (id, name, address, gstin, state, stateCode, defaultRate, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [client.id, client.name, client.address, client.gstin, client.state, client.stateCode, client.defaultRate, isActiveInt]);
  }
  return { success: true, data: { ...client, isActive: isActiveInt === 1 } };
};

export const toggleClientStatus = async (clientId: string, isActive: boolean) => {
  const isActiveInt = isActive ? 1 : 0;
  await run('UPDATE clients SET isActive = ? WHERE id = ?', [isActiveInt, clientId]);
  return { success: true };
};

export const fetchInvoices = async () => {
  const invoices = await all(`
    SELECT i.*, c.name as clientName
    FROM invoices i
    LEFT JOIN clients c ON i.clientId = c.id
    ORDER BY i.date DESC
  `);

  for (const inv of invoices) {
    // Reconstruct the nested objects to match the frontend type
    inv.totals = {
      baseCharge: inv.baseCharge,
      extraCharges: inv.extraCharges,
      additionalCharges: inv.additionalCharges || 0,
      amountBeforeTax: inv.amountBeforeTax,
      cgstAmount: inv.cgstAmount,
      sgstAmount: inv.sgstAmount,
      totalTaxAmount: inv.totalTaxAmount,
      amountAfterTax: inv.amountAfterTax,
      previousOutstanding: inv.previousOutstanding
    };
    inv.dpc = {
      ifPaidAfterDate: inv.ifPaidAfterDate,
      pleasePayRs: inv.pleasePayRs
    };
    if (inv.settingsSnapshot) {
      try {
        inv.systemSettingsSnapshot = JSON.parse(inv.settingsSnapshot);
      } catch (e) {
        console.error('Failed to parse settings snapshot:', e);
      }
    }
    
    // Fetch items
    const items = await all('SELECT * FROM invoice_items WHERE invoiceId = ?', [inv.id]);
    inv.items = items;
    
    // Fetch receipts
    const receipts = await all('SELECT * FROM receipts WHERE invoiceId = ? ORDER BY date ASC', [inv.id]);
    inv.receipts = receipts;
    
    // Clean up flat properties
    delete inv.baseCharge;
    delete inv.extraCharges;
    delete inv.additionalCharges;
    delete inv.amountBeforeTax;
    delete inv.cgstAmount;
    delete inv.sgstAmount;
    delete inv.totalTaxAmount;
    delete inv.amountAfterTax;
    delete inv.previousOutstanding;
    delete inv.ifPaidAfterDate;
    delete inv.pleasePayRs;
    delete inv.settingsSnapshot;
  }
  return invoices;
};

export const saveInvoice = async (invoice: any) => {
  await run('BEGIN TRANSACTION');
  try {
    const existing = await get('SELECT id FROM invoices WHERE id = ?', [invoice.id]);
    if (existing) {
      await run(`
        UPDATE invoices SET
          invoiceNo = ?, date = ?, clientId = ?, status = ?,
          baseCharge = ?, extraCharges = ?, additionalCharges = ?, amountBeforeTax = ?, cgstAmount = ?,
          sgstAmount = ?, totalTaxAmount = ?, amountAfterTax = ?, previousOutstanding = ?,
          ifPaidAfterDate = ?, pleasePayRs = ?, settingsSnapshot = ?
        WHERE id = ?
      `, [
        invoice.invoiceNo, invoice.date, invoice.clientId, invoice.status,
        invoice.totals.baseCharge, invoice.totals.extraCharges, invoice.totals.additionalCharges || 0, invoice.totals.amountBeforeTax,
        invoice.totals.cgstAmount, invoice.totals.sgstAmount, invoice.totals.totalTaxAmount,
        invoice.totals.amountAfterTax, invoice.totals.previousOutstanding,
        invoice.dpc.ifPaidAfterDate, invoice.dpc.pleasePayRs,
        invoice.systemSettingsSnapshot ? JSON.stringify(invoice.systemSettingsSnapshot) : null,
        invoice.id
      ]);
      await run('DELETE FROM invoice_items WHERE invoiceId = ?', [invoice.id]);
    } else {
      await run(`
        INSERT INTO invoices (
          id, invoiceNo, date, clientId, status,
          baseCharge, extraCharges, additionalCharges, amountBeforeTax, cgstAmount,
          sgstAmount, totalTaxAmount, amountAfterTax, previousOutstanding,
          ifPaidAfterDate, pleasePayRs, settingsSnapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoice.id, invoice.invoiceNo, invoice.date, invoice.clientId, invoice.status,
        invoice.totals.baseCharge, invoice.totals.extraCharges, invoice.totals.additionalCharges || 0, invoice.totals.amountBeforeTax,
        invoice.totals.cgstAmount, invoice.totals.sgstAmount, invoice.totals.totalTaxAmount,
        invoice.totals.amountAfterTax, invoice.totals.previousOutstanding,
        invoice.dpc.ifPaidAfterDate, invoice.dpc.pleasePayRs,
        invoice.systemSettingsSnapshot ? JSON.stringify(invoice.systemSettingsSnapshot) : null
      ]);
    }

    for (const item of invoice.items) {
      await run(`
        INSERT INTO invoice_items (id, invoiceId, description, sacCode, waterConsumption, rate, extraCharges, additionalCharges, baseCharge, taxableAmount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, invoice.id, item.description, item.sacCode, item.waterConsumption, item.rate, item.extraCharges, item.additionalCharges || 0, item.baseCharge, item.taxableAmount]);
    }

    await run('COMMIT');
    return { success: true, data: invoice };
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
};

export const saveReceipt = async (receipt: import('../shared/types').Receipt) => {
  await run('BEGIN TRANSACTION');
  try {
    const existing = await get('SELECT id FROM receipts WHERE id = ?', [receipt.id]);
    if (existing) {
      await run(`
        UPDATE receipts SET
          receiptNo = ?, date = ?, invoiceId = ?, paymentMethod = ?, allocation = ?, amountReceived = ?, refNumber = ?, instrumentDate = ?
        WHERE id = ?
      `, [receipt.receiptNo, receipt.date, receipt.invoiceId, receipt.paymentMethod, receipt.allocation, receipt.amountReceived, receipt.refNumber, receipt.instrumentDate, receipt.id]);
    } else {
      await run(`
        INSERT INTO receipts (id, receiptNo, date, invoiceId, paymentMethod, allocation, amountReceived, refNumber, instrumentDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [receipt.id, receipt.receiptNo, receipt.date, receipt.invoiceId, receipt.paymentMethod, receipt.allocation, receipt.amountReceived, receipt.refNumber, receipt.instrumentDate]);
    }
    // Re-calculate invoice status based on total receipts
    const allReceipts = await all('SELECT amountReceived FROM receipts WHERE invoiceId = ?', [receipt.invoiceId]);
    const totalReceived = allReceipts.reduce((sum, r) => sum + r.amountReceived, 0);
    
    const invoice = await get('SELECT amountAfterTax FROM invoices WHERE id = ?', [receipt.invoiceId]);
    
    let newStatus = 'Unpaid';
    if (invoice) {
      // Allow a small epsilon for floating point inaccuracies
      if (totalReceived >= invoice.amountAfterTax - 0.01) {
        newStatus = 'Fully Paid';
      } else if (totalReceived > 0) {
        newStatus = 'Partially Paid';
      }
    }
    
    await run('UPDATE invoices SET status = ? WHERE id = ?', [newStatus, receipt.invoiceId]);

    await run('COMMIT');
    return { success: true, data: receipt };
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
};

export const getNextInvoiceNo = async (prefix: string) => {
  const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const rows = await all('SELECT invoiceNo FROM invoices WHERE invoiceNo LIKE ?', [`${cleanPrefix}/%`]);
  let maxNum = 0;
  for (const r of rows) {
    const parts = r.invoiceNo.split('/');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return maxNum + 1;
};

export const getNextReceiptNo = async (prefix: string) => {
  const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const rows = await all('SELECT receiptNo FROM receipts WHERE receiptNo LIKE ?', [`${cleanPrefix}/%`]);
  let maxNum = 0;
  for (const r of rows) {
    const parts = r.receiptNo.split('/');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return maxNum + 1;
};
