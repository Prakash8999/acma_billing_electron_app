import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { SearchSelect } from '../ui/SearchSelect';
import { Button } from '../ui/Button';


import { Client, Invoice, InvoiceItem } from '../../../../shared/types';
import { numberToWords } from '../../utils/numberToWords';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { Calculator, Save, Printer, Building2, FileText, Receipt, IndianRupee, Edit } from 'lucide-react';

// Global default rate (Rs / M³) — same for all clients
const GLOBAL_DEFAULT_RATE = 10;

// Mock demo clients for testing
const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'Alivira Animal Health Ltd.',
    address: 'A-68, MIDC, Addl. Ambernath (E.), Dist. Thane - 421 506',
    gstin: '27AABCA1234F1ZH',
    state: 'Maharashtra',
    stateCode: '27',
    defaultRate: GLOBAL_DEFAULT_RATE,
  },
  {
    id: 'client-2',
    name: 'Godrej Consumer Products Ltd.',
    address: 'Plot No. W-56, MIDC Industrial Area, Ambernath (West), Thane - 421 501',
    gstin: '27AACCG5678K1ZP',
    state: 'Maharashtra',
    stateCode: '27',
    defaultRate: GLOBAL_DEFAULT_RATE,
  },
  {
    id: 'client-3',
    name: 'Camlin Fine Sciences Ltd.',
    address: 'Plot No. D-87, MIDC Chemical Zone, Ambernath (West), Dist. Thane - 421 501',
    gstin: '27AABCC9012L1ZR',
    state: 'Maharashtra',
    stateCode: '27',
    defaultRate: GLOBAL_DEFAULT_RATE,
  },
];

