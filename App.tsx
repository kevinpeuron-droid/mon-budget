import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, TrendingDown, History, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Transaction, BudgetState, DAILY_ALLOWANCE } from './types';
import { getTodayDateString, formatCurrency, formatDate, generateId } from './utils';

// Local Storage Key
const STORAGE_KEY = 'daily_budget_app_v1';

const App: React.FC = () => {
  // State initialization
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [dailyAdded, setDailyAdded] = useState<number>(0);

  // Load data on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        const today = getTodayDateString();
        
        if (storedData) {
          const parsed: BudgetState = JSON.parse(storedData);
          
          // Calculate days missed
          const lastDate = new Date(parsed.lastLoginDate);
          const currentDate = new Date(today);
          
          // Difference in time
          const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Determine if we need to add funds (if current date is strictly after last login)
          // Simple logic: If stored date is not today, we add for every day passed.
          // Note: If user opens app multiple times same day, lastLoginDate is already today, so diff is 0.
          
          let addedAmount = 0;
          
          // Check if the stored date is strictly before today
          if (parsed.lastLoginDate < today) {
             // Calculate how many days have passed. 
             // Example: Last login 2023-10-01. Today 2023-10-03.
             // We missed 10-02 and 10-03. That is 2 days. 
             // Let's rely on string comparison for simplicity or date math above.
             // The diffDays calculation above gives us the difference.
             
             // If today > lastLoginDate, we add allowance * diffDays
             // Actually, usually "Daily Budget" means you get money for TODAY as well if you haven't logged in.
             // Logic: For every day that passed where I didn't get allowance, add it.
             
             addedAmount = diffDays * DAILY_ALLOWANCE;
          }

          setBalance(parsed.balance + addedAmount);
          setTransactions(parsed.transactions || []);
          setDailyAdded(addedAmount);
          
          // Update storage immediately with new date and balance
          const newState: BudgetState = {
            balance: parsed.balance + addedAmount,
            transactions: parsed.transactions || [],
            lastLoginDate: today
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          
        } else {
          // First time user
          const initialState: BudgetState = {
            balance: DAILY_ALLOWANCE, // Start with one day allowance
            transactions: [],
            lastLoginDate: today
          };
          setBalance(initialState.balance);
          setTransactions([]);
          setDailyAdded(DAILY_ALLOWANCE);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
        }
      } catch (e) {
        console.error("Failed to load budget data", e);
        // Fallback
        setBalance(0);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Handle Expense Submission
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const expenseAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(expenseAmount) || expenseAmount <= 0) return;

    const newTransaction: Transaction = {
      id: generateId(),
      amount: expenseAmount,
      description: description || 'Dépense diverse',
      date: new Date().toISOString(),
      type: 'expense'
    };

    const newTransactions = [newTransaction, ...transactions];
    const newBalance = balance - expenseAmount;

    setBalance(newBalance);
    setTransactions(newTransactions);
    setAmount('');
    setDescription('');

    // Persist
    saveState(newBalance, newTransactions);
  };

  // Helper to save state
  const saveState = (newBalance: number, newTransactions: Transaction[]) => {
    const today = getTodayDateString();
    const state: BudgetState = {
      balance: newBalance,
      transactions: newTransactions,
      lastLoginDate: today
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  // Delete Transaction
  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const newTransactions = transactions.filter(t => t.id !== id);
    // Refund the balance if we delete an expense
    const newBalance = balance + tx.amount;

    setBalance(newBalance);
    setTransactions(newTransactions);
    saveState(newBalance, newTransactions);
  };

  // Reset App (Debug purpose mostly)
  const handleReset = () => {
    if (confirm("Voulez-vous vraiment réinitialiser toutes les données ?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Budget Daily
          </h1>
        </div>
        <p className="text-slate-400 text-sm">
          Gérez votre budget quotidien en toute simplicité.
        </p>
      </div>

      {/* Balance Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="text-center py-4">
          <p className="text-slate-400 mb-1 font-medium text-sm uppercase tracking-wider">Solde Actuel</p>
          <div className={`text-5xl font-bold tracking-tight mb-2 ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(balance)}
          </div>
          {dailyAdded > 0 && (
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
               +{formatCurrency(dailyAdded)} ajoutés aujourd'hui
             </span>
          )}
        </div>
      </Card>

      {/* Input Section */}
      <Card title="Nouvelle Dépense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <Input 
              label="Montant (€)" 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
            <Input 
              label="Description (Optionnel)" 
              type="text" 
              placeholder="Ex: Café, Transport..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" variant="destructive" fullWidth className="h-12 text-lg group">
            <TrendingDown className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Déduire du budget
          </Button>
        </form>
      </Card>

      {/* History Section */}
      <Card className="min-h-[200px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Historique
          </h3>
          <span className="text-xs text-slate-500">{transactions.length} transactions</span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Aucune transaction récente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="group flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-200">{tx.description}</span>
                  <span className="text-xs text-slate-500">{formatDate(tx.date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-destructive">
                    -{formatCurrency(tx.amount)}
                  </span>
                  <button 
                    onClick={() => deleteTransaction(tx.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Footer / Reset */}
      <div className="flex justify-center pt-4">
        <button 
          onClick={handleReset}
          className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Réinitialiser l'application
        </button>
      </div>
    </div>
  );
};

export default App;