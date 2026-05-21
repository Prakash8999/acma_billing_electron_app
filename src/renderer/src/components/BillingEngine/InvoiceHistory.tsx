import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ReceiptModal } from './ReceiptModal';
import { Invoice } from '../../types';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export function InvoiceHistory() {
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<{ invoice: Invoice, clientName: string } | null>(null);

  // Mock data for display purposes since we don't have a fetchInvoices API in the prompt
  // In a real scenario, this would be fetched from window.billingAPI.fetchInvoices()
  const mockInvoices: (Invoice & { clientName: string })[] = [
    {
      id: '1',
      invoiceNo: '2026-27/001',
      date: '2026-03-15',
      clientId: 'client-1',
      clientName: 'Alivira Animal Health Ltd.',
      items: [],
      totals: {
        baseCharge: 5000,
        extraCharges: 0,
        amountBeforeTax: 5000,
        cgstAmount: 125,
        sgstAmount: 125,
        totalTaxAmount: 250,
        amountAfterTax: 5250,
        previousOutstanding: 0
      },
      dpc: { ifPaidAfterDate: '', pleasePayRs: 0 },
      status: 'Unpaid'
    },
    {
      id: '2',
      invoiceNo: '2026-27/002',
      date: '2026-03-10',
      clientId: 'client-2',
      clientName: 'Godrej Consumer Products Ltd.',
      items: [],
      totals: {
        baseCharge: 8000,
        extraCharges: 500,
        amountBeforeTax: 8500,
        cgstAmount: 212.5,
        sgstAmount: 212.5,
        totalTaxAmount: 425,
        amountAfterTax: 8925,
        previousOutstanding: 0
      },
      dpc: { ifPaidAfterDate: '', pleasePayRs: 0 },
      status: 'Fully Paid'
    }
  ];

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
                  <th className="px-6 py-4 font-medium">Invoice No.</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Client Name</th>
                  <th className="px-6 py-4 font-medium text-right">Net Due Amount</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mockInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{invoice.invoiceNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{invoice.date}</td>
                    <td className="px-6 py-4">{invoice.clientName}</td>
                    <td className="px-6 py-4 text-right font-medium">₹ {invoice.totals.amountAfterTax.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 flex justify-center">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setSelectedInvoiceForReceipt({ invoice, clientName: invoice.clientName })}
                      >
                        Generate Receipt
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedInvoiceForReceipt && (
        <ReceiptModal
          invoice={selectedInvoiceForReceipt.invoice}
          clientName={selectedInvoiceForReceipt.clientName}
          onClose={() => setSelectedInvoiceForReceipt(null)}
        />
      )}
    </div>
  );
}
