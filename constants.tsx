
import React from 'react';
import { LayoutDashboard, ReceiptText, BarChart3, Settings, LogOut, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const CURRENCY = 'BDT টাকা';

export const AUTHOR = {
  name: 'ATNBD',
  mobile: '+8801723466664',
  email: 'sricbd2@gmail.com'
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'ledger', label: 'Daily Ledger', icon: <ReceiptText size={20} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];
