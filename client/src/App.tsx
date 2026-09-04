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

type Theme = 'light' | 'dark';

interface NavItem {
  permission: ModulePermission;
  label: string;
  icon: string;
  hidden?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { permission: 'master_data', label: 'Master Data Management', icon: '🧬' },
  { permission: 'transactions', label: 'Transactions', icon: '🔁' },
  { permission: 'boms', label: 'BOMs', icon: '🧪' },
  { permission: 'manufacturing', label: '10-Step Batch Execution', icon: '⚙️', hidden: true },
  { permission: 'ebpr', label: 'eBPR Records & Audit', icon: '📑', hidden: true },
  { permission: 'reports', label: 'Reports', icon: '📊' },
  { permission: 'user_management', label: 'User Management', icon: '👤' },
];

const firstVisiblePermission = (permissions: ModulePermission[]): ModulePermission =>
  NAV_ITEMS.find(item => !item.hidden && permissions.includes(item.permission))?.permission || 'reports';

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('amrita_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ModulePermission>('master_data');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('amrita_theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('amrita_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.getCurrentUser()
      .then((currentUser: AppUser) => {
        setUser(currentUser);
        setActiveTab(firstVisiblePermission(currentUser.permissions));
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
    setActiveTab(firstVisiblePermission(authenticatedUser.permissions));
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Session is cleared locally even if the server is unavailable.
    }
    localStorage.removeItem('amrita_access_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col gap-3 items-center justify-center text-sm">
        <img src="/favicon.ico" alt="Amrita" className="w-12 h-12 object-contain" />
        Checking secure session...
      </div>
    );
  }

  const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light');

  if (!user) return <LoginPage onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme} />;

  const visibleItems = NAV_ITEMS.filter(item => !item.hidden && user.permissions.includes(item.permission));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between shadow-md border-b border-slate-800 gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5 shrink-0">
          <img src="/favicon.ico" alt="Amrita Pharma" className="w-9 h-9 object-contain shrink-0" />
          <div>
            <h1 className="font-bold text-[13px] leading-none whitespace-nowrap">AMRITA PHARMA R&amp;D</h1>
            <span className="text-[9px] text-slate-400 uppercase font-semibold whitespace-nowrap">Tablet MES &amp; Batch Execution</span>
          </div>
        </div>

        <nav className="order-3 lg:order-none w-full lg:w-auto lg:flex-1 flex flex-wrap items-center justify-center gap-0.5 bg-slate-800 p-1 rounded-md border border-slate-700">
          {visibleItems.map(item => (
            <button
              key={item.permission}
              onClick={() => setActiveTab(item.permission)}
              className={`px-2 py-1.5 text-[11px] font-semibold rounded whitespace-nowrap transition ${
                activeTab === item.permission
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col items-end justify-center shrink-0 min-w-28 leading-tight">
          <div className="text-[11px] font-semibold max-w-40 truncate" title={user.full_name}>{user.full_name}</div>
          <div className="text-[9px] text-slate-400 mb-0.5">{user.role} · {user.username}</div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              className="w-7 h-6 flex items-center justify-center text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded"
            >
              {theme === 'light' ? '☾' : '☀'}
            </button>
            <button onClick={logout} title="Sign out" className="px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700 rounded">
              Sign out
            </button>
          </div>
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
