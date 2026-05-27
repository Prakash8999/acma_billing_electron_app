import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ReceiptModal } from './ReceiptModal';
import { Invoice, Receipt } from '../../../../shared/types';
import { FileText, CheckCircle2, Clock, AlertCircle, Eye, Receipt as ReceiptIcon, ChevronDown, ChevronRight } from 'lucide-react';

interface InvoiceHistoryProps {
  onViewInvoice: (invoice: Invoice) => void;
}

export function InvoiceHistory({ onViewInvoice }: InvoiceHistoryProps) {
  const [receiptModalState, setReceiptModalState] = useState<{ invoice: Invoice, clientName: string, initialReceipt?: Receipt } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [invoices, setInvoices] = useState<(Invoice & { clientName: string })[]>([]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      if (window.billingAPI?.fetchInvoices) {
        const data = await window.billingAPI.fetchInvoices();
        setInvoices(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Fully Paid':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"><CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid</span>;
      case 'Partially Paid':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"><Clock className="w-3.5 h-3.5" /> Partially Paid</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"><AlertCircle className="w-3.5 h-3.5" /> Unpaid</span>;
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="flex h-full p-6">
      <Card className="w-full flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Invoice History & Receipts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-4 w-10"></th>
                  <th className="px-2 py-4 font-medium">Invoice No.</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Client Name</th>
                  <th className="px-6 py-4 font-medium text-right">Total / Pending Due</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((invoice) => {
                  const totalReceived = invoice.receipts?.reduce((sum, r) => sum + r.amountReceived, 0) || 0;
                  const netDue = invoice.totals.amountAfterTax - totalReceived;

                  const hasReceipts = invoice.receipts && invoice.receipts.length > 0;
                  const isExpanded = expandedRows.has(invoice.id);

                  return (
                    <React.Fragment key={invoice.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 text-center">
                          {hasReceipts ? (
                            <button onClick={() => toggleRow(invoice.id)} className="p-1 hover:bg-muted rounded-md transition-colors">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-2 py-4 font-medium whitespace-nowrap">{invoice.invoiceNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{invoice.date}</td>
                        <td className="px-6 py-4">{invoice.clientName}</td>
                        <td className="px-6 py-4 text-right font-medium">
                          <span className="text-muted-foreground line-through decoration-muted-foreground/40 mr-2 text-xs">
                            ₹ {invoice.totals.amountAfterTax.toFixed(2)}
                          </span>
                          <span className="text-red-600 dark:text-red-400 font-bold">
                            ₹ {Math.max(0, netDue).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-6 py-4 flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewInvoice(invoice)}
                            title="View / Edit Invoice"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (netDue <= 0) {
                                if (!window.confirm("The amount is completely paid. Do you still want to generate a receipt?")) {
                                  return;
                                }
                              }
                              setReceiptModalState({ invoice, clientName: invoice.clientName });
                            }}
                          >
                            Generate Receipt
                          </Button>
                        </td>
                      </tr>

                      {/* Render Nested Receipts */}
                      {hasReceipts && isExpanded && (
                        <tr className="bg-muted/10 border-b-0">
                          <td colSpan={7} className="px-6 py-4 pb-6">

                            {/* <div className="flex flex-col md:flex-row gap-4 mb-4">
                              <div className="flex-1 bg-red-50 dark:bg-red-950/20 p-4 rounded-md border border-red-200 dark:border-red-900/50 flex items-center justify-between">
                                <div>
                                  <div className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider mb-1">Invoice Total</div>
                                  <div className="text-xl font-bold text-red-700 dark:text-red-300">₹ {invoice.totals.amountAfterTax.toFixed(2)}</div>
                                </div>
                                <div className="w-px h-8 bg-red-200 dark:bg-red-900/50"></div>
                                <div className="text-right">
                                  <div className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider mb-1">Pending Due</div>
                                  <div className="text-2xl font-black text-red-600 dark:text-red-400">₹ {Math.max(0, netDue).toFixed(2)}</div>
                                </div>
                              </div>
                            </div> */}

                            <div className="pl-8 border-l-2 border-primary/20 space-y-2">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Receipts</div>
                              <div className="grid gap-2">
                                {invoice.receipts?.map((receipt) => (
                                  <div
                                    key={receipt.id}
                                    className="flex items-center justify-between bg-background p-3 rounded-md border border-border shadow-sm hover:border-primary/50 cursor-pointer transition-colors"
                                    onClick={() => setReceiptModalState({ invoice, clientName: invoice.clientName, initialReceipt: receipt })}
                                  >
                                    <div className="flex items-center gap-4 text-sm">
                                      <div className="flex items-center gap-2 font-medium">
                                        <ReceiptIcon className="w-4 h-4 text-primary" />
                                        {receipt.receiptNo}
                                      </div>
                                      <div className="text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {receipt.date}
                                      </div>
                                      <div className="bg-muted px-2 py-0.5 rounded text-xs">{receipt.paymentMethod}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="font-semibold text-green-600 dark:text-green-400">
                                        + ₹ {receipt.amountReceived.toFixed(2)}
                                      </div>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {receiptModalState && (
        <ReceiptModal
          invoice={receiptModalState.invoice}
          clientName={receiptModalState.clientName}
          initialReceipt={receiptModalState.initialReceipt}
          onClose={() => {
            setReceiptModalState(null);
            loadInvoices(); // Refresh invoices list
          }}
        />
      )}
    </div>
  );
}
