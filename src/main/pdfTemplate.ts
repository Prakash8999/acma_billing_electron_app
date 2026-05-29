function formatRupees(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '-'
  return amount.toFixed(2)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}` // DD-MM-YYYY
  }
  return dateStr
}

function splitTextIntoTwoLines(text: string, maxCharsOnFirstLine: number): [string, string] {
  if (!text) return ['', '']
  if (text.length <= maxCharsOnFirstLine) {
    return [text, '']
  }
  
  // Find the last space before maxCharsOnFirstLine
  let splitIndex = text.lastIndexOf(' ', maxCharsOnFirstLine)
  if (splitIndex === -1 || splitIndex < maxCharsOnFirstLine * 0.5) {
    // If no space, or space is too far back, just split at maxCharsOnFirstLine
    splitIndex = maxCharsOnFirstLine
  }
  
  const firstLine = text.substring(0, splitIndex).trim()
  const secondLine = text.substring(splitIndex).trim()
  return [firstLine, secondLine]
}

export function generateInvoiceHTML(data: any): string {
  const { invoiceData, client, settings, amountInWords } = data
  const item = invoiceData.items[0]

  const [nameLine1, nameLine2] = splitTextIntoTwoLines(client.name || '', 30)
  const [addrLine1, addrLine2] = splitTextIntoTwoLines(client.address || '', 30)
  const [wordsLine1, wordsLine2] = splitTextIntoTwoLines(amountInWords || '', 28)

  const renderServiceRows = () => {
    const descLines = item?.description ? item.description.split('\n') : []
    if (descLines.length === 0) {
      descLines.push('Effluent Treatment Charges for the')
      descLines.push('month of ')
    } else if (descLines.length === 1) {
      if (!descLines[0].toLowerCase().includes('month')) {
        descLines.push('month of ')
      }
    }

    // Ensure we have at least 4 lines
    while (descLines.length < 4) {
      descLines.push('')
    }

    // Handle additional charges in the description if present
    if (item?.additionalCharges > 0) {
      const hasAddLine = descLines.some((l, idx) => idx > 0 && l.trim() !== '' && !l.toLowerCase().includes('extra'))
      if (!hasAddLine) {
        if (descLines[1] === '') {
          descLines[1] = 'Additional Charges'
        } else if (descLines[2] === '') {
          descLines[2] = 'Additional Charges'
        } else if (descLines[3] === '') {
          descLines[3] = 'Additional Charges'
        } else {
          descLines.push('Additional Charges')
        }
      }
    }

    // Handle extra charges in the description if present
    if (item?.extraCharges > 0 && !descLines.some((l) => l.toLowerCase().includes('extra'))) {
      if (descLines[2] === '') {
        descLines[2] = 'Extra Misc Charges'
      } else if (descLines[3] === '') {
        descLines[3] = 'Extra Misc Charges'
      } else {
        descLines.push('Extra Misc Charges')
      }
    }

    // Ensure we still have exactly 4 lines to preserve grid height
    while (descLines.length < 4) {
      descLines.push('')
    }
    if (descLines.length > 4) {
      descLines.length = 4
    }

    const rows: string[] = []

    const amountLines = ['', '', '', '']
    amountLines[0] = item?.baseCharge ? formatRupees(item.baseCharge) : ''

    const addLineIndex = descLines.findIndex((l, idx) => idx > 0 && l.trim() !== '' && !l.toLowerCase().includes('extra'))
    if (addLineIndex !== -1 && item?.additionalCharges > 0) {
      amountLines[addLineIndex] = formatRupees(item.additionalCharges)
    }

    const extraLineIndex = descLines.findIndex((l) => l.toLowerCase().includes('extra'))
    if (extraLineIndex !== -1 && item?.extraCharges > 0) {
      amountLines[extraLineIndex] = formatRupees(item.extraCharges)
    }

    for (let i = 0; i < 4; i++) {
      let extraCols = ''
      if (i === 0) {
        const sac = item?.sacCode || ''
        const consumption = item?.waterConsumption ? `${item.waterConsumption} M³` : ''
        const rateStr = item?.rate ? formatRupees(item.rate) : ''

        extraCols = `
          <td rowspan="4" style="border-bottom:1px solid #000;border-right:1px solid #000;padding:0;vertical-align:top;font-size:12px;width:12%;text-align:center;">
            <div style="height:45px;line-height:45px;text-align:center;">${sac || '&nbsp;'}</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
          </td>
          <td rowspan="4" style="border-bottom:1px solid #000;border-right:1px solid #000;padding:0;vertical-align:top;font-size:12px;width:16%;text-align:center;">
            <div style="height:45px;line-height:45px;text-align:center;">${consumption || '&nbsp;'}</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
          </td>
          <td rowspan="4" style="border-bottom:1px solid #000;border-right:1px solid #000;padding:0;vertical-align:top;font-size:12px;width:14%;text-align:right;">
            <div style="height:45px;line-height:45px;text-align:right;padding-right:7px;">${rateStr || '&nbsp;'}</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
            <div style="height:45px;line-height:45px;">&nbsp;</div>
          </td>
          <td rowspan="4" style="border-bottom:1px solid #000;padding:0;vertical-align:top;font-size:12px;width:20%;text-align:right;">
            <div style="height:45px;line-height:45px;text-align:right;padding-right:7px;font-family:monospace;">${amountLines[0] || '&nbsp;'}</div>
            <div style="height:45px;line-height:45px;text-align:right;padding-right:7px;font-family:monospace;">${amountLines[1] || '&nbsp;'}</div>
            <div style="height:45px;line-height:45px;text-align:right;padding-right:7px;font-family:monospace;">${amountLines[2] || '&nbsp;'}</div>
            <div style="height:45px;line-height:45px;text-align:right;padding-right:7px;font-family:monospace;">${amountLines[3] || '&nbsp;'}</div>
          </td>
        `
      }

      rows.push(`
        <tr>
          <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:0 7px;line-height:45px;height:45px;vertical-align:middle;font-size:12px;width:38%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${descLines[i] || '&nbsp;'}
          </td>
          ${extraCols}
        </tr>
      `)
    }

    return rows.join('')
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      background: white;
      color: #000;
      font-size: 12px;
    }
    .invoice-wrap {
      width: 194mm;
      margin: 0 auto;
    }
    table { width: 100%; border-collapse: collapse; }
    .outer { border: 2px solid #000; }
    .cell-pad { padding: 6px 8px; }
    .bold { font-weight: bold; }
    .center { text-align: center; }
    .right { text-align: right; }
    .underline-blank {
      display: inline-block;
      border-bottom: 1px solid #000;
      min-width: 140px;
      height: 14px;
      vertical-align: bottom;
    }
  </style>
</head>
<body>
<div class="invoice-wrap">
<table class="outer">

  <!-- ===== ROW 1: HEADER ===== -->
  <tr>
    <td colspan="5" style="border-bottom:2px solid #000;padding:10px 12px 8px 12px;text-align:center;">
      <div style="font-size:26px;font-weight:bold;letter-spacing:0.5px;line-height:1.2;">ACMA CETP CO-OP. SOCIETY LTD.</div>
      <div style="font-size:10px;font-weight:bold;margin-top:3px;">REGD. NO. TNA/ULR/GNL/(0)/359/94-95 /1994</div>
      <div style="font-size:10px;font-weight:bold;margin-top:2px;">&#9632; SHED NO. W-30, M.I.D.C., CHEMICAL ZONE, AMBERNATH (WEST) &#9632;</div>
      <div style="font-size:10px;margin-top:2px;">Tel. No: ${settings.officialPhone} | Cell No. ${settings.officialMobile} | E-Mail : ${settings.officialEmail}</div>
    </td>
  </tr>

  <!-- ===== ROW 2: TAX INVOICE ===== -->
  <tr>
    <td colspan="5" style="border-bottom:2px solid #000;text-align:center;padding:6px;font-size:17px;font-weight:bold;letter-spacing:3px;position:relative;height:55px;">
      TAX INVOICE
      <div style="position:absolute;top:2px;right:10px;border:1px solid #000;font-size:8px;line-height:1.2;min-width:130px;text-align:left;font-weight:normal;letter-spacing:normal;">
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="border:1px solid #000;padding:1px 3px;"><span style="display:inline-block;width:7px;height:7px;border:1px solid #000;margin-right:3px;text-align:center;font-size:6px;line-height:7px;font-weight:bold;vertical-align:middle;margin-top:-2px;">✓</span>Original For Recipient</td></tr>
          <tr><td style="border:1px solid #000;padding:1px 3px;"><span style="display:inline-block;width:7px;height:7px;border:1px solid #000;margin-right:3px;vertical-align:middle;margin-top:-2px;"></span>Duplicate For Recipient</td></tr>
          <tr><td style="border:1px solid #000;padding:1px 3px;"><span style="display:inline-block;width:7px;height:7px;border:1px solid #000;margin-right:3px;vertical-align:middle;margin-top:-2px;"></span>Triplicate For Supplier</td></tr>
          <tr><td style="border:1px solid #000;padding:1px 3px;"><span style="display:inline-block;width:7px;height:7px;border:1px solid #000;margin-right:3px;vertical-align:middle;margin-top:-2px;"></span>Extra Copy</td></tr>
        </table>
      </div>
    </td>
  </tr>

  <!-- ===== ROW 3: GSTIN / STATE ===== -->
  <tr>
    <td colspan="2" style="border-bottom:2px solid #000;border-right:2px solid #000;padding:5px 8px;vertical-align:top;width:50%;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:85px;font-weight:bold;padding:2px 0;font-size:12px;white-space:nowrap;">GSTIN No.</td>
          <td style="font-size:12px;padding:2px 0;">:&nbsp; ${settings.gstin || '27AAAAA4636P1ZH'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;padding:2px 0;font-size:12px;">PAN No.</td>
          <td style="font-size:12px;padding:2px 0;">:&nbsp; ${settings.pan || 'AAAAA4636P'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;padding:2px 0;font-size:12px;">Invoice No.</td>
          <td style="font-size:13px;font-weight:bold;padding:2px 0;">:&nbsp; ${invoiceData.invoiceNo}</td>
        </tr>
      </table>
    </td>
    <td colspan="3" style="border-bottom:2px solid #000;padding:5px 8px;vertical-align:top;width:50%;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:90px;font-weight:bold;padding:2px 0;font-size:12px;">State</td>
          <td style="font-size:12px;padding:2px 0;">:&nbsp; Maharashtra</td>
        </tr>
        <tr>
          <td style="font-weight:bold;padding:2px 0;font-size:12px;">State Code</td>
          <td style="font-size:12px;padding:2px 0;">:&nbsp; 27</td>
        </tr>
        <tr>
          <td style="font-weight:bold;padding:2px 0;font-size:12px;">Invoice Date</td>
          <td style="font-size:12px;font-weight:bold;padding:2px 0;">:&nbsp; ${formatDate(invoiceData.date)}</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ===== ROW 4: DETAILS OF RECEIVER HEADER ===== -->
  <tr>
    <td colspan="5" style="border-bottom:1px solid #000;background:#f0f0f0;padding:4px 8px;font-weight:bold;font-size:12px;">
      Details of Receiver (Billed To)
    </td>
  </tr>

  <!-- ===== ROW 5: RECEIVER DETAILS ===== -->
  <tr>
    <td colspan="2" style="border-bottom:2px solid #000;border-right:2px solid #000;padding:8px;vertical-align:top;width:50%;">
      <div style="display: flex; align-items: flex-end; height: 24px; line-height: 18px;">
        <span style="font-weight: bold; padding-right: 5px; white-space: nowrap;">Name &nbsp;&nbsp;:</span>
        <div style="flex-grow: 1; border-bottom: 1px solid #000; font-weight: bold; font-size: 13px; padding-left: 5px; padding-bottom: 1px;">
          ${nameLine1 || '&nbsp;'}
        </div>
      </div>
      <div style="border-bottom: 1px solid #000; font-weight: bold; font-size: 13px; padding-left: 5px; height: 24px; line-height: 24px; width: 100%;">
        ${nameLine2 || '&nbsp;'}
      </div>

      <div style="height: 8px;"></div>

      <div style="display: flex; align-items: flex-end; height: 24px; line-height: 18px;">
        <span style="font-weight: bold; padding-right: 5px; white-space: nowrap;">Address :</span>
        <div style="flex-grow: 1; border-bottom: 1px solid #000; padding-left: 5px; padding-bottom: 1px;">
          ${addrLine1 || '&nbsp;'}
        </div>
      </div>
      <div style="border-bottom: 1px solid #000; padding-left: 5px; height: 24px; line-height: 24px; width: 100%;">
        ${addrLine2 || '&nbsp;'}
      </div>
    </td>
    <td colspan="3" style="border-bottom:2px solid #000;padding:8px;vertical-align:top;width:50%;">
      <table style="width:100%;border-collapse:collapse;height:100px;">
        <tr>
          <td style="width:90px;font-weight:bold;font-size:12px;padding:6px 0;vertical-align:middle;">State</td>
          <td style="font-size:12px;padding:6px 0;vertical-align:middle;">:&nbsp; ${client.state || 'Maharashtra'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;font-size:12px;padding:6px 0;vertical-align:middle;">State Code</td>
          <td style="font-size:12px;padding:6px 0;vertical-align:middle;">:&nbsp; ${client.stateCode || '27'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;font-size:12px;padding:6px 0;vertical-align:middle;">GSTIN No.</td>
          <td style="font-size:12px;font-weight:bold;font-family:monospace;padding:6px 0;vertical-align:middle;white-space:nowrap;">:&nbsp; ${client.gstin || ''}</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ===== ROW 6: SERVICE TABLE HEADER ===== -->
  <tr style="background:#f0f0f0;font-weight:bold;font-size:11px;text-align:center;">
    <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:6px 5px;width:38%;">Description of Services</td>
    <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:6px 5px;width:12%;">SAC Code</td>
    <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:6px 5px;width:16%;">WATER<br>CONSUMPTION<br><span style="font-size:9px;font-weight:normal;">[ M³ ]</span></td>
    <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:6px 5px;width:14%;">RATE<br><span style="font-size:9px;font-weight:normal;">[ Rs/M³ ]</span></td>
    <td style="border-bottom:1px solid #000;padding:6px 5px;width:20%;">TAXABLE<br>AMOUNT<br><span style="font-size:9px;font-weight:normal;">[ Rs. ]</span></td>
  </tr>

  <!-- ===== ROW 7: SERVICE ROWS ===== -->
  ${renderServiceRows()}

  <!-- ===== ROW 8: TOTALS SECTION ===== -->
  <tr>
    <!-- Left: invoice value text -->
    <td colspan="3" style="border-top:2px solid #000;border-right:2px solid #000;padding:12px 10px;vertical-align:top;width:66%;">
      <!-- Total in figure -->
      <div style="display: flex; align-items: flex-end; margin-bottom: 8px;">
        <span style="font-weight: bold; font-size: 12px; white-space: nowrap; padding-right: 4px;">Total Invoice Value (In Figure) Rs.</span>
        <div style="flex-grow: 1; border-bottom: 1px solid #000; font-family: monospace; font-weight: bold; font-size: 13px; padding-left: 5px; padding-bottom: 1px;">
          ${invoiceData.totals.amountAfterTax ? formatRupees(invoiceData.totals.amountAfterTax) : ''}
        </div>
      </div>
      <!-- Total in words -->
      <div style="display: flex; align-items: flex-end; height: 20px; line-height: 18px;">
        <span style="font-weight: bold; white-space: nowrap; padding-right: 5px;">Total Invoice Value (In words) Rupees.</span>
        <div style="flex-grow: 1; border-bottom: 1px solid #000; font-style: italic; font-weight: bold; font-size: 11px; padding-left: 5px; padding-bottom: 1px;">
          ${wordsLine1 || '&nbsp;'}
        </div>
      </div>
      <div style="border-bottom: 1px solid #000; font-style: italic; font-weight: bold; font-size: 11px; padding-left: 5px; height: 20px; line-height: 20px; width: 100%; margin-bottom: 12px;">
        ${wordsLine2 || '&nbsp;'}
      </div>
      <!-- DPC : If Paid after -->
      <div style="display: flex; align-items: flex-end; margin-bottom: 8px; border-top: 1px solid #000; padding-top: 8px;">
        <span style="font-weight: bold; font-size: 12px; white-space: nowrap; padding-right: 4px;">DPC : If Paid after</span>
        <div style="flex-grow: 1; border-bottom: 1px solid #000; padding-left: 5px; padding-bottom: 1px;">
          ${invoiceData.dpc?.ifPaidAfterDate ? formatDate(invoiceData.dpc.ifPaidAfterDate) : ''}
        </div>
      </div>
      <!-- Please Pay Rs -->
      <div style="display: flex; align-items: flex-end; margin-bottom: 8px;">
        <span style="font-weight: bold; font-size: 12px; white-space: nowrap; padding-right: 4px;">Please Pay Rs.</span>
        <div style="flex-grow: 1; border-bottom: 1px solid #000; font-family: monospace; padding-left: 5px; padding-bottom: 1px;">
          ${invoiceData.dpc?.pleasePayRs ? formatRupees(invoiceData.dpc.pleasePayRs) : ''}
        </div>
      </div>
      <!-- Empty Spacer Line -->
      <div style="display: flex; align-items: flex-end; margin-bottom: 12px; height: 18px;">
        <div style="flex-grow: 1; border-bottom: 1px solid #000;"></div>
      </div>
      <!-- Previous Outstanding -->
      <div style="display: flex; align-items: flex-end; margin-bottom: 4px; border-top: 1px solid #000; padding-top: 8px;">
        <span style="font-weight: bold; font-size: 12px; white-space: nowrap; padding-right: 4px;">Previous Outstanding Amount Rs.</span>
        <div style="flex-grow: 1; border-bottom: 1px solid #000; font-family: monospace; padding-left: 5px; padding-bottom: 1px;">
          ${invoiceData.totals.previousOutstanding ? formatRupees(invoiceData.totals.previousOutstanding) : ''}
        </div>
      </div>
    </td>

    <!-- Right: computation table -->
    <td colspan="2" style="border-top:2px solid #000;padding:0;vertical-align:top;width:34%;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr>
          <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:5px 7px;font-weight:bold;width:63%;">Total Amount Before Tax</td>
          <td style="border-bottom:1px solid #000;padding:5px 7px;text-align:right;font-family:monospace;font-weight:bold;">${invoiceData.totals.amountBeforeTax ? formatRupees(invoiceData.totals.amountBeforeTax) : ''}</td>
        </tr>
        <tr>
          <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:5px 7px;">Add : CGST @ ${settings.cgstPercentage}%</td>
          <td style="border-bottom:1px solid #000;padding:5px 7px;text-align:right;font-family:monospace;">${invoiceData.totals.cgstAmount ? formatRupees(invoiceData.totals.cgstAmount) : ''}</td>
        </tr>
        <tr>
          <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:5px 7px;">Add : SGST @ ${settings.sgstPercentage}%</td>
          <td style="border-bottom:1px solid #000;padding:5px 7px;text-align:right;font-family:monospace;">${invoiceData.totals.sgstAmount ? formatRupees(invoiceData.totals.sgstAmount) : ''}</td>
        </tr>
        <tr>
          <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:5px 7px;font-weight:bold;line-height:1.3;">Total Tax Amount<br>(GST @ ${settings.cgstPercentage + settings.sgstPercentage}%)</td>
          <td style="border-bottom:1px solid #000;padding:5px 7px;text-align:right;font-weight:bold;font-family:monospace;">${invoiceData.totals.totalTaxAmount ? formatRupees(invoiceData.totals.totalTaxAmount) : ''}</td>
        </tr>
        <tr>
          <td style="border-bottom:1px solid #000;border-right:1px solid #000;padding:5px 7px;">Round Off</td>
          <td style="border-bottom:1px solid #000;padding:5px 7px;text-align:right;font-family:monospace;">${invoiceData.totals.roundOff ? formatRupees(invoiceData.totals.roundOff) : '-'}</td>
        </tr>
        <tr>
          <td style="border-right:1px solid #000;padding:6px 7px;font-weight:bold;font-size:12px;background:#f0f0f0;">Total Amount After Tax</td>
          <td style="padding:6px 7px;text-align:right;font-weight:bold;font-size:12px;background:#f0f0f0;font-family:monospace;">${invoiceData.totals.amountAfterTax ? formatRupees(invoiceData.totals.amountAfterTax) : ''}</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ===== ROW 9: FOOTER — BANK / SIGNATURE ===== -->
  <tr>
    <!-- Bank Details -->
    <td colspan="2" style="border-top:2px solid #000;border-right:2px solid #000;padding:8px 10px;vertical-align:top;width:50%;">
      <div style="font-weight:bold;font-size:12px;margin-bottom:3px;">Bank Details :</div>
      <div style="font-weight:bold;font-size:12px;margin-bottom:2px;">AMBARNATH JAI-HIND CO-OP. BANK LTD.</div>
      <div style="font-size:11px;line-height:1.6;">
        Branch : Main Branch, Ambarnath (West)<br>
        Current Account No. : <strong>${settings.bankAccountNo}</strong><br>
        IFSC Code : <strong>${settings.bankIfscCode}</strong><br>
        MICR Code : <strong>${settings.bankMicrCode}</strong>
      </div>
    </td>
    <!-- Receiver Signature -->
    <td colspan="1" style="border-top:2px solid #000;border-right:2px solid #000;padding:10px 8px;text-align:center;vertical-align:bottom;width:16%;">
      <div style="border-top:1px solid #000;width:80%;margin:0 auto 4px auto;"></div>
      <div style="font-size:11px;line-height:1.4;">Receiver Signature<br>with Rubber Stamp</div>
    </td>
    <!-- Authorised Signature -->
    <td colspan="2" style="border-top:2px solid #000;padding:8px 10px;text-align:center;vertical-align:top;width:34%;position:relative;height:140px;">
      <div style="font-weight:bold;font-size:12px;">For ACMA CETP CO-OP. SOCIETY LTD.</div>
      <div style="position:absolute;bottom:10px;right:15px;font-size:11px;font-weight:bold;text-align:right;">
        Authorised Signature
      </div>
    </td>
  </tr>

</table>
</div>
</body>
</html>`
}

