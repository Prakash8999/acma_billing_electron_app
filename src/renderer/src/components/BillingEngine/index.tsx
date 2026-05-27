import { useState } from 'react';
import { CreateInvoice } from './CreateInvoice';
import { InvoiceHistory } from './InvoiceHistory';
import { Button } from '../ui/Button';
import { Invoice } from '../../../../shared/types';

export function BillingEngine() {
  const [activeSubView, setActiveSubView] = useState<'create' | 'history'>('create');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const handleCreateNew = () => {
    setEditingInvoice(null);
    setActiveSubView('create');
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setActiveSubView('create');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex gap-2 p-4 border-b border-border bg-card/50 backdrop-blur-md">
        <Button
          variant={activeSubView === 'create' ? 'primary' : 'ghost'}
          onClick={handleCreateNew}
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
        {activeSubView === 'create' && <CreateInvoice initialInvoice={editingInvoice} />}
        {activeSubView === 'history' && <InvoiceHistory onViewInvoice={handleViewInvoice} />}
      </div>
    </div>
  );
}
