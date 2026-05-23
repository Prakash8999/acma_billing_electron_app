import React, { useState } from 'react';
import { MasterDirectory } from './components/MasterDirectory';
import { BillingEngine } from './components/BillingEngine';
import { SystemSettingsProvider } from './context/SystemSettingsContext';
import { Building2, Users } from 'lucide-react';

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'billing' | 'directory'>('billing');

  return (
    <SystemSettingsProvider>
      <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
        {/* Top App Header / Navigation */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-md flex items-center px-6 flex-shrink-0 z-10 shadow-sm relative">
          <div className="flex items-center gap-3 mr-8">
            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
              AC
            </div>
            <span className="font-semibold tracking-tight text-lg">Billing System</span>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'billing'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Billing Engine
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'directory'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              Master Directory
            </button>
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-gradient-to-br from-background via-muted/30 to-muted/80">
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Subtle background abstract shapes for the glassmorphism feel */}
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="relative z-10 h-full">
            {activeTab === 'billing' && <BillingEngine />}
            {activeTab === 'directory' && <MasterDirectory />}
          </div>
        </main>
      </div>
    </SystemSettingsProvider>
  );
}

export default App;
