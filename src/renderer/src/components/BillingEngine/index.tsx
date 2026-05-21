import { useState } from 'react';
import { CreateInvoice } from './CreateInvoice';
import { InvoiceHistory } from './InvoiceHistory';
import { Button } from '../ui/Button';

export function BillingEngine() {
  const [activeSubView, setActiveSubView] = useState<'create' | 'history'>('create');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex gap-2 p-4 border-b border-border bg-card/50 backdrop-blur-md">
        <Button
          variant={activeSubView === 'create' ? 'primary' : 'ghost'}
          onClick={() => setActiveSubView('create')}
        >
          Create Invoice
        </Button>
        <Button
          variant={activeSubView === 'history' ? 'primary' : 'ghost'}
          onClick={() => setActiveSubView('history')}
        >
          Invoice History & Receipt Records
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        {activeSubView === 'create' && <CreateInvoice />}
        {activeSubView === 'history' && <InvoiceHistory />}
      </div>
    </div>
  );
}