export function CreateInvoice({ initialInvoice }: { initialInvoice?: Invoice | null }) {
  const { settings: globalSettings } = useSystemSettings();

  const activeSettings = useMemo(() => {
    return initialInvoice?.systemSettingsSnapshot || globalSettings;
  }, [initialInvoice, globalSettings]);

  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Invoice Metadata
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Billing Grid
  const [monthText, setMonthText] = useState<string>('');
  const [additionalDesc, setAdditionalDesc] = useState<string>('');
  const [sacCode, setSacCode] = useState<string>(activeSettings.defaultSacCode);
  const [waterConsumption, setWaterConsumption] = useState<string>('');
  const [rate, setRate] = useState<string>(activeSettings.defaultWaterRate.toString());
  const [extraCharges, setExtraCharges] = useState<string>('');

  // Other amounts
  const [previousOutstanding, setPreviousOutstanding] = useState<string>('');
  const [ifPaidAfterDate, setIfPaidAfterDate] = useState<string>('');
  const [pleasePayRs, setPleasePayRs] = useState<string>('');

  useEffect(() => {
    if (initialInvoice) {
      setIsSaved(true);
      setIsEditing(false);
      setSavedInvoiceId(initialInvoice.id);

      const invoiceNoStr = initialInvoice.invoiceNo.split('/')[1] || initialInvoice.invoiceNo;
      setInvoiceNo(invoiceNoStr);
      setInvoiceDate(initialInvoice.date);
      setSelectedClientId(initialInvoice.clientId);

      const item = initialInvoice.items[0];
      if (item) {
        setSacCode(item.sacCode);
        setWaterConsumption(item.waterConsumption.toString());
        setRate(item.rate.toString());
        setExtraCharges(item.extraCharges.toString());

        const lines = item.description.split('\n');
        const firstLine = lines[0] || '';
        const monthMatch = firstLine.match(/month of (.*)/);
        setMonthText(monthMatch ? monthMatch[1].trim() : '');
        setAdditionalDesc(lines.slice(1).join('\n'));
      }

      setPreviousOutstanding(initialInvoice.totals.previousOutstanding.toString());
      setIfPaidAfterDate(initialInvoice.dpc.ifPaidAfterDate);
      setPleasePayRs(initialInvoice.dpc.pleasePayRs.toString());
    } else {
      setIsSaved(false);
      setIsEditing(false);
      setSavedInvoiceId(null);
      setInvoiceNo('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setSelectedClientId('');
      setMonthText('');
      setAdditionalDesc('');
      setWaterConsumption('');
      setRate(activeSettings.defaultWaterRate.toString());
      setExtraCharges('');
      setPreviousOutstanding('');
      setIfPaidAfterDate('');
      setPleasePayRs('');
      loadNextInvoiceNo();
    }
  }, [initialInvoice]);

  useEffect(() => {
    loadClients();
    if (!initialInvoice) loadNextInvoiceNo();
  }, [activeSettings.financialYearPrefix, initialInvoice]);

  const loadClients = async () => {
    // Try IPC first, fall back to mock data
    if (window.billingAPI?.fetchClients) {
      const data = await window.billingAPI.fetchClients();
      setClients(data && data.length > 0 ? data : MOCK_CLIENTS);
    }
  };

  const loadNextInvoiceNo = async () => {
    if (window.billingAPI?.getNextInvoiceNo) {
      const nextNo = await window.billingAPI.getNextInvoiceNo(activeSettings.financialYearPrefix);
      setInvoiceNo(nextNo.toString());
    } else {
      setInvoiceNo('1');
    }
  };

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  // Auto-populate rate when client changes
  useEffect(() => {
    if (selectedClient && !isSaved) {
      setRate((selectedClient.defaultRate || activeSettings.defaultWaterRate).toString());
    }
  }, [selectedClient, activeSettings.defaultWaterRate, isSaved]);

  // Sync SAC code when settings change
  useEffect(() => {
    if (!isSaved) {
      setSacCode(activeSettings.defaultSacCode);
    }
  }, [activeSettings.defaultSacCode, isSaved]);

  // Reactive Calculation Matrix — reads tax rates from context
  const cgstRate = activeSettings.cgstPercentage / 100;
  const sgstRate = activeSettings.sgstPercentage / 100;

  const calculations = useMemo(() => {
    const wc = parseFloat(waterConsumption) || 0;
    const r = parseFloat(rate) || 0;
    const ec = parseFloat(extraCharges) || 0;
    const baseWaterCharge = wc * r;
    const amountBeforeTax = baseWaterCharge + ec;
    const cgstAmount = amountBeforeTax * cgstRate;
    const sgstAmount = amountBeforeTax * sgstRate;
    const totalTaxAmount = cgstAmount + sgstAmount;

    // Do not round off, let the actual value be used
    const amountAfterTax = amountBeforeTax + totalTaxAmount;
    const roundOff = 0;

    return {
      baseWaterCharge,
      amountBeforeTax,
      cgstAmount,
      sgstAmount,
      totalTaxAmount,
      amountAfterTax,
      roundOff,
    };
  }, [waterConsumption, rate, extraCharges, cgstRate, sgstRate]);

  const amountInWords = useMemo(() => {
    return numberToWords(calculations.amountAfterTax);
  }, [calculations.amountAfterTax]);

  const getInvoicePayload = () => {
    if (!selectedClient) {
      alert('Please select a receiver.');
      return null;
    }

    const wc = parseFloat(waterConsumption) || 0;
    const r = parseFloat(rate) || 0;
    const ec = parseFloat(extraCharges) || 0;
    const prevOutstanding = parseFloat(previousOutstanding) || 0;
    const payRs = parseFloat(pleasePayRs) || 0;

    const invoiceItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: `Effluent Treatment Charges for the month of ${monthText}\n${additionalDesc}`.trim(),
      sacCode: sacCode,
      waterConsumption: wc,
      rate: r,
      extraCharges: ec,
      baseCharge: calculations.baseWaterCharge,
      taxableAmount: calculations.amountBeforeTax,
    };

    const invoiceData: Invoice = {
      id: savedInvoiceId || crypto.randomUUID(),
      invoiceNo: `${activeSettings.financialYearPrefix}/${invoiceNo}`,
      date: invoiceDate,
      clientId: selectedClient.id,
      items: [invoiceItem],
      totals: {
        baseCharge: calculations.baseWaterCharge,
        extraCharges: ec,
        amountBeforeTax: calculations.amountBeforeTax,
        cgstAmount: calculations.cgstAmount,
        sgstAmount: calculations.sgstAmount,
        totalTaxAmount: calculations.totalTaxAmount,
        amountAfterTax: calculations.amountAfterTax,
        previousOutstanding: prevOutstanding,
      },
      dpc: {
        ifPaidAfterDate,
        pleasePayRs: payRs,
      },
      status: 'Unpaid',
      systemSettingsSnapshot: activeSettings,
    };

    return invoiceData;
  };

  const handleSave = async () => {
    const invoiceData = getInvoicePayload();
    if (!invoiceData || !selectedClient) return;

    try {
      if (window.billingAPI?.saveInvoice) {
        const res = await window.billingAPI.saveInvoice(invoiceData);
        if (res.success) {
          alert('Invoice saved successfully');
          setSavedInvoiceId(invoiceData.id);
          setIsSaved(true);
          setIsEditing(false);
          // Only load next invoice no if it's a completely new form
        }
      } else {
        // Mock mode — no backend, show summary to user
        setSavedInvoiceId(invoiceData.id);
        setIsSaved(true);
        setIsEditing(false);
        alert(
          `✅ Invoice Saved (Mock Mode)\n\n` +
          `Invoice No: ${invoiceData.invoiceNo}\n` +
          `Client: ${selectedClient.name}\n` +
          `Date: ${invoiceData.date}\n` +
          `Water: ${waterConsumption} M³ × ₹${rate}/M³\n` +
          `Base Charge: ₹${calculations.baseWaterCharge.toFixed(2)}\n` +
          `Extra Charges: ₹${(parseFloat(extraCharges) || 0).toFixed(2)}\n` +
          `Before Tax: ₹${calculations.amountBeforeTax.toFixed(2)}\n` +
          `CGST (2.5%): ₹${calculations.cgstAmount.toFixed(2)}\n` +
          `SGST (2.5%): ₹${calculations.sgstAmount.toFixed(2)}\n` +
          `Total After Tax: ₹${calculations.amountAfterTax.toFixed(2)}\n\n` +
          `Amount in Words: ${amountInWords}`
        );
      }
    } catch (e) {
      console.error(e);
      alert('Error saving invoice: ' + (e as Error).message);
    }
  };

  const handlePrint = async () => {
    const invoiceData = getInvoicePayload();
    if (!invoiceData || !selectedClient) return;

    if (window.billingAPI?.printDocument) {
      const printData = {
        invoiceData,
        client: selectedClient,
        settings: activeSettings,
        amountInWords
      };

      try {
        const res = await window.billingAPI.printDocument('invoice', printData) as any;
        if (res.success) {
          alert(`✅ Invoice PDF saved to Downloads folder!\nPath: ${res.filePath}`);
        }
      } catch (e) {
        console.error(e);
        alert('Error generating PDF: ' + (e as Error).message);
      }
    } else {
      // Fallback: use browser print dialog
      window.print();
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 pb-10 space-y-5">

        {/* ── Company Header ── compact banner (reads from settings) */}
        <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">ACMA CETP CO-OP. SOCIETY LTD.</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                REGD. NO. TNA/ULR/GNL/(0)/359/94-95/1994 &nbsp;•&nbsp; SHED NO. W-30, M.I.D.C., CHEMICAL ZONE, AMBERNATH (WEST)
              </p>
            </div>
            <div className="text-right text-xs text-slate-300 space-y-0.5">
              <div>Tel: {activeSettings.officialPhone} &nbsp;|&nbsp; Cell: {activeSettings.officialMobile}</div>
              <div>{activeSettings.officialEmail}</div>
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
              <CardContent className="p-4 pt-2">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  Invoice Details
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-0 pl-3 pt-4 flex items-center pointer-events-none text-sm text-muted-foreground font-mono">
                      {activeSettings.financialYearPrefix}/
                    </div>
                    <input
                      type="text"
                      className="flex h-12 w-full rounded-md border border-input bg-transparent pl-[4.7rem] pr-3 py-1 pt-5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      disabled={isSaved && !isEditing}
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
                    disabled={isSaved && !isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Receiver Details */}
            <Card className="relative z-20">
              <CardContent className="p-4 pt-2">

                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  Receiver Details (Billed To)
                </div>
                <SearchSelect
                  label="Select Client"
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={isSaved && !isEditing}
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
              <CardContent className="p-4 pt-2">
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
                      disabled={isSaved && !isEditing}
                    />
                  </div>
                  <Input
                    label="SAC Code"
                    value={sacCode}
                    disabled
                  />
                </div>

                <div className="relative mt-3">
                  <textarea
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 pt-5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[56px] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Additional Descriptions"
                    value={additionalDesc}
                    onChange={(e) => setAdditionalDesc(e.target.value)}
                    disabled={isSaved && !isEditing}
                  />
                  <label className="absolute left-3 top-1 text-xs text-muted-foreground pointer-events-none">
                    Additional Descriptions (e.g. Sample Testing Charges)
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <Input
                    type="text"
                    label="Water Consumption (M³)"
                    value={waterConsumption}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setWaterConsumption(val);
                      }
                    }}
                    disabled={isSaved && !isEditing}
                  />
                  <Input
                    type="text"
                    label="Rate (Rs / M³)"
                    value={rate}
                    disabled
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setRate(val);
                      }
                    }}
                  />
                  <Input
                    type="text"
                    label="Extra Misc Charges (Rs.)"
                    value={extraCharges}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setExtraCharges(val);
                      }
                    }}
                    disabled={isSaved && !isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Previous Outstanding & DPC */}
            <Card>
              <CardContent className="p-4 pt-2">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
                  <IndianRupee className="w-4 h-4" />
                  Outstanding & DPC
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    type="text"
                    label="Previous Outstanding Rs."
                    value={previousOutstanding}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setPreviousOutstanding(val);
                      }
                    }}
                    disabled={isSaved && !isEditing}
                  />
                  <Input
                    label="DPC: If Paid after"
                    type="date"
                    value={ifPaidAfterDate}
                    onChange={(e) => setIfPaidAfterDate(e.target.value)}
                    disabled={isSaved && !isEditing}
                  />
                  <Input
                    label="Please Pay Rs."
                    type="text"
                    value={pleasePayRs}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setPleasePayRs(val);
                      }
                    }}
                    disabled={isSaved && !isEditing}
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
                  {parseFloat(extraCharges) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Extra Charges</span>
                      <span className="tabular-nums">₹ {parseFloat(extraCharges).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-white/10 my-2" />
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-300">Total Before Tax</span>
                    <span className="tabular-nums">₹ {calculations.amountBeforeTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Add: CGST @ {activeSettings.cgstPercentage}%</span>
                    <span className="tabular-nums">₹ {calculations.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Add: SGST @ {activeSettings.sgstPercentage}%</span>
                    <span className="tabular-nums">₹ {calculations.sgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Tax (GST @ {activeSettings.cgstPercentage + activeSettings.sgstPercentage}%)</span>
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
                  {isSaved && !isEditing ? (
                    <Button
                      variant="secondary"
                      className="w-1/2 gap-2 bg-blue-600 hover:bg-blue-700 text-black border-0"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="w-4 h-4" />
                      Edit Invoice
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-1/2 gap-2 bg-emerald-600 hover:bg-emerald-700 text-black border-0"
                      onClick={handleSave}
                    >
                      <Save className="w-4 h-4" />
                      Save Invoice
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className={`w-1/2 gap-2 text-white border-0 ${(!isSaved || isEditing) ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}
                    onClick={(!isSaved || isEditing) ? undefined : handlePrint}
                    title="Print Invoice"
                    disabled={!isSaved || isEditing}
                  >
                    Print Invoice
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
                    <div>Current A/c No.: <span className="font-mono">{activeSettings.bankAccountNo}</span></div>
                    <div>IFSC: <span className="font-mono">{activeSettings.bankIfscCode}</span> &nbsp;|&nbsp; MICR: <span className="font-mono">{activeSettings.bankMicrCode}</span></div>
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
