import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Client, Invoice, InvoiceItem } from '../../types';
import { numberToWords } from '../../utils/numberToWords';
import { Calculator, Save, Printer, Building2, FileText, Receipt, IndianRupee } from 'lucide-react';

export function CreateInvoice() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Invoice Metadata
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Billing Grid
  const [monthText, setMonthText] = useState<string>('');
  const [additionalDesc, setAdditionalDesc] = useState<string>('');
  const [sacCode, setSacCode] = useState<string>('9994');
  const [waterConsumption, setWaterConsumption] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [extraCharges, setExtraCharges] = useState<number>(0);

  // Other amounts
  const [previousOutstanding, setPreviousOutstanding] = useState<number>(0);
  const [ifPaidAfterDate, setIfPaidAfterDate] = useState<string>('');
  const [pleasePayRs, setPleasePayRs] = useState<number>(0);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    if (window.billingAPI?.fetchClients) {
      const data = await window.billingAPI.fetchClients();
      setClients(data || []);
    }
  };

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  // Auto-populate rate when client changes
  useEffect(() => {
    if (selectedClient) {
      setRate(selectedClient.defaultRate || 0);
    }
  }, [selectedClient]);

  // Reactive Calculation Matrix
  const calculations = useMemo(() => {
    const baseWaterCharge = (waterConsumption || 0) * (rate || 0);
    const amountBeforeTax = baseWaterCharge + (extraCharges || 0);
    const cgstAmount = amountBeforeTax * 0.025; // 2.5%
    const sgstAmount = amountBeforeTax * 0.025; // 2.5%
    const totalTaxAmount = cgstAmount + sgstAmount;

    // Applying rounding here to simulate realistic billing
    const amountAfterTax = Math.round(amountBeforeTax + totalTaxAmount);
    const roundOff = amountAfterTax - (amountBeforeTax + totalTaxAmount);

    return {
      baseWaterCharge,
      amountBeforeTax,
      cgstAmount,
      sgstAmount,
      totalTaxAmount,
      amountAfterTax,
      roundOff,
    };
  }, [waterConsumption, rate, extraCharges]);

  const amountInWords = useMemo(() => {
    return numberToWords(calculations.amountAfterTax);
  }, [calculations.amountAfterTax]);

  const handleSave = async () => {
    if (!selectedClient) {
      alert('Please select a receiver.');
      return;
    }

    const invoiceItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: `Effluent Treatment Charges for the month of ${monthText}\n${additionalDesc}`.trim(),
      sacCode: sacCode,
      waterConsumption,
      rate,
      extraCharges,
      baseCharge: calculations.baseWaterCharge,
      taxableAmount: calculations.amountBeforeTax,
    };

    const invoiceData: Invoice = {
      id: crypto.randomUUID(),
      invoiceNo: `2026-27/${invoiceNo}`,
      date: invoiceDate,
      clientId: selectedClient.id,
      items: [invoiceItem],
      totals: {
        baseCharge: calculations.baseWaterCharge,
        extraCharges: extraCharges,
        amountBeforeTax: calculations.amountBeforeTax,
        cgstAmount: calculations.cgstAmount,
        sgstAmount: calculations.sgstAmount,
        totalTaxAmount: calculations.totalTaxAmount,
        amountAfterTax: calculations.amountAfterTax,
        previousOutstanding: previousOutstanding,
      },
      dpc: {
        ifPaidAfterDate,
        pleasePayRs,
      },
      status: 'Unpaid',
    };

    try {
      if (window.billingAPI?.saveInvoice) {
        const res = await window.billingAPI.saveInvoice(invoiceData);
        if (res.success) {
          alert('Invoice saved successfully');
        }
      } else {
        console.log('Mock Save Invoice:', invoiceData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 pb-10 space-y-5">

        {/* ── Company Header ── compact banner */}
        <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">ACMA CETP CO-OP. SOCIETY LTD.</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                REGD. NO. TNA/ULR/GNL/(0)/359/94-95/1994 &nbsp;•&nbsp; SHED NO. W-30, M.I.D.C., CHEMICAL ZONE, AMBERNATH (WEST)
              </p>
            </div>
            <div className="text-right text-xs text-slate-300 space-y-0.5">
              <div>Tel: (0251) 2610228 &nbsp;|&nbsp; Cell: 9049890397</div>
              <div>acmacetp@gmail.com</div>
              <div className="font-semibold text-white mt-1">GSTIN: 27AAAAA4636P1ZH &nbsp;|&nbsp; PAN: AAAAA4636P</div>
            </div>
          </div>
        </div>

        {/* ── Bento Grid: Metadata + Receiver + Billing + Calculations ── */}
        <div className="grid grid-cols-12 gap-5">

          {/* ────── LEFT COLUMN (8 cols) ────── */}
          <div className="col-span-8 space-y-5">

            {/* Invoice Metadata Row */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  Invoice Details
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 pl-3 pt-4 flex items-center pointer-events-none text-sm text-muted-foreground">
                      2026-27/
                    </div>
                    <input
                      type="text"
                      className="flex h-12 w-full rounded-md border border-input bg-transparent pl-[5.5rem] pr-3 py-1 pt-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                    />
                    <label className="absolute left-3 top-1 text-xs text-muted-foreground pointer-events-none">
                      Invoice Number
                    </label>
                  </div>
                  <Input
                    type="date"
                    label="Invoice Date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Receiver Details */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  Receiver Details (Billed To)
                </div>
                <Select
                  label="Select Client"
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                />
                {selectedClient && (
                  <div className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm mt-4 p-4 bg-muted/30 rounded-lg border border-muted">
                    <div className="col-span-2">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Name</span>
                      <div className="font-medium mt-0.5">{selectedClient.name}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">GSTIN No.</span>
                      <div className="font-medium font-mono mt-0.5">{selectedClient.gstin}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Address</span>
                      <div className="font-medium mt-0.5">{selectedClient.address}</div>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">State</span>
                      <div className="font-medium mt-0.5">{selectedClient.state}</div>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">State Code</span>
                      <div className="font-medium mt-0.5">{selectedClient.stateCode}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Itemized Grid */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
                  <Receipt className="w-4 h-4" />
                  Billing Itemized Grid
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <Input
                      label="Effluent Treatment Charges for the month of"
                      value={monthText}
                      onChange={(e) => setMonthText(e.target.value)}
                      placeholder="e.g. March 2026"
                    />
                  </div>
                  <Input
                    label="SAC Code"
                    value={sacCode}
                    onChange={(e) => setSacCode(e.target.value)}
                  />
                </div>

                <div className="relative mt-3">
                  <textarea
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 pt-5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[56px] resize-none"
                    placeholder="Additional Descriptions"
                    value={additionalDesc}
                    onChange={(e) => setAdditionalDesc(e.target.value)}
                  />
                  <label className="absolute left-3 top-1 text-xs text-muted-foreground pointer-events-none">
                    Additional Descriptions (e.g. Sample Testing Charges)
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <Input
                    type="number"
                    label="Water Consumption (M³)"
                    value={waterConsumption || ''}
                    onChange={(e) => setWaterConsumption(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    label="Rate (Rs / M³)"
                    value={rate || ''}
                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    label="Extra Misc Charges (Rs.)"
                    value={extraCharges || ''}
                    onChange={(e) => setExtraCharges(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Previous Outstanding & DPC */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
                  <IndianRupee className="w-4 h-4" />
                  Outstanding & DPC
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    type="number"
                    step="0.01"
                    label="Previous Outstanding Rs."
                    value={previousOutstanding || ''}
                    onChange={(e) => setPreviousOutstanding(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    label="DPC: If Paid after"
                    type="date"
                    value={ifPaidAfterDate}
                    onChange={(e) => setIfPaidAfterDate(e.target.value)}
                  />
                  <Input
                    label="Please Pay Rs."
                    type="number"
                    step="0.01"
                    value={pleasePayRs || ''}
                    onChange={(e) => setPleasePayRs(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ────── RIGHT COLUMN (4 cols) — sticky calculation panel ────── */}
          <div className="col-span-4">
            <div className="sticky top-0 space-y-5">

              {/* Live Calculation Card */}
              <div className="rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-xl overflow-hidden">
                <div className="px-5 pt-5 pb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <Calculator className="w-4 h-4" />
                  Live Computations
                </div>

                <div className="px-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base Water Charge</span>
                    <span className="tabular-nums">₹ {calculations.baseWaterCharge.toFixed(2)}</span>
                  </div>
                  {extraCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Extra Charges</span>
                      <span className="tabular-nums">₹ {extraCharges.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/10 my-2" />
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-300">Total Before Tax</span>
                    <span className="tabular-nums">₹ {calculations.amountBeforeTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Add: CGST @ 2.5%</span>
                    <span className="tabular-nums">₹ {calculations.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Add: SGST @ 2.5%</span>
                    <span className="tabular-nums">₹ {calculations.sgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Tax (GST @ 5%)</span>
                    <span className="tabular-nums">₹ {calculations.totalTaxAmount.toFixed(2)}</span>
                  </div>
                  {calculations.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Round Off</span>
                      <span className="tabular-nums">
                        {calculations.roundOff > 0 ? '+' : ''}
                        {calculations.roundOff.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-white/10 my-2" />
                  <div className="flex justify-between text-lg font-bold pt-1 pb-1">
                    <span>Total Amount</span>
                    <span className="tabular-nums text-emerald-400">₹ {calculations.amountAfterTax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="px-5 py-3 mt-2 bg-white/5 text-xs text-slate-400 leading-relaxed">
                  <span className="text-slate-500 block mb-0.5">Amount in words:</span>
                  <span className="italic text-slate-300">{amountInWords}</span>
                </div>

                {/* Action buttons */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4" />
                    Save Invoice
                  </Button>
                  <Button
                    variant="secondary"
                    className="gap-2 bg-white/10 hover:bg-white/20 text-white border-0"
                    onClick={() => window.billingAPI?.printDocument('invoice', {})}
                    title="Print Invoice"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Bank Details Card */}
              <Card className="text-xs">
                <CardContent className="p-4">
                  <div className="font-semibold text-foreground text-sm mb-2">Bank Details</div>
                  <div className="text-muted-foreground space-y-0.5">
                    <div className="font-medium text-foreground">AMBARNATH JAI-HIND CO-OP. BANK LTD.</div>
                    <div>Branch: Main Branch, Ambarnath (West)</div>
                    <div>Current A/c No.: <span className="font-mono">1002014004165</span></div>
                    <div>IFSC: <span className="font-mono">AJHC0001002</span> &nbsp;|&nbsp; MICR: <span className="font-mono">400805002</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* Signatories */}
              <Card className="text-xs text-muted-foreground">
                <CardContent className="p-4">
                  <div className="flex justify-between gap-6 pt-2">
                    <div className="text-center flex-1">
                      <div className="border-b border-border w-full mb-1.5 h-8" />
                      <div>Receiver Signature<br />with Rubber Stamp</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="border-b border-border w-full mb-1.5 h-8" />
                      <div>For ACMA CETP CO-OP.<br />SOCIETY LTD.</div>
                      <div className="mt-1 font-medium text-foreground">Authorised Signature</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
