import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/Card';
import { Input } from './ui/Input';

import { Button } from './ui/Button';
import { Client } from '../../../shared/types';
import { useSystemSettings } from '../context/SystemSettingsContext';
import {
  UserPlus, Save, Edit, Droplets, Settings, Landmark, Phone,
  Percent, Calendar, Archive, ArchiveRestore, FileSpreadsheet, AlertCircle, X
} from 'lucide-react';
import * as XLSX from 'xlsx';


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

  // ── Bulk Upload states ──
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadSummary, setShowUploadSummary] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    added: number;
    updated: number;
    failed: number;
    errors: { row: number; name: string; reason: string }[];
  } | null>(null);

  // ── Search & Pagination states ──
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) {
          throw new Error('Could not read file data');
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('Excel workbook has no sheets');
        }

        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (json.length === 0) {
          throw new Error('The spreadsheet is empty');
        }

        let addedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const errorsList: { row: number; name: string; reason: string }[] = [];

        // Sequentially save to avoid database lock issues in sqlite
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const rowNumber = i + 2; // Header is row 1, 0-indexed index i is row 2

          const rowKeys = Object.keys(row);
          const nameKey = rowKeys.find(k => {
            const uk = k.trim().toUpperCase();
            return uk === 'NAME OF THE MEMBERS INDUSTRIES' || uk === 'NAME OF THE MEMBERS INDUSTRIE' || uk === 'NAME' || uk === 'CLIENT NAME';
          });
          const addressKey = rowKeys.find(k => k.trim().toUpperCase() === 'ADDRESS');
          const gstKey = rowKeys.find(k => k.trim().toUpperCase() === 'GST' || k.trim().toUpperCase() === 'GSTIN');
          const stateKey = rowKeys.find(k => k.trim().toUpperCase() === 'STATE');
          const stateCodeKey = rowKeys.find(k => k.trim().toUpperCase() === 'STATECODE' || k.trim().toUpperCase() === 'STATE CODE');

          const nameVal = nameKey ? String(row[nameKey] || '').trim() : '';
          const addressVal = addressKey ? String(row[addressKey] || '').trim() : '';
          const gstinVal = gstKey ? String(row[gstKey] || '').trim() : '';
          const stateVal = stateKey ? String(row[stateKey] || '').trim() : '';
          const stateCodeVal = stateCodeKey ? String(row[stateCodeKey] || '').trim() : '';

          if (!nameVal) {
            failedCount++;
            errorsList.push({
              row: rowNumber,
              name: 'N/A',
              reason: 'Client Name is required'
            });
            continue;
          }

          if (!gstinVal) {
            failedCount++;
            errorsList.push({
              row: rowNumber,
              name: nameVal,
              reason: 'GSTIN is required'
            });
            continue;
          }

          if (gstinVal.length !== 15) {
            failedCount++;
            errorsList.push({
              row: rowNumber,
              name: nameVal,
              reason: `GSTIN must be exactly 15 characters (provided: ${gstinVal.length} characters)`
            });
            continue;
          }

          const state = stateVal || 'Maharashtra';
          const stateCode = stateCodeVal || '27';

          // Check if client with this gstin already exists in current list
          const existingClient = clients.find(
            c => c.gstin.trim().toUpperCase() === gstinVal.toUpperCase()
          );

          try {
            if (existingClient) {
              const updatedClient: Client = {
                ...existingClient,
                name: nameVal,
                address: addressVal,
                state: state,
                stateCode: stateCode,
              };

              if (window.billingAPI?.saveClient) {
                const res = await window.billingAPI.saveClient(updatedClient);
                if (res && res.success) {
                  updatedCount++;
                } else {
                  throw new Error('Database save returned success: false');
                }
              } else {
                setClients(prev => prev.map(c => c.id === existingClient.id ? updatedClient : c));
                updatedCount++;
              }
            } else {
              const newClient: Client = {
                id: crypto.randomUUID(),
                name: nameVal,
                address: addressVal,
                gstin: gstinVal,
                state: state,
                stateCode: stateCode,
                defaultRate: settings.defaultWaterRate,
                isActive: true
              };

              if (window.billingAPI?.saveClient) {
                const res = await window.billingAPI.saveClient(newClient);
                if (res && res.success) {
                  addedCount++;
                } else {
                  throw new Error('Database save returned success: false');
                }
              } else {
                setClients(prev => [...prev, newClient]);
                addedCount++;
              }
            }
          } catch (err: any) {
            failedCount++;
            errorsList.push({
              row: rowNumber,
              name: nameVal,
              reason: err.message || 'Failed to save to database'
            });
          }
        }

        setUploadSummary({
          total: json.length,
          added: addedCount,
          updated: updatedCount,
          failed: failedCount,
          errors: errorsList
        });
        setShowUploadSummary(true);
        loadClients();

      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Failed to parse Excel file');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading file');
      setIsUploading(false);
      e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, pageSize]);

  const filteredClients = clients.filter(c => {
    const statusMatch = (() => {
      if (filterStatus === 'Active') return c.isActive;
      if (filterStatus === 'Inactive') return !c.isActive;
      return true;
    })();

    const query = searchQuery.trim().toLowerCase();
    const searchMatch = !query || 
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.gstin && c.gstin.toLowerCase().includes(query));

    return statusMatch && searchMatch;
  });

  const totalClients = filteredClients.length;
  const totalPages = Math.ceil(totalClients / pageSize) || 1;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );


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
                    <div className="flex items-center gap-4">
                      <CardTitle className="text-sm">Master Directory</CardTitle>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search name or GSTIN..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1.5 h-8 w-64 rounded-md border border-input bg-background text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors focus:border-ring"
                        />
                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        {isUploading ? 'Uploading...' : 'Bulk Upload (.xlsx)'}
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          className="hidden"
                          onChange={handleBulkUpload}
                          disabled={isUploading}
                        />
                      </label>
                      <select
                        className="text-xs bg-muted border border-border rounded-md px-2 py-1 outline-none w-fit font-medium"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                      >
                        <option value="Active">Active Clients</option>
                        <option value="Inactive">Inactive Clients</option>
                        <option value="All">All Clients</option>
                      </select>
                    </div>
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
                        {paginatedClients.map((client) => (
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
                        {paginatedClients.length === 0 && (
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
                <CardFooter className="flex items-center justify-between border-t border-border px-5 py-4 bg-muted/20 text-xs text-muted-foreground select-none">
                  <div className="flex items-center gap-5">
                    <div>
                      {totalClients > 0 ? (
                        <>
                          Showing <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                          <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, totalClients)}</span> of{' '}
                          <span className="font-semibold text-foreground">{totalClients}</span> clients
                        </>
                      ) : (
                        'No clients to show'
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-border pl-5">
                      <span>Rows per page:</span>
                      <select
                        className="bg-background border border-border rounded px-1.5 py-0.5 outline-none font-medium text-foreground text-[11px] cursor-pointer"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                        }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                      disabled={!hasPreviousPage}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => {
                        const isNearCurrent = Math.abs(pg - currentPage) <= 1;
                        const isFirstOrLast = pg === 1 || pg === totalPages;
                        
                        if (!isNearCurrent && !isFirstOrLast) {
                          if (pg === 2 && currentPage > 3) {
                            return <span key={pg} className="px-1 py-0.5 text-[10px]">...</span>;
                          }
                          if (pg === totalPages - 1 && currentPage < totalPages - 2) {
                            return <span key={pg} className="px-1 py-0.5 text-[10px]">...</span>;
                          }
                          return null;
                        }

                        return (
                          <button
                            key={pg}
                            onClick={() => setCurrentPage(pg)}
                            className={`h-7 w-7 rounded-md text-[11px] font-semibold transition-all ${
                              currentPage === pg
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {pg}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                      disabled={!hasNextPage}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      Next
                    </Button>
                  </div>
                </CardFooter>
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

        {showUploadSummary && uploadSummary && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-200">
              <CardHeader className="relative flex flex-row items-center border-b bg-muted/50 pb-4 pl-16">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadSummary(false)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-full border border-border bg-background text-muted-foreground hover:bg-destructive hover:text-destructive-foreground shadow-sm transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
                <CardTitle className="text-base font-semibold">Bulk Upload Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Rows</div>
                    <div className="text-xl font-bold text-foreground mt-1">{uploadSummary.total}</div>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                    <div className="text-[10px] font-semibold uppercase tracking-wider">Added</div>
                    <div className="text-xl font-bold mt-1">{uploadSummary.added}</div>
                  </div>
                  <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20">
                    <div className="text-[10px] font-semibold uppercase tracking-wider">Updated</div>
                    <div className="text-xl font-bold mt-1">{uploadSummary.updated}</div>
                  </div>
                  <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg border border-red-500/20">
                    <div className="text-[10px] font-semibold uppercase tracking-wider">Failed</div>
                    <div className="text-xl font-bold mt-1">{uploadSummary.failed}</div>
                  </div>
                </div>

                {uploadSummary.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      Detailed Warnings & Errors ({uploadSummary.errors.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border text-xs bg-muted/20">
                      {uploadSummary.errors.map((err, idx) => (
                        <div key={idx} className="p-2.5 flex items-start gap-2 hover:bg-muted/30 transition-colors">
                          <span className="font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-[10px] font-bold text-muted-foreground">
                            Row {err.row}
                          </span>
                          <div className="flex-1">
                            <span className="font-semibold text-foreground mr-1.5">{err.name}:</span>
                            <span className="text-muted-foreground">{err.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadSummary.failed === 0 && (
                  <div className="p-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/25 font-medium">
                    🎉 All rows processed successfully with no errors or skipped items.
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t bg-muted/30 flex justify-end">
                <Button onClick={() => setShowUploadSummary(false)} className="px-5">
                  Close Summary
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

