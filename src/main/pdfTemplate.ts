function formatRupees(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '-';
  return amount.toFixed(2);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
  }
  return dateStr;
}

export function generateInvoiceHTML(data: any): string {
  const { invoiceData, client, settings, amountInWords } = data;
  const item = invoiceData.items[0]; // Assuming single item for now

  // Render Service Rows (max 4 rows total)
  const renderServiceRows = () => {
    const rows: string[] = [];
    const descLines = item?.description ? item.description.split('\n') : [];
    
    // Render based on items / descriptions
    for (let i = 0; i < Math.max(descLines.length, 1); i++) {
      const isFirst = i === 0;
      const isSecondWithExtra = i === 1 && item?.extraCharges > 0;
      
      let sac = '';
      let consumption = '';
      let rateStr = '';
      let amountStr = '';
      
      if (isFirst) {
        sac = item?.sacCode || '';
        consumption = item?.waterConsumption ? `${item.waterConsumption} M³` : '';
        rateStr = item?.rate ? formatRupees(item.rate) : '';
        amountStr = item?.baseCharge ? formatRupees(item.baseCharge) : '';
      } else if (isSecondWithExtra || (i === 1 && !isFirst)) {
        amountStr = item?.extraCharges ? formatRupees(item.extraCharges) : '';
      }
      
      rows.push(`
        <tr>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px; vertical-align: top; height: 40px; font-family: monospace; font-size: 13px;">
            ${descLines[i] || 'Effluent Treatment Charges'}
          </td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px; text-align: center; vertical-align: top; font-family: monospace;">
            ${sac}
          </td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px; text-align: center; vertical-align: top; font-family: monospace;">
            ${consumption}
          </td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px; text-align: right; vertical-align: top; font-family: monospace;">
            ${rateStr}
          </td>
          <td style="border-bottom: 1px solid black; padding: 8px; text-align: right; vertical-align: top; font-family: monospace;">
            ${amountStr}
          </td>
        </tr>
      `);
    }

    // Handle case where we have extraCharges but no description newline
    if (descLines.length <= 1 && item?.extraCharges > 0) {
      rows.push(`
        <tr>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px; vertical-align: top; height: 40px; font-family: monospace; font-size: 13px;">
            Extra Misc Charges
          </td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;"></td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;"></td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;"></td>
          <td style="border-bottom: 1px solid black; padding: 8px; text-align: right; vertical-align: top; font-family: monospace;">
            ${formatRupees(item.extraCharges)}
          </td>
        </tr>
      `);
    }

    // Fill up to 4 rows total to preserve page height
    const currentRowsCount = rows.length;
    for (let i = currentRowsCount; i < 4; i++) {
      rows.push(`
        <tr>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px; height: 40px;"></td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;"></td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;"></td>
          <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 8px;"></td>
          <td style="border-bottom: 1px solid black; padding: 8px;"></td>
        </tr>
      `);
    }

    return rows.join('');
  };

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
        .invoice-box {
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
      <div class="invoice-box">
        <table style="border: 2px solid black;">
          <!-- Header -->
          <tr>
            <td colspan="5" style="border-bottom: 2px solid black; padding: 12px; text-align: center; position: relative;">
              <!-- Title box on right side -->
              <div style="position: absolute; right: 12px; top: 12px; border: 1.5px solid black; font-size: 8px; text-align: left; background: white; width: 140px;">
                <table style="border-collapse: collapse; width: 100%;">
                  <tr><td style="border: 1px solid black; padding: 2px 4px;"><span style="display: inline-block; width: 8px; height: 8px; border: 1px solid black; margin-right: 4px; text-align: center; line-height: 7px; font-weight: bold; font-size: 8px; vertical-align: middle;">✓</span>Original For Recipient</td></tr>
                  <tr><td style="border: 1px solid black; padding: 2px 4px;"><span style="display: inline-block; width: 8px; height: 8px; border: 1px solid black; margin-right: 4px; vertical-align: middle;"></span>Duplicate For Recipient</td></tr>
                  <tr><td style="border: 1px solid black; padding: 2px 4px;"><span style="display: inline-block; width: 8px; height: 8px; border: 1px solid black; margin-right: 4px; vertical-align: middle;"></span>Triplicate For Supplier</td></tr>
                  <tr><td style="border: 1px solid black; padding: 2px 4px;"><span style="display: inline-block; width: 8px; height: 8px; border: 1px solid black; margin-right: 4px; vertical-align: middle;"></span>Extra Copy</td></tr>
                </table>
              </div>
              
              <div style="font-size: 26px; font-weight: bold; letter-spacing: 0.5px;">ACMA CETP CO-OP. SOCIETY LTD.</div>
              <div style="font-size: 11px; margin-top: 4px; font-weight: bold; letter-spacing: 0.5px;">REGD. NO. TNA/ULR/GNL/(0)/359/94-95 /1994</div>
              <div style="font-size: 11px; font-weight: bold; margin-top: 4px;">■ SHED NO. W-30, M.I.D.C., CHEMICAL ZONE, AMBERNATH (WEST) ■</div>
              <div style="font-size: 11px; margin-top: 4px;">Tel. No: ${settings.officialPhone} | Cell No. ${settings.officialMobile} | E-Mail : ${settings.officialEmail}</div>
            </td>
          </tr>
          
          <!-- TAX INVOICE Header -->
          <tr>
            <td colspan="5" style="border-bottom: 2px solid black; text-align: center; font-size: 18px; font-weight: bold; padding: 8px; letter-spacing: 2px;">
              TAX INVOICE
            </td>
          </tr>
          
          <!-- GSTIN / PAN / Invoice Details -->
          <tr>
            <td colspan="3" style="width: 55%; border-bottom: 2px solid black; border-right: 2px solid black; padding: 6px; vertical-align: top;">
              <table style="width: 100%;">
                <tr><td style="width: 100px; font-weight: bold; padding: 2px 0;">GSTIN No.</td><td>: ${settings.gstin || '27AAAAA4636P1ZH'}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">PAN No.</td><td>: ${settings.pan || 'AAAAA4636P'}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">Invoice No.</td><td>: <span style="font-size: 15px; font-weight: bold;">${invoiceData.invoiceNo}</span></td></tr>
              </table>
            </td>
            <td colspan="2" style="width: 45%; border-bottom: 2px solid black; padding: 6px; vertical-align: top;">
              <table style="width: 100%;">
                <tr><td style="width: 100px; font-weight: bold; padding: 2px 0;">State</td><td>: Maharashtra</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">State Code</td><td>: 27</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">Invoice Date</td><td>: <span style="font-weight: bold;">${formatDate(invoiceData.date)}</span></td></tr>
              </table>
            </td>
          </tr>
          
          <!-- Details of Receiver Header -->
          <tr>
            <td colspan="5" style="border-bottom: 2px solid black; background-color: #f5f5f5; font-weight: bold; padding: 6px; font-size: 13px;">
              Details of Receiver (Billed To)
            </td>
          </tr>
          
          <!-- Receiver Details -->
          <tr>
            <td colspan="3" style="border-bottom: 2px solid black; border-right: 2px solid black; padding: 6px; vertical-align: top; height: 85px;">
              <table style="width: 100%;">
                <tr><td style="width: 80px; font-weight: bold; vertical-align: top; padding: 2px 0;">Name</td><td style="vertical-align: top;">: <span style="font-weight: bold; font-size: 14px;">${client.name}</span></td></tr>
                <tr><td style="font-weight: bold; vertical-align: top; padding: 2px 0;">Address</td><td style="vertical-align: top; line-height: 1.4;">: ${client.address}</td></tr>
              </table>
            </td>
            <td colspan="2" style="border-bottom: 2px solid black; padding: 6px; vertical-align: top;">
              <table style="width: 100%;">
                <tr><td style="width: 100px; font-weight: bold; padding: 2px 0;">State</td><td>: ${client.state}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">State Code</td><td>: ${client.stateCode}</td></tr>
                <tr><td style="font-weight: bold; padding: 2px 0;">GSTIN No.</td><td>: <span style="font-weight: bold; font-family: monospace; font-size: 13px;">${client.gstin}</span></td></tr>
              </table>
            </td>
          </tr>
          
          <!-- Services Table Header -->
          <tr style="text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 11px;">
            <td style="border-bottom: 2px solid black; border-right: 1px solid black; padding: 8px; width: 45%;">Description of Services</td>
            <td style="border-bottom: 2px solid black; border-right: 1px solid black; padding: 8px; width: 12%;">SAC Code</td>
            <td style="border-bottom: 2px solid black; border-right: 1px solid black; padding: 8px; width: 15%;">WATER CONSUMPTION<br><span style="font-size: 9px;">[ M³ ]</span></td>
            <td style="border-bottom: 2px solid black; border-right: 1px solid black; padding: 8px; width: 13%;">RATE<br><span style="font-size: 9px;">[ Rs/M³ ]</span></td>
            <td style="border-bottom: 2px solid black; padding: 8px; width: 15%;">TAXABLE AMOUNT<br><span style="font-size: 9px;">[ Rs. ]</span></td>
          </tr>
          
          <!-- Service Rows -->
          ${renderServiceRows()}
          
          <!-- Bottom Layout -->
          <tr>
            <!-- Left Info Block -->
            <td colspan="3" style="border-top: 2px solid black; border-right: 2px solid black; padding: 10px; vertical-align: top; font-size: 12px; line-height: 1.6;">
              <div style="margin-bottom: 8px;">
                <span style="font-weight: bold;">Total Invoice Value (In Figure) Rs.</span>
                <span style="font-size: 14px; font-weight: bold; margin-left: 10px; font-family: monospace;">${formatRupees(invoiceData.totals.amountAfterTax)}</span>
              </div>
              
              <div style="margin-bottom: 8px;">
                <span style="font-weight: bold;">Total Invoice Value (In words) Rupees.</span>
                <span style="font-style: italic; font-weight: bold; margin-left: 5px;">${amountInWords}</span>
              </div>
              
              <div style="border-top: 1px solid #ccc; padding-top: 6px; margin-bottom: 8px;">
                <span style="font-weight: bold;">DPC :</span> If Paid after 
                <span style="font-weight: bold; text-decoration: underline; padding: 0 4px;">${formatDate(invoiceData.dpc.ifPaidAfterDate) || '__________'}</span> 
                Please Pay Rs. 
                <span style="font-weight: bold; text-decoration: underline; padding: 0 4px; font-family: monospace;">${formatRupees(invoiceData.dpc.pleasePayRs) || '__________'}</span>
              </div>
              
              <div style="border-top: 1px solid #ccc; padding-top: 6px;">
                <span style="font-weight: bold;">Previous Outstanding Amount Rs.</span>
                <span style="font-weight: bold; margin-left: 10px; font-family: monospace;">${formatRupees(invoiceData.totals.previousOutstanding)}</span>
              </div>
            </td>
            
            <!-- Right Computations Table -->
            <td colspan="2" style="border-top: 2px solid black; padding: 0; vertical-align: top;">
              <table style="width: 100%; border-collapse: collapse; margin: 0; border: none; font-size: 12px;">
                <tr>
                  <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 6px; font-weight: bold; width: 60%;">Total Amount Before Tax</td>
                  <td style="border-bottom: 1px solid black; padding: 6px; text-align: right; font-weight: bold; width: 40%; font-family: monospace;">${formatRupees(invoiceData.totals.amountBeforeTax)}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 6px;">Add : CGST @ ${settings.cgstPercentage}%</td>
                  <td style="border-bottom: 1px solid black; padding: 6px; text-align: right; font-family: monospace;">${formatRupees(invoiceData.totals.cgstAmount)}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 6px;">Add : SGST @ ${settings.sgstPercentage}%</td>
                  <td style="border-bottom: 1px solid black; padding: 6px; text-align: right; font-family: monospace;">${formatRupees(invoiceData.totals.sgstAmount)}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 6px; font-weight: bold;">Total Tax Amount (GST @ ${settings.cgstPercentage + settings.sgstPercentage}%)</td>
                  <td style="border-bottom: 1px solid black; padding: 6px; text-align: right; font-weight: bold; font-family: monospace;">${formatRupees(invoiceData.totals.totalTaxAmount)}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid black; border-right: 1px solid black; padding: 6px;">Round Off</td>
                  <td style="border-bottom: 1px solid black; padding: 6px; text-align: right; font-family: monospace;">${invoiceData.totals.roundOff !== 0 ? formatRupees(invoiceData.totals.roundOff) : '-'}</td>
                </tr>
                <tr>
                  <td style="border-right: 1px solid black; padding: 8px; font-weight: bold; font-size: 13px; background-color: #f5f5f5;">Total Amount After Tax</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 13px; background-color: #f5f5f5; font-family: monospace;">${formatRupees(invoiceData.totals.amountAfterTax)}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Bank Details & Signatures -->
          <tr>
            <td colspan="2" style="border-top: 2px solid black; border-right: 1px solid black; padding: 10px; font-size: 11px; vertical-align: top; width: 40%; line-height: 1.5;">
              <span style="font-weight: bold; font-size: 12px; display: block; margin-bottom: 4px;">Bank Details :</span>
              <span style="font-weight: bold; display: block; font-size: 12px;">AMBARNATH JAI-HIND CO-OP. BANK LTD.</span>
              Branch : Main Branch, Ambarnath (West)<br>
              Current Account No. : <span style="font-weight: bold; font-size: 12px;">${settings.bankAccountNo}</span><br>
              IFSC Code : <span style="font-weight: bold; font-size: 12px;">${settings.bankIfscCode}</span><br>
              MICR Code : <span style="font-weight: bold; font-size: 12px;">${settings.bankMicrCode}</span>
            </td>
            <td style="border-top: 2px solid black; border-right: 1px solid black; padding: 10px; text-align: center; vertical-align: bottom; width: 25%;">
              <div style="border-top: 1px solid black; width: 85%; margin: 0 auto 4px auto;"></div>
              <span style="font-size: 11px;">Receiver Signature<br>with Rubber Stamp</span>
            </td>
            <td colspan="2" style="border-top: 2px solid black; padding: 10px; text-align: center; vertical-align: top; position: relative; height: 110px; width: 35%;">
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
  `;
}
