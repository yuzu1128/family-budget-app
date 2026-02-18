import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { endOfMonth } from 'date-fns';

interface DashboardSummaryProps {
    householdId: string;
    lastUpdate: number;
    onBalanceClick?: () => void;
}

export default function DashboardSummary({ householdId, lastUpdate, onBalanceClick }: DashboardSummaryProps) {
    const [totalSpent, setTotalSpent] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSummary() {
            setLoading(true);
            const now = new Date();
            const lastDay = endOfMonth(now).toISOString();

            // Fetch ALL transactions for this month
            const { data: expenses, error: expenseError } = await supabase
                .from('expenses')
                .select('amount')
                .eq('household_id', householdId)
                // .gte('transaction_date', firstDay) // REMOVED: Fetch all history for cumulative balance
                .lte('transaction_date', lastDay);

            if (expenseError) console.error(expenseError);

            let income = 0;
            let expense = 0;

            if (expenses) {
                expenses.forEach(e => {
                    if (e.amount < 0) {
                        income += Math.abs(e.amount); // Convert neg to pos for summing
                    } else {
                        expense += e.amount;
                    }
                });
            }

            setTotalIncome(income);
            setTotalSpent(expense);
            setLoading(false);
        }

        fetchSummary();
    }, [householdId, lastUpdate]);

    if (loading) return <div>集計を読み込み中...</div>;

    const remaining = totalIncome - totalSpent;

    return (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <div className="flex flex-col items-center">
                {/* Main Balance Limit */}
                <div
                    className="text-center cursor-pointer hover:scale-105 transition-transform"
                    onClick={onBalanceClick}
                >
                    <p className="text-sm text-gray-500 font-medium mb-1">今月の残高</p>
                    <h2 className={`text-5xl font-extrabold ${remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        ¥{remaining.toLocaleString()}
                    </h2>
                    <p className="text-xs text-gray-400 mt-2">タップして残高を設定</p>
                </div>
            </div>
        </div>
    );
}
