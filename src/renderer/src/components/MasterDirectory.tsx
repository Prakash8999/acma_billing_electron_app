import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Client } from '../types';
import { UserPlus, Save, Edit, Settings, Droplets } from 'lucide-react';

export function MasterDirectory() {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState<Partial<Client>>({
    state: 'Maharashtra',
    stateCode: '27',
  });

  // Global rate — separate from per-client data
  const [globalRate, setGlobalRate] = useState<number>(0);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      if (window.billingAPI?.fetchClients) {
        const data = await window.billingAPI.fetchClients();
        setClients(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (window.billingAPI?.saveClient) {
        // Validate GSTIN
        if (formData.gstin && formData.gstin.length !== 15) {
          alert('GSTIN must be exactly 15 characters.');
          return;
        }

        const newClient: Client = {
          id: formData.id || crypto.randomUUID(),
          name: formData.name || '',
          address: formData.address || '',
          gstin: formData.gstin || '',
          state: formData.state || 'Maharashtra',
          stateCode: formData.stateCode || '27',
          defaultRate: globalRate,
        };
        const result = await window.billingAPI.saveClient(newClient);
        if (result.success) {
          setFormData({ state: 'Maharashtra', stateCode: '27' });
          loadClients();
        }
      }
    } catch (error) {
      console.error('Failed to save client:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setFormData(client);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 space-y-5">

        {/* ── Global Rate Setting ── */}
        <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">Default Water Consumption Rate</div>
                <div className="text-xs text-slate-400">Applied universally to all clients during invoice generation</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
                <span className="text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  className="bg-transparent text-white text-lg font-bold w-24 outline-none text-right tabular-nums placeholder:text-slate-500"
                  value={globalRate || ''}
                  onChange={(e) => setGlobalRate(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <span className="text-slate-400 text-sm">/ M³</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-1.5"
                onClick={() => {
                  // Save global rate — in real app this would go through IPC
                  console.log('Global rate saved:', globalRate);
                }}
              >
                <Save className="w-3.5 h-3.5" />
                Save Rate
              </Button>
            </div>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-12 gap-5">

          {/* Client Form (4 cols) */}
          <div className="col-span-4">
            <Card className="sticky top-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserPlus className="w-4 h-4 text-primary" />
                  {formData.id ? 'Edit Client' : 'Add New Client'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="flex flex-col gap-3">
                  <Input
                    label="Client Name"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    required
                  />

                  <div className="relative mt-2">
                    <textarea
                      name="address"
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 pt-5 text-sm shadow-sm placeholder:text-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
                      placeholder="Factory/Billing Address"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      required
                    />
                    <label className="absolute left-3 top-1 text-xs text-muted-foreground pointer-events-none transition-all duration-200">
                      Factory/Billing Address
                    </label>
                  </div>

                  <Input
                    label="GSTIN No. (15 chars)"
                    name="gstin"
                    value={formData.gstin || ''}
                    onChange={handleInputChange}
                    maxLength={15}
                    required
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Input
                        label="State"
                        name="state"
                        value={formData.state || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <Input
                      label="State Code"
                      name="stateCode"
                      value={formData.stateCode || ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <Button type="submit" className="mt-2 gap-2 w-full">
                    <Save className="w-4 h-4" />
                    {formData.id ? 'Update Client' : 'Save Client'}
                  </Button>

                  {formData.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setFormData({ state: 'Maharashtra', stateCode: '27' })}
                    >
                      Cancel editing
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Client Table (8 cols) */}
          <div className="col-span-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Master Directory</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[calc(100vh-280px)]">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 backdrop-blur-md">
                      <tr>
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">Address</th>
                        <th className="px-5 py-3 font-medium">GSTIN No.</th>
                        <th className="px-5 py-3 font-medium">State</th>
                        <th className="px-5 py-3 font-medium text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {clients.map((client) => (
                        <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 font-medium whitespace-nowrap">{client.name}</td>
                          <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate" title={client.address}>
                            {client.address}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs">{client.gstin}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {client.state} <span className="text-muted-foreground">({client.stateCode})</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(client)} title="Edit">
                              <Edit className="w-4 h-4 text-primary" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {clients.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                            No clients found. Add a client to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
