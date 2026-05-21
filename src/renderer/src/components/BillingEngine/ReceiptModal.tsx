import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Invoice, Receipt } from '../../types';
import { X, Printer, Save } from 'lucide-react';
import { numberToWords } from '../../utils/numberToWords';

interface ReceiptModalProps {
  invoice: Invoice;
  clientName: string;
  onClose: () => void;
}

export function ReceiptModal({ invoice, clientName, onClose }: ReceiptModalProps) {
  const [receiptNo, setReceiptNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Cheque' | 'Draft'>('Cash');
  const [allocation, setAllocation] = useState<'Full' | 'Part'>('Full');
  const [amountReceived, setAmountReceived] = useState<number>(invoice.totals.amountAfterTax);
  
  const [refNumber, setRefNumber] = useState('');
  const [instrumentDate, setInstrumentDate] = useState('');

  const handleSave = async () => {
    const receiptData: Receipt = {
      id: crypto.randomUUID(),
      receiptNo: `2026-27/${receiptNo}`,
      date,
      invoiceId: invoice.id,
      paymentMethod,
      allocation,
      amountReceived,
      refNumber: paymentMethod !== 'Cash' ? refNumber : undefined,
      instrumentDate: paymentMethod !== 'Cash' ? instrumentDate : undefined,
    };

    try {
      if (window.billingAPI?.saveReceipt) {
        const res = await window.billingAPI.saveReceipt(receiptData);
        if (res.success) {
          alert('Receipt saved successfully');
          onClose();
        }
      } else {
        console.log('Mock Save Receipt:', receiptData);
        alert('Receipt saved in mock mode');
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const amountInWords = numberToWords(amountReceived);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/50 pb-4">
          <CardTitle>Money Receipt Form</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          <div className="bg-primary/5 p-4 rounded-md border border-primary/10 flex flex-col gap-2 text-sm">
            <div className="font-semibold text-primary">Context from Invoice</div>
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Client:</span> {clientName}</div>
              <div><span className="text-muted-foreground">Invoice No:</span> {invoice.invoiceNo}</div>
              <div><span className="text-muted-foreground">Invoice Date:</span> {invoice.date}</div>
              <div><span className="text-muted-foreground">Invoice Total:</span> ₹ {invoice.totals.amountAfterTax.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative mt-2">
              <div className="absolute inset-y-0 left-0 pl-3 pt-4 flex items-center pointer-events-none text-sm text-muted-foreground">
                2026-27/
              </div>
              <input
                type="text"
                className="flex h-12 w-full rounded-md border border-input bg-transparent pl-[5.5rem] pr-3 py-1 pt-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
              />
              <label className="absolute left-3 top-1 text-xs text-muted-foreground pointer-events-none transition-all duration-200">
                Receipt Number
              </label>
            </div>
            <Input
              type="date"
              label="Receipt Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Draft', label: 'Draft' },
              ]}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            />
            <Select
              label="Payment Allocation"
              options={[
                { value: 'Full', label: 'Full Payment' },
                { value: 'Part', label: 'Part Payment' },
              ]}
              value={allocation}
              onChange={(e) => setAllocation(e.target.value as any)}
            />
          </div>

          {paymentMethod !== 'Cash' && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20 animate-in fade-in slide-in-from-top-2">
              <Input
                label={`${paymentMethod} Number`}
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
              />
              <Input
                type="date"
                label="Instrument Date"
                value={instrumentDate}
                onChange={(e) => setInstrumentDate(e.target.value)}
              />
            </div>
          )}

          <div className="pt-2">
            <Input
              type="number"
              step="0.01"
              label="Amount Received (Rs.)"
              value={amountReceived || ''}
              onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
              className="text-lg font-semibold"
            />
            <div className="text-xs text-muted-foreground mt-2 italic pl-1">
              {amountInWords}
            </div>
          </div>

        </CardContent>
        <CardFooter className="border-t bg-muted/30 gap-2 justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.billingAPI?.printDocument('invoice', {})}>
              <Printer className="w-4 h-4 mr-2" /> Print Invoice
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.billingAPI?.printDocument('receipt', {})}>
              <Printer className="w-4 h-4 mr-2" /> Print Receipt
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.billingAPI?.printDocument('both', {})}>
              <Printer className="w-4 h-4 mr-2" /> Print Composite
            </Button>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Save Receipt
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
