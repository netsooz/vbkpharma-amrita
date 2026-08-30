import { useEffect, useState } from 'react';
import { BatchExecutionWizard } from './pages/BatchExecutionWizard';
import { BatchReportDashboard } from './pages/BatchReportDashboard';
import { MasterDataDashboard } from './pages/MasterDataDashboard';
import { TransactionsDashboard } from './pages/TransactionsDashboard';
import { BOMDashboard } from './pages/BOMDashboard';
import { ReportsDashboard } from './pages/ReportsDashboard';
import { LoginPage } from './pages/LoginPage';
import { UserManagementDashboard } from './pages/UserManagementDashboard';
import type { AppUser, ModulePermission } from './types/auth';
import { api } from './services/api';

interface NavItem {
  permission: ModulePermission;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { permission: 'master_data', label: 'Master Data Management', icon: '🧬' },
  { permission: 'transactions', label: 'Transactions', icon: '🔁' },
  { permission: 'boms', label: 'BOMs', icon: '🧪' },
  { permission: 'manufacturing', label: '10-Step Batch Execution', icon: '⚙️' },
  { permission: 'ebpr', label: 'eBPR Records & Audit', icon: '📑' },
  { permission: 'reports', label: 'Reports', icon: '📊' },
  { permission: 'user_management', label: 'User Management', icon: '👤' },
];

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ModulePermission>('master_data');

  useEffect(() => {
    const token = localStorage.getItem('amrita_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.getCurrentUser()
      .then((currentUser: AppUser) => {
        setUser(currentUser);
        setActiveTab(currentUser.permissions[0] || 'reports');
      })
      .catch(() => localStorage.removeItem('amrita_access_token'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const expire = () => {
      setUser(null);
      setLoading(false);
    };
    globalThis.addEventListener('amrita-auth-expired', expire);
    return () => globalThis.removeEventListener('amrita-auth-expired', expire);
  }, []);

  const handleLogin = (authenticatedUser: AppUser) => {
    setUser(authenticatedUser);
    setActiveTab(authenticatedUser.permissions[0] || 'reports');
  };

  const logout = () => {
    localStorage.removeItem('amrita_access_token');
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-sm">Checking secure session...</div>;
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const visibleItems = NAV_ITEMS.filter(item => user.permissions.includes(item.permission));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shadow-md border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-bold">A</div>
          <div>
            <h1 className="font-bold text-sm leading-none">AMRITA PHARMA R&amp;D</h1>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Tablet MES &amp; Batch Execution</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-slate-800 p-1 rounded-md border border-slate-700 overflow-x-auto">
          {visibleItems.map(item => (
            <button
              key={item.permission}
              onClick={() => setActiveTab(item.permission)}
              className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap transition ${
                activeTab === item.permission
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden lg:block">
            <div className="text-xs font-semibold">{user.full_name}</div>
            <div className="text-[10px] text-slate-400">{user.role} · {user.username}</div>
          </div>
          <button onClick={logout} title="Sign out" className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded">
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1">
        {activeTab === 'master_data' && <MasterDataDashboard />}
        {activeTab === 'transactions' && <TransactionsDashboard />}
        {activeTab === 'boms' && <BOMDashboard />}
        {activeTab === 'manufacturing' && <BatchExecutionWizard />}
        {activeTab === 'ebpr' && <BatchReportDashboard />}
        {activeTab === 'reports' && <ReportsDashboard />}
        {activeTab === 'user_management' && <UserManagementDashboard currentUser={user} />}
      </main>
    </div>
  );
}

export default App;
