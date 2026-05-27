import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Client } from '../../../shared/types';
import { useSystemSettings } from '../context/SystemSettingsContext';
import {
  UserPlus, Save, Edit, Droplets, Settings, Landmark, Phone,
  Percent, Calendar, Archive, ArchiveRestore
} from 'lucide-react';

export function MasterDirectory() {
  const { settings, updateSettings } = useSystemSettings();

  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState<Partial<Client>>({
    state: 'Maharashtra',
    stateCode: '27',
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'Active' | 'Inactive' | 'All'>('Active');

  // ── Error and Success message states ──
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // ── Local copy of settings for the form (edit-then-save pattern) ──
  const [localSettings, setLocalSettings] = useState(settings);
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // ── Sub-tab navigation ──
  const [activePanel, setActivePanel] = useState<'clients' | 'config'>('clients');

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
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      setSuccessMsg(null);

      if (formData.gstin && formData.gstin.length !== 15) {
        setErrorMsg('GSTIN must be exactly 15 characters.');
        return;
      }

      const newClient: Client = {
        id: formData.id || crypto.randomUUID(),
        name: formData.name || '',
        address: formData.address || '',
        gstin: formData.gstin || '',
        state: formData.state || 'Maharashtra',
        stateCode: formData.stateCode || '27',
        defaultRate: localSettings.defaultWaterRate,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      };

      if (window.billingAPI?.saveClient) {
        const result = await window.billingAPI.saveClient(newClient);
        if (result.success) {
          setSuccessMsg(formData.id ? '✅ Client updated successfully!' : '✅ Client saved successfully!');
          setFormData({ state: 'Maharashtra', stateCode: '27' });
          loadClients();
        } else {
          setErrorMsg('Failed to save client.');
        }
      } else {
        // Mock mode
        setClients((prev) => {
          const exists = prev.findIndex((c) => c.id === newClient.id);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = newClient;
            return updated;
          }
          return [...prev, newClient];
        });
        setFormData({ state: 'Maharashtra', stateCode: '27' });
        setSuccessMsg('✅ Client saved (Mock Mode)');
      }
    } catch (error: any) {
      console.error('Failed to save client:', error);
      setErrorMsg(error.message || 'Failed to save client.');
    }
  };

  const handleEdit = (client: Client) => {
    setFormData(client);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleToggleStatus = async (client: Client) => {
    try {
      const newStatus = !client.isActive;
      if (window.billingAPI?.toggleClientStatus) {
        await window.billingAPI.toggleClientStatus(client.id, newStatus);
        loadClients();
      } else {
        setClients(clients.map(c => c.id === client.id ? { ...c, isActive: newStatus } : c));
      }
    } catch (error) {
      console.error('Failed to toggle client status:', error);
    }
  };

  // ── Settings form handlers ──
  const handleSettingsChange = (field: string, value: string | number) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleEditSettings = async () => {
    if (isEditingSettings) {
      try {
        await updateSettings(localSettings);
        setSettingsMsg('✅ Global settings updated successfully');
        setTimeout(() => setSettingsMsg(null), 3000);
        setIsEditingSettings(false);
      } catch (error: any) {
        setSettingsMsg(`❌ Error: ${error.message || 'Failed to update settings'}`);
      }
    } else {
      setIsEditingSettings(true);
      setSettingsMsg(null);
    }
  };

  const totalGst = (localSettings.cgstPercentage || 0) + (localSettings.sgstPercentage || 0);

  const filteredClients = clients.filter(c => {
    if (filterStatus === 'Active') return c.isActive;
    if (filterStatus === 'Inactive') return !c.isActive;
    return true;
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto p-6 space-y-5">

        {/* ── Top Banner with Rate + Sub-tab Toggle ── */}
        

        {/* ── Sub-Tab Navigation ── */}
        <div className="flex gap-2">
          <Button
            variant={activePanel === 'clients' ? 'primary' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setActivePanel('clients')}
          >
            <UserPlus className="w-4 h-4" />
            Client Directory
          </Button>
          <Button
            variant={activePanel === 'config' ? 'primary' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setActivePanel('config')}
          >
            <Settings className="w-4 h-4" />
            System & Society Configurations
          </Button>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* ══ PANEL 1: CLIENT DIRECTORY             ══ */}
        {/* ═══════════════════════════════════════════ */}
        {activePanel === 'clients' && (
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
                    {errorMsg && (
                      <div className="p-3 text-xs bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 font-medium">
                        {errorMsg}
                      </div>
                    )}
                    {successMsg && (
                      <div className="p-3 text-xs bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800 font-medium">
                        {successMsg}
                      </div>
                    )}

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
                        className="flex w-full rounded-md border border-input bg-transparent px-4 py-2 pt-5 text-sm shadow-sm placeholder:text-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
                        placeholder="Factory/Billing Address"
                        value={formData.address || ''}
                        onChange={handleInputChange}
                        required
                      />
                      <label className="absolute left-4 top-1 text-[10px] text-muted-foreground pointer-events-none transition-all duration-200">
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
                        onClick={() => {
                          setFormData({ state: 'Maharashtra', stateCode: '27' });
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
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
                  <div className="flex flex-row items-center justify-between w-full">
                    <CardTitle className="text-sm">Master Directory</CardTitle>
                    <select
                      className="text-xs bg-muted border border-border rounded-md px-2 py-1 outline-none w-fit"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                    >
                      <option value="Active">Active Clients</option>
                      <option value="Inactive">Inactive Clients</option>
                      <option value="All">All Clients</option>
                    </select>
                  </div>
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
                        {filteredClients.map((client) => (
                          <tr
                            key={client.id}
                            className={`hover:bg-muted/30 transition-colors ${!client.isActive ? 'opacity-50' : ''}`}
                          >
                            <td className="px-5 py-3 font-medium whitespace-nowrap">
                              {client.name} {!client.isActive && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-red-500 border border-red-500/30 px-1.5 py-0.5 rounded">Inactive</span>}
                            </td>
                            <td
                              className="px-5 py-3 text-muted-foreground max-w-[200px] truncate"
                              title={client.address}
                            >
                              {client.address}
                            </td>
                            <td className="px-5 py-3 font-mono text-xs">{client.gstin}</td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              {client.state}{' '}
                              <span className="text-muted-foreground">({client.stateCode})</span>
                            </td>
                            <td className="px-5 py-3 text-center whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(client)}
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(client)}
                                title={client.isActive ? "Deactivate Client" : "Restore Client"}
                              >
                                {client.isActive ? <Archive className="w-4 h-4 text-red-500" /> : <ArchiveRestore className="w-4 h-4 text-emerald-500" />}
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {filteredClients.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-5 py-12 text-center text-muted-foreground"
                            >
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
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ══ PANEL 2: SYSTEM & SOCIETY CONFIGS      ══ */}
        {/* ═══════════════════════════════════════════ */}
        {activePanel === 'config' && (
          <div className="grid grid-cols-12 gap-5">

            {/* ── Section 1: Tax Slabs & Classification ── */}
            <div className="col-span-4">
              





              <Card className="mb-5">
                <CardContent className="p-5 pt-4">
                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
                    <Droplets className="w-4 h-4" />
                    Water Consumption Configuration
                  </div>

                  <div className="space-y-3">
                    <Input
                      label="Default Water Rate (₹ / M³)"
                      type="number"
                      step="0.01"
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={localSettings.defaultWaterRate ?? ''}
                      onChange={(e) =>
                        handleSettingsChange('defaultWaterRate', parseFloat(e.target.value) || 0)
                      }
                      disabled={!isEditingSettings}
                    />
                  </div>
                </CardContent>
              </Card>









              
              <Card>
                <CardContent className="p-5 pt-4">
                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
                    <Percent className="w-4 h-4" />
                    Tax Slabs & Classification
                  </div>

                  <div className="space-y-3">
                    <Input
                      label="Default SAC Code"
                      value={localSettings.defaultSacCode}
                      onChange={(e) => handleSettingsChange('defaultSacCode', e.target.value)}
                      disabled={!isEditingSettings}
                    />
                    <Input
                      label="CGST Percentage (%)"
                      type="number"
                      step="0.1"
                      value={localSettings.cgstPercentage ?? ''}
                      onChange={(e) =>
                        handleSettingsChange('cgstPercentage', parseFloat(e.target.value) || 0)
                      }
                      disabled={!isEditingSettings}
                    />
                    <Input
                      label="SGST Percentage (%)"
                      type="number"
                      step="0.1"
                      value={localSettings.sgstPercentage ?? ''}
                      onChange={(e) =>
                        handleSettingsChange('sgstPercentage', parseFloat(e.target.value) || 0)
                      }
                      disabled={!isEditingSettings}
                    />

                    {/* Read-only GST badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Total GST: {totalGst.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Section 2: Active Billing Period ── */}
            <div className="col-span-4">
              <Card>
                <CardContent className="p-5 pt-4">
                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Active Billing Period
                  </div>

                  <div className="space-y-3">
                    <Input
                      label="Financial Year Prefix"
                      value={localSettings.financialYearPrefix}
                      onChange={(e) =>
                        handleSettingsChange('financialYearPrefix', e.target.value)
                      }
                      disabled={!isEditingSettings}
                    />
                    <div className="text-xs text-muted-foreground mt-2 p-3 bg-muted/30 rounded-md border border-muted">
                      <span className="font-medium text-foreground">Preview:</span> Invoice No. will appear as{' '}
                      <span className="font-mono font-semibold text-foreground">
                        {localSettings.financialYearPrefix}001
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-5">
                {settingsMsg && (
                  <div className={`p-3 mb-3 text-xs rounded-md border font-medium ${
                    settingsMsg.startsWith('❌') 
                      ? 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' 
                      : 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {settingsMsg}
                  </div>
                )}
                <Button
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                  onClick={handleToggleEditSettings}
                >
                  {isEditingSettings ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  {isEditingSettings ? 'Save Global Settings' : 'Edit Global Settings'}
                </Button>
              </div>

            </div>

            {/* ── Section 3: Society Profile & Bank Identity ── */}
            <div className="col-span-4 space-y-5">
              <Card>
                <CardContent className="p-5 pt-4">
                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    Society Contact Info
                  </div>

                  <div className="space-y-3">
                    <Input
                      label="Official Phone Line"
                      value={localSettings.officialPhone}
                      onChange={(e) => handleSettingsChange('officialPhone', e.target.value)}
                      disabled={!isEditingSettings}
                    />
                    <Input
                      label="Official Mobile Line"
                      value={localSettings.officialMobile}
                      onChange={(e) => handleSettingsChange('officialMobile', e.target.value)}
                      disabled={!isEditingSettings}
                    />
                    <Input
                      label="Official Email"
                      type="email"
                      value={localSettings.officialEmail}
                      onChange={(e) => handleSettingsChange('officialEmail', e.target.value)}
                      disabled={!isEditingSettings}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 pt-4">
                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground">
                    <Landmark className="w-4 h-4" />
                    Bank Identity
                  </div>

                  <div className="space-y-3">
                    <Input
                      label="Bank Account Number"
                      value={localSettings.bankAccountNo}
                      onChange={(e) => handleSettingsChange('bankAccountNo', e.target.value)}
                      disabled={!isEditingSettings}
                    />
                    <Input
                      label="Bank IFSC Code"
                      value={localSettings.bankIfscCode}
                      onChange={(e) => handleSettingsChange('bankIfscCode', e.target.value)}
                      disabled={!isEditingSettings}
                    />
                    <Input
                      label="Bank MICR Code"
                      value={localSettings.bankMicrCode}
                      onChange={(e) => handleSettingsChange('bankMicrCode', e.target.value)}
                      disabled={!isEditingSettings}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
