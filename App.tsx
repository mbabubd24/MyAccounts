
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  User, 
  Lock, 
  ChevronRight,
  LogOut,
  Menu,
  X,
  CreditCard,
  Briefcase,
  // Added missing icons to fix errors on lines 400, 436 and 826
  BarChart3,
  Settings
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell
} from 'recharts';
import { AuthState, AppState, LedgerEntry, EntryType } from './types';
import { storage } from './services/storage';
import { NAV_ITEMS, CURRENCY, AUTHOR } from './constants';
import StatCard from './components/StatCard';

// Helper for generating IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // Authentication State
  const [auth, setAuth] = useState<AuthState>(storage.getAuth());
  const [loginForm, setLoginForm] = useState({ userId: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // App Data State
  const [appState, setAppState] = useState<AppState>(storage.getState());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form States
  const [newEntry, setNewEntry] = useState<Partial<LedgerEntry>>({
    type: 'ledger',
    workName: '',
    category: '',
    capital: 0,
    salesPrice: 0,
    amount: 0,
    note: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Report Filters
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    startDate: '',
    endDate: ''
  });

  // Save state to local storage when it changes
  useEffect(() => {
    storage.setState(appState);
  }, [appState]);

  useEffect(() => {
    storage.setAuth(auth);
  }, [auth]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.userId === auth.userId && loginForm.password === auth.password) {
      setAuth(prev => ({ ...prev, isAuthenticated: true }));
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Please try again.');
    }
  };

  const handleLogout = () => {
    setAuth(prev => ({ ...prev, isAuthenticated: false }));
  };

  const handleUpdateAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app we'd validate here
    alert('Credentials updated successfully!');
  };

  // Entry Management
  const addEntry = () => {
    const entry: LedgerEntry = {
      id: generateId(),
      date: newEntry.date || new Date().toISOString().split('T')[0],
      type: newEntry.type as EntryType,
      workName: newEntry.workName || '',
      category: newEntry.category || '',
      capital: Number(newEntry.capital) || 0,
      salesPrice: Number(newEntry.salesPrice) || 0,
      amount: Number(newEntry.amount) || 0,
      profit: (newEntry.type === 'ledger') 
        ? (Number(newEntry.salesPrice) || 0) - (Number(newEntry.capital) || 0)
        : (newEntry.type === 'income' ? (Number(newEntry.amount) || 0) : -(Number(newEntry.amount) || 0)),
      note: newEntry.note || ''
    };

    setAppState(prev => {
      const newWorkNames = entry.workName && !prev.suggestions.workNames.includes(entry.workName)
        ? [...prev.suggestions.workNames, entry.workName]
        : prev.suggestions.workNames;
      
      const newCategories = entry.category && !prev.suggestions.categories.includes(entry.category)
        ? [...prev.suggestions.categories, entry.category]
        : prev.suggestions.categories;

      return {
        ...prev,
        entries: [entry, ...prev.entries],
        suggestions: {
          workNames: newWorkNames,
          categories: newCategories
        }
      };
    });

    // Reset form but keep date
    setNewEntry({
      type: 'ledger',
      workName: '',
      category: '',
      capital: 0,
      salesPrice: 0,
      amount: 0,
      note: '',
      date: newEntry.date
    });
  };

  const deleteEntry = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setAppState(prev => ({
        ...prev,
        entries: prev.entries.filter(e => e.id !== id)
      }));
    }
  };

  // Analytics Calculations
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    const todayEntries = appState.entries.filter(e => e.date === today);
    const monthEntries = appState.entries.filter(e => e.date.startsWith(thisMonth));

    const totalIncome = appState.entries.reduce((sum, e) => e.type === 'income' ? sum + e.amount : sum, 0);
    const totalExpenses = appState.entries.reduce((sum, e) => e.type === 'expense' ? sum + e.amount : sum, 0);
    const totalSales = appState.entries.reduce((sum, e) => e.type === 'ledger' ? sum + e.salesPrice : sum, 0);
    const totalCapital = appState.entries.reduce((sum, e) => e.type === 'ledger' ? sum + e.capital : sum, 0);
    
    const todayIncome = todayEntries.reduce((sum, e) => (e.type === 'income' || e.type === 'ledger') ? sum + (e.type === 'income' ? e.amount : e.salesPrice) : sum, 0);
    const monthProfit = monthEntries.reduce((sum, e) => sum + e.profit, 0);
    const totalProfit = appState.entries.reduce((sum, e) => sum + e.profit, 0);

    // Chart Data Preparation
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const chartData = last7Days.map(date => {
      const dayEntries = appState.entries.filter(e => e.date === date);
      const profit = dayEntries.reduce((sum, e) => sum + e.profit, 0);
      return {
        name: date.split('-').slice(1).join('/'),
        profit: profit
      };
    });

    return {
      todayIncome,
      monthProfit,
      totalExpenses,
      totalProfit,
      chartData
    };
  }, [appState.entries]);

  // Filtered Entries for Reports
  const filteredEntries = useMemo(() => {
    return appState.entries.filter(e => {
      const matchesSearch = e.workName.toLowerCase().includes(filters.search.toLowerCase()) || 
                           e.category.toLowerCase().includes(filters.search.toLowerCase()) ||
                           e.note.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType = filters.type === 'all' || e.type === filters.type;
      const matchesStart = !filters.startDate || e.date >= filters.startDate;
      const matchesEnd = !filters.endDate || e.date <= filters.endDate;
      
      return matchesSearch && matchesType && matchesStart && matchesEnd;
    });
  }, [appState.entries, filters]);

  // --- RENDERING ---

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 rounded-3xl border border-emerald-500/30 shadow-2xl emerald-glow">
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/40">
                  <CreditCard size={28} />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">MyAccounts</h1>
              <p className="text-emerald-400 text-sm font-medium mt-1">Premium Financial Ledger</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <User size={14} /> ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Admin ID"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                  value={loginForm.userId}
                  onChange={e => setLoginForm(prev => ({ ...prev, userId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <Lock size={14} /> Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter Password"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                  value={loginForm.password}
                  onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              {loginError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-3 rounded-xl text-center">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Login to Dashboard <ChevronRight size={18} />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-slate-500 text-xs">Initial Credentials: ID: admin | Pass: 1234</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <CreditCard size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">MyAccounts</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium ${
                  activeTab === item.id 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-8 border-t border-slate-800 space-y-4">
            <div className="px-4 py-4 glass-card rounded-2xl border border-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Author Details</p>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-400">{AUTHOR.name}</p>
                <p className="text-xs text-slate-400">{AUTHOR.mobile}</p>
                <p className="text-xs text-slate-400 truncate">{AUTHOR.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors font-medium"
            >
              <LogOut size={20} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-white capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-white">Hello, {auth.userId}</span>
                <span className="text-xs text-slate-500">Premium Account</span>
             </div>
             <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center text-emerald-500">
                <User size={20} />
             </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 flex-1 space-y-10 max-w-7xl mx-auto w-full">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Today's Income" 
                  value={`${analytics.todayIncome} ${CURRENCY}`}
                  icon={<TrendingUp className="text-emerald-500" />}
                  colorClass="bg-emerald-500"
                />
                <StatCard 
                  title="This Month's Profit" 
                  value={`${analytics.monthProfit} ${CURRENCY}`}
                  icon={<DollarSign className="text-indigo-500" />}
                  colorClass="bg-indigo-500"
                />
                <StatCard 
                  title="Total Expenses" 
                  value={`${analytics.totalExpenses} ${CURRENCY}`}
                  icon={<TrendingDown className="text-rose-500" />}
                  colorClass="bg-rose-500"
                />
                <StatCard 
                  title="All-Time Net Profit" 
                  value={`${analytics.totalProfit} ${CURRENCY}`}
                  icon={<BarChart3 className="text-amber-500" />}
                  colorClass="bg-amber-500"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card rounded-3xl p-8 border border-slate-800">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <TrendingUp size={20} className="text-emerald-500" /> 
                    Profit Trend (Last 7 Days)
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.chartData}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                          itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-8 border border-slate-800">
                   <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <BarChart3 size={20} className="text-emerald-500" />
                    Quick Entry
                  </h3>
                  <div className="space-y-5">
                    <button 
                      onClick={() => setActiveTab('ledger')}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 shadow-lg shadow-emerald-500/20"
                    >
                      <Plus size={20} /> Add Ledger Entry
                    </button>
                    <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                      <p className="text-sm font-medium text-slate-400 mb-4">Account Summary</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                           <span className="text-slate-500 text-xs">Total Records</span>
                           <span className="text-white font-bold">{appState.entries.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-slate-500 text-xs">Categories</span>
                           <span className="text-white font-bold">{appState.suggestions.categories.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-slate-500 text-xs">Work Items</span>
                           <span className="text-white font-bold">{appState.suggestions.workNames.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass-card rounded-3xl p-8 border border-slate-800">
                 <h3 className="text-lg font-bold mb-6">Recent Transactions</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="text-slate-500 text-sm border-b border-slate-800">
                             <th className="pb-4 font-medium">Date</th>
                             <th className="pb-4 font-medium">Type</th>
                             <th className="pb-4 font-medium">Description</th>
                             <th className="pb-4 font-medium">Amount</th>
                             <th className="pb-4 font-medium">Profit</th>
                          </tr>
                       </thead>
                       <tbody className="text-sm">
                          {appState.entries.slice(0, 5).map(entry => (
                             <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                <td className="py-4 text-slate-400">{entry.date}</td>
                                <td className="py-4 capitalize">
                                   <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                      entry.type === 'ledger' ? 'bg-indigo-500/10 text-indigo-400' :
                                      entry.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' :
                                      'bg-rose-500/10 text-rose-400'
                                   }`}>
                                      {entry.type}
                                   </span>
                                </td>
                                <td className="py-4 font-medium text-slate-200">
                                   {entry.workName || entry.category || 'N/A'}
                                </td>
                                <td className="py-4 font-mono">
                                   {entry.type === 'ledger' ? entry.salesPrice : entry.amount} {CURRENCY}
                                </td>
                                <td className={`py-4 font-bold ${entry.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                   {entry.profit} {CURRENCY}
                                </td>
                             </tr>
                          ))}
                          {appState.entries.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-slate-500 italic">No transactions yet. Start by adding one in the Ledger tab!</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}

          {/* Ledger Tab */}
          {activeTab === 'ledger' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="glass-card rounded-3xl p-8 border border-slate-800">
                   <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                      <Plus className="text-emerald-500" /> New Transaction Entry
                   </h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-400">Entry Type</label>
                         <select 
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            value={newEntry.type}
                            onChange={e => setNewEntry(prev => ({ ...prev, type: e.target.value as EntryType }))}
                         >
                            <option value="ledger">Daily Ledger (Business)</option>
                            <option value="income">General Income</option>
                            <option value="expense">General Expense</option>
                         </select>
                      </div>

                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-400">Date</label>
                         <input 
                            type="date"
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50"
                            value={newEntry.date}
                            onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                         />
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                         <label className="text-sm font-semibold text-slate-400">
                            {newEntry.type === 'ledger' ? 'Work Name' : 'Category'}
                         </label>
                         <div className="relative group">
                           <input 
                              type="text"
                              list="suggestions-list"
                              placeholder={newEntry.type === 'ledger' ? "Enter service or project name" : "Enter category (e.g. Rent, Bill)"}
                              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                              value={newEntry.type === 'ledger' ? newEntry.workName : newEntry.category}
                              onChange={e => setNewEntry(prev => newEntry.type === 'ledger' ? ({ ...prev, workName: e.target.value }) : ({ ...prev, category: e.target.value }))}
                           />
                           <datalist id="suggestions-list">
                             {(newEntry.type === 'ledger' ? appState.suggestions.workNames : appState.suggestions.categories).map(s => (
                               <option key={s} value={s} />
                             ))}
                           </datalist>
                         </div>
                      </div>

                      {newEntry.type === 'ledger' ? (
                         <>
                            <div className="space-y-2">
                               <label className="text-sm font-semibold text-slate-400">Capital (Muldhon)</label>
                               <input 
                                  type="number"
                                  placeholder="0.00"
                                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50"
                                  value={newEntry.capital || ''}
                                  onChange={e => setNewEntry(prev => ({ ...prev, capital: Number(e.target.value) }))}
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-sm font-semibold text-slate-400">Sales Price (Mullyo)</label>
                               <input 
                                  type="number"
                                  placeholder="0.00"
                                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50"
                                  value={newEntry.salesPrice || ''}
                                  onChange={e => setNewEntry(prev => ({ ...prev, salesPrice: Number(e.target.value) }))}
                               />
                            </div>
                         </>
                      ) : (
                         <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-400">Amount</label>
                            <input 
                               type="number"
                               placeholder="0.00"
                               className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50"
                               value={newEntry.amount || ''}
                               onChange={e => setNewEntry(prev => ({ ...prev, amount: Number(e.target.value) }))}
                            />
                         </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                         <label className="text-sm font-semibold text-slate-400">Notes (Optional)</label>
                         <input 
                            type="text"
                            placeholder="Add extra details..."
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50"
                            value={newEntry.note}
                            onChange={e => setNewEntry(prev => ({ ...prev, note: e.target.value }))}
                         />
                      </div>
                   </div>

                   <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-900/40 rounded-2xl border border-slate-800/50">
                      <div>
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Live Profit Calculation</p>
                         <h4 className={`text-2xl font-black ${
                            newEntry.type === 'ledger' 
                              ? ((Number(newEntry.salesPrice) - Number(newEntry.capital)) >= 0 ? 'text-emerald-400' : 'text-rose-400')
                              : (newEntry.type === 'income' ? 'text-emerald-400' : 'text-rose-400')
                         }`}>
                            {newEntry.type === 'ledger' 
                              ? (Number(newEntry.salesPrice) - Number(newEntry.capital)).toFixed(2)
                              : (newEntry.type === 'income' ? Number(newEntry.amount).toFixed(2) : `-${Number(newEntry.amount).toFixed(2)}`)} {CURRENCY}
                         </h4>
                      </div>
                      <button 
                         onClick={addEntry}
                         className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-12 py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                      >
                         <Plus size={20} /> Save Entry
                      </button>
                   </div>
                </div>

                <div className="glass-card rounded-3xl p-8 border border-slate-800">
                   <h3 className="text-xl font-bold mb-6">Entries Recorded Today</h3>
                   <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="text-slate-500 text-sm border-b border-slate-800">
                             <th className="pb-4 font-medium">Type</th>
                             <th className="pb-4 font-medium">Work / Category</th>
                             <th className="pb-4 font-medium">Values</th>
                             <th className="pb-4 font-medium text-right">Profit</th>
                             <th className="pb-4 font-medium text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="text-sm">
                          {appState.entries.filter(e => e.date === new Date().toISOString().split('T')[0]).map(entry => (
                             <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                                <td className="py-4">
                                   <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                                      entry.type === 'ledger' ? 'bg-indigo-500/10 text-indigo-400' :
                                      entry.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' :
                                      'bg-rose-500/10 text-rose-400'
                                   }`}>
                                      {entry.type}
                                   </span>
                                </td>
                                <td className="py-4">
                                   <p className="font-bold text-slate-200">{entry.workName || entry.category}</p>
                                   <p className="text-xs text-slate-500 truncate max-w-[150px]">{entry.note}</p>
                                </td>
                                <td className="py-4 font-mono text-slate-400">
                                   {entry.type === 'ledger' 
                                      ? <span>C: {entry.capital} | S: {entry.salesPrice}</span>
                                      : <span>Amt: {entry.amount}</span>}
                                </td>
                                <td className={`py-4 font-bold text-right ${entry.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                   {entry.profit} {CURRENCY}
                                </td>
                                <td className="py-4 text-right">
                                   <button 
                                      onClick={() => deleteEntry(entry.id)}
                                      className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                                   >
                                      <Trash2 size={16} />
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                </div>
             </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="glass-card rounded-3xl p-8 border border-slate-800">
                   <div className="flex flex-col md:flex-row gap-6 mb-10">
                      <div className="flex-1 relative">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                         <input 
                            type="text"
                            placeholder="Search by Work, Category or Note..."
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            value={filters.search}
                            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                         />
                      </div>
                      <div className="flex flex-wrap gap-4">
                         <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-slate-500 uppercase">Type:</span>
                           <select 
                              className="bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 focus:ring-2 focus:ring-emerald-500/50"
                              value={filters.type}
                              onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                           >
                              <option value="all">All Records</option>
                              <option value="ledger">Business Only</option>
                              <option value="income">Income Only</option>
                              <option value="expense">Expense Only</option>
                           </select>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">From:</span>
                            <input 
                               type="date"
                               className="bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3"
                               value={filters.startDate}
                               onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">To:</span>
                            <input 
                               type="date"
                               className="bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3"
                               value={filters.endDate}
                               onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                         </div>
                      </div>
                   </div>

                   <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-left">
                         <thead className="bg-slate-900/50">
                            <tr className="text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-800">
                               <th className="px-6 py-4">Date</th>
                               <th className="px-6 py-4">Category</th>
                               <th className="px-6 py-4">Work / Note</th>
                               <th className="px-6 py-4">Money Movement</th>
                               <th className="px-6 py-4 text-right">Profit</th>
                            </tr>
                         </thead>
                         <tbody className="text-sm">
                            {filteredEntries.map(entry => (
                               <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                                  <td className="px-6 py-4 text-slate-400 font-mono">{entry.date}</td>
                                  <td className="px-6 py-4">
                                     <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                        entry.type === 'ledger' ? 'text-indigo-400' :
                                        entry.type === 'income' ? 'text-emerald-400' :
                                        'text-rose-400'
                                     }`}>
                                        {entry.type}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="font-bold text-slate-200">{entry.workName || entry.category}</div>
                                     <div className="text-xs text-slate-500">{entry.note}</div>
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs">
                                     {entry.type === 'ledger' ? (
                                        <div className="space-y-1">
                                           <div className="flex items-center gap-1"><TrendingDown size={10} className="text-rose-400" /> <span className="text-slate-500">Cap:</span> {entry.capital}</div>
                                           <div className="flex items-center gap-1"><TrendingUp size={10} className="text-emerald-400" /> <span className="text-slate-500">Sale:</span> {entry.salesPrice}</div>
                                        </div>
                                     ) : (
                                        <div className="flex items-center gap-1">
                                           <DollarSign size={10} className={entry.type === 'income' ? 'text-emerald-400' : 'text-rose-400'} />
                                           <span className="text-slate-500">Amount:</span> {entry.amount}
                                        </div>
                                     )}
                                  </td>
                                  <td className={`px-6 py-4 text-right font-black ${entry.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                     {entry.profit} {CURRENCY}
                                  </td>
                               </tr>
                            ))}
                            {filteredEntries.length === 0 && (
                               <tr>
                                  <td colSpan={5} className="py-20 text-center text-slate-500">
                                     No records found matching your filters.
                                  </td>
                               </tr>
                            )}
                         </tbody>
                         <tfoot className="bg-slate-900/80">
                            <tr className="font-bold text-white border-t border-slate-800">
                               <td colSpan={4} className="px-6 py-6 text-right uppercase tracking-wider text-slate-500 text-xs">Total Highlighted Profit:</td>
                               <td className="px-6 py-6 text-right text-xl text-emerald-400">
                                  {filteredEntries.reduce((sum, e) => sum + e.profit, 0).toFixed(2)} {CURRENCY}
                                </td>
                            </tr>
                         </tfoot>
                      </table>
                   </div>
                </div>

                <div className="flex justify-end">
                   <button 
                      onClick={() => storage.exportData(appState)}
                      className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                   >
                      <Download size={18} /> Export Full Report (JSON)
                   </button>
                </div>
             </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="glass-card rounded-3xl p-10 border border-slate-800">
                   <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                      <Settings className="text-emerald-500" /> Account Settings
                   </h3>
                   <form onSubmit={handleUpdateAuth} className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-400">Update Admin ID</label>
                         <input 
                            type="text"
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50"
                            value={auth.userId}
                            onChange={e => setAuth(prev => ({ ...prev, userId: e.target.value }))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-400">Update Password</label>
                         <input 
                            type="password"
                            placeholder="Enter new password"
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500/50"
                            value={auth.password}
                            onChange={e => setAuth(prev => ({ ...prev, password: e.target.value }))}
                         />
                      </div>
                      <button 
                         type="submit"
                         className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                      >
                         Save Changes
                      </button>
                   </form>
                </div>

                <div className="glass-card rounded-3xl p-10 border border-slate-800">
                   <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                      <Briefcase className="text-emerald-500" /> Data Management
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={() => storage.exportData(appState)}
                        className="flex items-center justify-center gap-3 p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all text-slate-200"
                      >
                        <Download size={20} /> Backup All Data
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('CRITICAL: This will delete ALL your records. Are you sure?')) {
                            setAppState({
                              entries: [],
                              suggestions: { workNames: [], categories: [] }
                            });
                            alert('All data has been cleared.');
                          }
                        }}
                        className="flex items-center justify-center gap-3 p-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl transition-all text-rose-500"
                      >
                        <Trash2 size={20} /> Clear All Records
                      </button>
                   </div>
                </div>

                <footer className="text-center pt-10 text-slate-500 space-y-2">
                   <p className="text-sm font-bold uppercase tracking-widest">MyAccounts Ledger v1.0</p>
                   <p className="text-xs">Developed by <span className="text-emerald-500">{AUTHOR.name}</span></p>
                   <p className="text-xs">{AUTHOR.email} • {AUTHOR.mobile}</p>
                </footer>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
