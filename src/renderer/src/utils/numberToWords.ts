export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Only';
  if (isNaN(num)) return '';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numStr = num.toFixed(2);
  const parts = numStr.split('.');
  const wholePart = parseInt(parts[0], 10);
  const fractionPart = parseInt(parts[1], 10);

  const convertWhole = (n: number): string => {
    if ((n = n.toString().replace(/^0+/, '') as unknown as number) === 0) return ''; // Wait, n is string inside
    const str = n.toString();
    if (str.length > 9) return 'overflow';
    
    // Convert to Indian Numbering System
    let result = '';
    
    // We will do a simple implementation for Indian system (Crore, Lakh, Thousand)
    const cr = Math.floor(n / 10000000);
    const lk = Math.floor((n % 10000000) / 100000);
    const th = Math.floor((n % 100000) / 1000);
    const hn = Math.floor((n % 1000) / 100);
    const rem = n % 100;

    if (cr) {
      result += (cr < 20 ? a[cr] : b[Math.floor(cr / 10)] + (cr % 10 ? ' ' + a[cr % 10] : '')) + 'Crore ';
    }
    if (lk) {
      result += (lk < 20 ? a[lk] : b[Math.floor(lk / 10)] + (lk % 10 ? ' ' + a[lk % 10] : '')) + 'Lakh ';
    }
    if (th) {
      result += (th < 20 ? a[th] : b[Math.floor(th / 10)] + (th % 10 ? ' ' + a[th % 10] : '')) + 'Thousand ';
    }
    if (hn) {
      result += a[hn] + 'Hundred ';
    }
    if (rem) {
      if (result) result += 'and ';
      result += (rem < 20 ? a[rem] : b[Math.floor(rem / 10)] + (rem % 10 ? ' ' + a[rem % 10] : ' '));
    }
    return result;
  };

  let words = convertWhole(wholePart);
  
  if (fractionPart > 0) {
    words = words.trim() + ' and ' + convertWhole(fractionPart).trim() + ' Paise';
  }

  return words.trim() + ' Only';
}
