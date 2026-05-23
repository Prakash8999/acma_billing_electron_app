import { app, ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { generateInvoiceHTML } from './pdfTemplate';
import * as db from './database';
import { validateClient, validateSystemSettings, validateInvoice, validateReceipt } from './validation';

export const registerIpcHandlers = () => {
  ipcMain.handle('getSystemSettings', async () => {
    try {
      return await db.getSystemSettings();
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('updateSystemSettings', async (_, settings) => {
    try {
      validateSystemSettings(settings);
      return await db.updateSystemSettings(settings);
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('fetchClients', async () => {
    try {
      return await db.fetchClients();
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('saveClient', async (_, client) => {
    try {
      validateClient(client);
      return await db.saveClient(client);
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('toggleClientStatus', async (_, clientId, isActive) => {
    try {
      return await db.toggleClientStatus(clientId, isActive);
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('fetchInvoices', async () => {
    try {
      return await db.fetchInvoices();
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('saveInvoice', async (_, invoice) => {
    try {
      validateInvoice(invoice);
      return await db.saveInvoice(invoice);
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('saveReceipt', async (_, receipt) => {
    try {
      validateReceipt(receipt);
      return await db.saveReceipt(receipt);
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('printDocument', async (_, documentType, data) => {
    try {
      let htmlContent = '';
      let fileName = '';

      if (documentType === 'invoice') {
        htmlContent = generateInvoiceHTML(data);
        const safeInvoiceNo = data.invoiceData.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_');
        fileName = `Invoice_${safeInvoiceNo}_${Date.now()}.pdf`;
      } else {
        throw new Error('Unsupported document type');
      }

      // Create a hidden window
      const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
      
      // Load the HTML
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Generate PDF
      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
      });
      
      // Save to Downloads folder
      const downloadsPath = app.getPath('downloads');
      const filePath = path.join(downloadsPath, fileName);
      
      fs.writeFileSync(filePath, pdfBuffer);
      win.close();
      
      return { success: true, filePath };
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('getNextInvoiceNo', async (_, prefix) => {
    try {
      return await db.getNextInvoiceNo(prefix);
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  });
};
