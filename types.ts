
export type EntryType = 'ledger' | 'expense' | 'income';

export interface LedgerEntry {
  id: string;
  date: string;
  type: EntryType;
  workName: string;
  category: string;
  capital: number;
  salesPrice: number;
  amount: number; // for simple income/expense
  profit: number;
  note: string;
}

export interface AuthState {
  userId: string;
  password: string;
  isAuthenticated: boolean;
}

export interface AppState {
  entries: LedgerEntry[];
  suggestions: {
    workNames: string[];
    categories: string[];
  };
}
