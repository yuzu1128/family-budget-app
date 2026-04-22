import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { apiClient, getErrorMessage } from '../lib/api-client';
import type { LedgerExpense } from '../lib/api-types';

interface ExpenseListProps {
    householdId: string;
    lastUpdate: number;
}

export default function ExpenseList({ householdId, lastUpdate }: ExpenseListProps) {
    const [expenses, setExpenses] = useState<LedgerExpense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchExpenses() {
            setLoading(true);
            try {
                const { expenses: recentExpenses } = await apiClient.households.getRecentExpenses(householdId);
                setExpenses(recentExpenses);
            } catch (error) {
                console.error('Error loading expenses:', error);
                setExpenses([]);
            } finally {
                setLoading(false);
            }
        }

        void fetchExpenses();
    }, [householdId, lastUpdate]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('この支出を削除してもよろしいですか？')) return;

        try {
            await apiClient.expenses.delete(id);
            setExpenses(expenses.filter((expense) => expense.id !== id));
        } catch (error) {
            alert(getErrorMessage(error, '支出の削除に失敗しました。'));
        }
    };

    if (loading) return <div className="text-gray-400 text-center py-12">履歴を読み込み中...</div>;

    const groupedExpenses = expenses.reduce<Record<string, LedgerExpense[]>>((groups, expense) => {
        const date = expense.transactionDate.split('T')[0];
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(expense);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 px-1">最近の支出</h3>
            {sortedDates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                    <p className="text-gray-500">まだ支出記録がありません。</p>
                </div>
            ) : (
                sortedDates.map((date) => (
                    <div key={date}>
                        <h4 className="text-sm font-semibold text-gray-500 mb-3 ml-1 uppercase tracking-wider">
                            {format(new Date(date), 'yyyy年M月d日')}
                        </h4>
                        <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100 mix-blend-multiply">
                            <ul className="divide-y divide-gray-50">
                                {groupedExpenses[date].map((expense) => (
                                    <li key={expense.id} className="hover:bg-gray-50 transition-colors duration-150 group">
                                        <div className="px-6 py-5 flex items-center justify-between">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-base font-semibold text-gray-900 truncate mb-0.5">{expense.description || '内容なし'}</p>
                                                <div className="flex items-center text-xs text-gray-500 space-x-2">
                                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                                        {expense.creatorName}
                                                    </span>
                                                    {expense.receiptUrl && (
                                                        <a
                                                            href={expense.receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                            レシート
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <span className="text-lg font-bold text-gray-800">
                                                    {expense.amount < 0 ? '+' : '-'}¥{Math.abs(expense.amount).toLocaleString()}
                                                </span>
                                                <button
                                                    onClick={() => void handleDelete(expense.id)}
                                                    className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                    title="Delete expense"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
