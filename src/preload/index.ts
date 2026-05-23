import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { ipcRenderer } from 'electron'
import type { Client, Invoice, Receipt, SystemSettings } from '../shared/types'

// Custom APIs for renderer
const api = {
  fetchClients: () => ipcRenderer.invoke('fetchClients'),
  saveClient: (clientData: Client) => ipcRenderer.invoke('saveClient', clientData),
  toggleClientStatus: (clientId: string, isActive: boolean) => ipcRenderer.invoke('toggleClientStatus', clientId, isActive),
  fetchInvoices: () => ipcRenderer.invoke('fetchInvoices'),
  saveInvoice: (invoiceData: Invoice) => ipcRenderer.invoke('saveInvoice', invoiceData),
  saveReceipt: (receiptData: Receipt) => ipcRenderer.invoke('saveReceipt', receiptData),
  printDocument: (documentType: string, data: any) => ipcRenderer.invoke('printDocument', documentType, data),
  getSystemSettings: () => ipcRenderer.invoke('getSystemSettings'),
  updateSystemSettings: (settings: SystemSettings) => ipcRenderer.invoke('updateSystemSettings', settings),
  getNextInvoiceNo: (prefix: string) => ipcRenderer.invoke('getNextInvoiceNo', prefix)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('billingAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.billingAPI = api
}