export function generateReceiptHTML(data: any): string {
  const { receiptData, invoiceData, client, settings, amountInWords } = data

  const paymentDetails =
    receiptData.paymentMethod === 'Cash'
      ? 'By Cash'
      : `By ${receiptData.paymentMethod} No: <span style="font-weight: bold; text-decoration: underline;">${receiptData.refNumber || '__________'}</span> Dated: <span style="font-weight: bold; text-decoration: underline;">${formatDate(receiptData.instrumentDate) || '__________'}</span>`

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background-color: white;
          color: black;
        }
        .receipt-box {
          width: 190mm;
          margin: 0 auto;
          box-sizing: border-box;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
      </style>
    </head>
    <body>
      <div class="receipt-box">
        <table style="border: 2px solid black;">
          <!-- Header -->
          <tr>
            <td colspan="4" style="border-bottom: 2px solid black; padding: 12px; text-align: center; position: relative;">
              <div style="font-size: 26px; font-weight: bold; letter-spacing: 0.5px;">ACMA CETP CO-OP. SOCIETY LTD.</div>
              <div style="font-size: 11px; margin-top: 4px; font-weight: bold; letter-spacing: 0.5px;">REGD. NO. TNA/ULR/GNL/(0)/359/94-95 /1994</div>
              <div style="font-size: 11px; font-weight: bold; margin-top: 4px;">■ SHED NO. W-30, M.I.D.C., CHEMICAL ZONE, AMBERNATH (WEST) ■</div>
              <div style="font-size: 11px; margin-top: 4px;">Tel. No: ${settings.officialPhone} | Cell No. ${settings.officialMobile} | E-Mail : ${settings.officialEmail}</div>
            </td>
          </tr>
          
          <!-- MONEY RECEIPT Header -->
          <tr>
            <td colspan="4" style="border-bottom: 2px solid black; text-align: center; font-size: 18px; font-weight: bold; padding: 8px; letter-spacing: 2px;">
              MONEY RECEIPT
            </td>
          </tr>
          
          <!-- Receipt Details -->
          <tr>
            <td colspan="2" style="width: 50%; border-bottom: 2px solid black; border-right: 2px solid black; padding: 8px; vertical-align: top;">
              <span style="font-weight: bold;">Receipt No:</span> <span style="font-size: 15px; font-weight: bold;">${receiptData.receiptNo}</span>
            </td>
            <td colspan="2" style="width: 50%; border-bottom: 2px solid black; padding: 8px; vertical-align: top;">
              <span style="font-weight: bold;">Receipt Date:</span> <span style="font-weight: bold;">${formatDate(receiptData.date)}</span>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td colspan="4" style="padding: 20px; font-size: 14px; line-height: 2.2; border-bottom: 2px solid black;">
              Received with thanks from M/s. <span style="font-weight: bold; font-size: 15px; border-bottom: 1px dotted black; display: inline-block; min-width: 300px; padding-left: 5px;">${client.name}</span><br>
              
              Address: <span style="border-bottom: 1px dotted black; display: inline-block; min-width: 500px; padding-left: 5px;">${client.address}</span><br>
              
              A sum of Rupees <span style="font-weight: bold; font-style: italic; border-bottom: 1px dotted black; display: inline-block; min-width: 450px; padding-left: 5px;">${amountInWords}</span><br>
              
              ${paymentDetails}<br>
              
              On account of Invoice No: <span style="font-weight: bold; border-bottom: 1px dotted black; display: inline-block; min-width: 150px; padding-left: 5px;">${invoiceData.invoiceNo}</span> 
              Dated: <span style="font-weight: bold; border-bottom: 1px dotted black; display: inline-block; min-width: 120px; padding-left: 5px;">${formatDate(invoiceData.date)}</span><br>
              
              Payment Allocation: <span style="font-weight: bold; border-bottom: 1px dotted black; display: inline-block; min-width: 150px; padding-left: 5px;">${receiptData.allocation === 'Full' ? 'Full Payment' : 'Part Payment'}</span>
            </td>
          </tr>

          <!-- Bottom Footer Details -->
          <tr>
            <td colspan="2" style="padding: 15px; vertical-align: middle; border-right: 2px solid black; width: 50%;">
              <div style="border: 2px solid black; padding: 12px; display: inline-block; font-size: 18px; font-weight: bold; font-family: monospace; background-color: #f5f5f5;">
                Rs. ${formatRupees(receiptData.amountReceived)}
              </div>
            </td>
            <td colspan="2" style="padding: 15px; text-align: center; vertical-align: top; height: 120px; position: relative; width: 50%;">
              <span style="font-weight: bold; font-size: 12px; display: block;">For ACMA CETP CO-OP. SOCIETY LTD.</span>
              <div style="position: absolute; bottom: 15px; left: 0; right: 0; text-align: center;">
                <div style="border-top: 1px solid black; width: 80%; margin: 0 auto 4px auto;"></div>
                <span style="font-size: 11px; font-weight: bold;">Authorised Signature</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `
}
