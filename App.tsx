import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingDown, History, Trash2, RefreshCw, Calculator, Calendar, PiggyBank } from 'lucide-react';
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
  const [billingDay, setBillingDay] = useState<number>(1);
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
          
          // Legacy support (if billingStartDay doesn't exist yet)
          const savedBillingDay = parsed.billingStartDay || 1;
          setBillingDay(savedBillingDay);

          // Calculate days missed logic
          // IMPORTANT: Use exact date strings for comparison to avoid timezone issues
          const lastDateStr = parsed.lastLoginDate;
          const lastDate = new Date(lastDateStr);
          const currentDate = new Date(today);
          
          let addedAmount = 0;
          
          // Only add money if the stored date is strictly before today
          if (lastDateStr < today) {
             const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             addedAmount = diffDays * DAILY_ALLOWANCE;
          }

          const newBalance = parsed.balance + addedAmount;
          setBalance(newBalance);
          setTransactions(parsed.transactions || []);
          setDailyAdded(addedAmount);
          
          // Update storage immediately
          const newState: BudgetState = {
            balance: newBalance,
            transactions: parsed.transactions || [],
            lastLoginDate: today,
            billingStartDay: savedBillingDay
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          
        } else {
          // First time user
          const initialState: BudgetState = {
            balance: DAILY_ALLOWANCE,
            transactions: [],
            lastLoginDate: today,
            billingStartDay: 1
          };
          setBalance(initialState.balance);
          setTransactions([]);
          setDailyAdded(DAILY_ALLOWANCE);
          setBillingDay(1);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
        }
      } catch (e) {
        console.error("Failed to load budget data", e);
        setBalance(0);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Calculate Statistics based on Billing Cycle
  const stats = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    let startDate: Date;

    // Determine start date of current cycle
    if (currentDay >= billingDay) {
      // We are in the current month's cycle
      startDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
    } else {
      // We are in the previous month's cycle
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
    }
    
    // Normalize time to midnight
    startDate.setHours(0, 0, 0, 0);

    // Calculate days passed in this cycle (including today)
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 

    // Filter transactions for this period
    const periodTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && t.type === 'expense';
    });

    const totalSpent = periodTransactions.reduce((acc, t) => acc + t.amount, 0);
    const average = totalSpent / daysPassed;
    
    // Theoretical income for this period (e.g. 10 days * 30€ = 300€)
    const theoreticalIncome = daysPassed * DAILY_ALLOWANCE;
    
    // Balance for the period (Income - Expense)
    const periodBalance = theoreticalIncome - totalSpent;

    return {
      average,
      totalSpent,
      startDate,
      daysPassed,
      theoreticalIncome,
      periodBalance
    };
  }, [transactions, billingDay]);

  // Handle Billing Day Change
  const handleBillingDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = parseInt(e.target.value);
    setBillingDay(newDay);
    saveState(balance, transactions, newDay);
  };

  // Helper to save state
  const saveState = (newBalance: number, newTransactions: Transaction[], newBillingDay: number) => {
    const today = getTodayDateString();
    const state: BudgetState = {
      balance: newBalance,
      transactions: newTransactions,
      lastLoginDate: today,
      billingStartDay: newBillingDay
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

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

    saveState(newBalance, newTransactions, billingDay);
  };

  // Delete Transaction
  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const newTransactions = transactions.filter(t => t.id !== id);
    const newBalance = balance + tx.amount;

    setBalance(newBalance);
    setTransactions(newTransactions);
    saveState(newBalance, newTransactions, billingDay);
  };

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
    <div className="space-y-6 pb-8">
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
          Chaque jour, +30€ sont ajoutés automatiquement.
        </p>
      </div>

      {/* Balance Card - Main Solde */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="text-center py-4">
          <p className="text-slate-400 mb-1 font-medium text-sm uppercase tracking-wider">Solde Global</p>
          <div className={`text-5xl font-bold tracking-tight mb-2 ${balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(balance)}
          </div>
          {dailyAdded > 0 && (
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
               +{formatCurrency(dailyAdded)} reçus aujourd'hui
             </span>
          )}
        </div>
      </Card>

      {/* Statistics & Cycle Config */}
      <Card title="Bilan de la Période">
        <div className="flex flex-col gap-4">
          
          <div className="grid grid-cols-2 gap-3">
             {/* Period Balance */}
             <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Solde Période</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-lg font-bold ${stats.periodBalance >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                      {stats.periodBalance > 0 ? '+' : ''}{formatCurrency(stats.periodBalance)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  Budget: {formatCurrency(stats.theoreticalIncome)}
                </div>
             </div>

             {/* Total Spent */}
             <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/50 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Dépensé</span>
                  <span className="text-lg font-bold text-slate-200">{formatCurrency(stats.totalSpent)}</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-500">
                  Moyenne: {formatCurrency(stats.average)}/j
                </div>
             </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
             <span>Du {stats.startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ce jour</span>
             <span>{stats.daysPassed} jours écoulés</span>
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/50">
             <label className="text-xs font-medium text-slate-400 flex items-center gap-2">
               <Calendar className="w-3 h-3" />
               Jour de renouvellement du cycle
             </label>
             <select 
               value={billingDay}
               onChange={handleBillingDayChange}
               className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer hover:bg-slate-900"
               style={{ backgroundImage: 'none' }} 
             >
                {[...Array(28)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Le {i + 1} du mois</option>
                ))}
                <option value={29}>Le 29 du mois</option>
                <option value={30}>Le 30 du mois</option>
                <option value={31}>Le 31 du mois</option>
             </select>
          </div>
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
            Déduire
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