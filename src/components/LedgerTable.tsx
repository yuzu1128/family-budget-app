import { Fragment, useCallback, useEffect, useState } from 'react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { apiClient, getErrorMessage } from '../lib/api-client';
import type { LedgerExpense } from '../lib/api-types';
import { useAuth } from '../contexts/AuthContext';

interface LedgerTableProps {
    householdId: string;
    lastUpdate: number;
    onUpdate: () => void;
}

export default function LedgerTable({ householdId, lastUpdate, onUpdate }: LedgerTableProps) {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<LedgerExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [previousBalance, setPreviousBalance] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
    const [inputExpense, setInputExpense] = useState('');
    const [inputFile, setInputFile] = useState<File | null>(null);
    const [inputLoading, setInputLoading] = useState(false);

    const monthKey = format(currentMonth, 'yyyy-MM');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { previousBalance: openingBalance, expenses: ledgerExpenses } = await apiClient.households.getLedger(householdId, monthKey);
            setPreviousBalance(openingBalance);
            setExpenses(ledgerExpenses);
        } catch (error) {
            console.error('Failed to fetch ledger:', error);
            setPreviousBalance(0);
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    }, [householdId, monthKey]);

    useEffect(() => {
        void fetchData();
    }, [fetchData, lastUpdate]);

    const handleAddFromRow = async () => {
        if (!user) return;

        if (!inputExpense) {
            alert('金額を入力してください');
            return;
        }

        const amount = Math.abs(Number.parseInt(inputExpense, 10));
        if (Number.isNaN(amount)) {
            alert('金額を入力してください');
            return;
        }

        setInputLoading(true);
        try {
            await apiClient.expenses.create(householdId, {
                amount,
                description: '',
                transactionDate: inputDate,
                receipt: inputFile,
            });

            setInputExpense('');
            setInputFile(null);
            await fetchData();
            onUpdate();
        } catch (error) {
            alert(getErrorMessage(error, '追加に失敗しました。'));
        } finally {
            setInputLoading(false);
        }
    };

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleRowClick = (expense: LedgerExpense) => {
        if (expandedRowId === expense.id) {
            setExpandedRowId(null);
            return;
        }

        setExpandedRowId(expense.id);
        setEditDescription(expense.description || '');
        setEditAmount(Math.abs(expense.amount).toString());
        setEditDate(expense.transactionDate.split('T')[0]);
        setEditFile(null);
    };

    const handleUpdate = async () => {
        if (!expandedRowId) return;
        setEditLoading(true);

        try {
            const originalRow = expenses.find((expense) => expense.id === expandedRowId);
            if (!originalRow) throw new Error('更新対象が見つかりません。');

            const inputAmount = Number.parseInt(editAmount, 10);
            if (Number.isNaN(inputAmount)) throw new Error('Invalid Amount');

            const finalAmount = originalRow.amount < 0
                ? -Math.abs(inputAmount)
                : Math.abs(inputAmount);

            await apiClient.expenses.update(expandedRowId, {
                description: editDescription,
                amount: finalAmount,
                transactionDate: editDate,
                receipt: editFile,
            });

            setExpandedRowId(null);
            onUpdate();
            await fetchData();
        } catch (error) {
            alert(getErrorMessage(error, '更新に失敗しました。'));
        } finally {
            setEditLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!expandedRowId || !window.confirm('この履歴を削除しますか？')) return;
        setEditLoading(true);

        try {
            await apiClient.expenses.delete(expandedRowId);
            setExpandedRowId(null);
            onUpdate();
            await fetchData();
        } catch (error) {
            alert(getErrorMessage(error, '削除に失敗しました。'));
        } finally {
            setEditLoading(false);
        }
    };

    let runningBalance = previousBalance;
    let totalExpense = 0;

    const rows = expenses.map((expense) => {
        const isIncome = expense.amount < 0;
        const absAmount = Math.abs(expense.amount);

        if (isIncome) {
            runningBalance += absAmount;
        } else {
            totalExpense += absAmount;
            runningBalance -= absAmount;
        }

        return {
            ...expense,
            isIncome,
            absAmount,
            currentBalance: runningBalance,
        };
    });

    if (loading) return <div className="py-10 text-center text-xs text-gray-400">Loading...</div>;

    return (
        <div className="bg-white shadow-sm border-t border-gray-100 mb-20">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between sticky top-0 z-20">
                <button onClick={handlePrevMonth} className="p-1 text-gray-600">
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <h3 className="text-base font-bold text-gray-800">
                    {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                </h3>
                <button onClick={handleNextMonth} className="p-1 text-gray-600">
                    <ChevronRight className="h-6 w-6" />
                </button>
            </div>

            <div className="w-full overflow-x-auto">
                <table className="w-full text-xs min-w-[350px]">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 border-b border-gray-300">
                        <tr>
                            <th className="py-2 px-2 text-center w-[120px]">日付</th>
                            <th className="py-2 px-2 text-right">支出</th>
                            <th className="py-2 px-2 text-right w-[100px] text-gray-400">残高</th>
                            <th className="py-2 px-2 text-center w-[50px] whitespace-nowrap">レシート</th>
                            <th className="py-2 px-2 w-[40px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-800">
                        <tr className="bg-indigo-50/50">
                            <td className="p-1">
                                <input
                                    type="date"
                                    value={inputDate}
                                    onChange={(e) => setInputDate(e.target.value)}
                                    className="w-full text-xs p-1 border border-gray-300 rounded text-center bg-white"
                                />
                            </td>
                            <td className="p-1">
                                <input
                                    type="number"
                                    value={inputExpense}
                                    onChange={(e) => setInputExpense(e.target.value)}
                                    placeholder="0"
                                    className="w-full text-xs p-1 border border-gray-300 rounded text-right bg-white text-red-700 font-bold"
                                    onKeyDown={(e) => e.key === 'Enter' && void handleAddFromRow()}
                                />
                            </td>
                            <td className="p-1 text-center text-gray-400">-</td>
                            <td className="p-1 text-center">
                                <label className={`
                                    block w-full h-8 border-2 border-dashed rounded cursor-pointer transition-colors flex items-center justify-center
                                    ${inputFile ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-300 hover:border-gray-400 text-gray-400'}
                                `}>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => setInputFile(e.target.files ? e.target.files[0] : null)}
                                    />
                                    {inputFile ? (
                                        <span className="text-[10px] truncate max-w-[40px] block" title={inputFile.name}>✓</span>
                                    ) : (
                                        <span className="text-sm pb-1">...</span>
                                    )}
                                </label>
                            </td>
                            <td className="p-1 text-center">
                                <button
                                    onClick={() => void handleAddFromRow()}
                                    disabled={inputLoading}
                                    className="w-full h-full bg-indigo-600 text-white rounded flex items-center justify-center p-1 shadow-sm active:bg-indigo-700 disabled:opacity-50 font-bold text-xs"
                                >
                                    追加
                                </button>
                            </td>
                        </tr>

                        {expenses.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-400">データがありません</td>
                            </tr>
                        )}

                        {rows.map((row) => (
                            <Fragment key={row.id}>
                                <tr
                                    onClick={() => handleRowClick(row)}
                                    className={`transition-colors cursor-pointer ${expandedRowId === row.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                                >
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {format(parseISO(row.transactionDate), 'yyyy/MM/dd')}
                                    </td>
                                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-bold ${row.isIncome ? 'text-green-600' : 'text-red-700'}`}>
                                        {row.isIncome ? '+' : ''}{row.absAmount.toLocaleString()}
                                    </td>
                                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-bold ${row.currentBalance < 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                                        {row.currentBalance.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                        {row.receiptUrl ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewImage(row.receiptUrl);
                                                }}
                                                className="focus:outline-none hover:opacity-75 transition-opacity"
                                            >
                                                <span className="text-lg">🧾</span>
                                            </button>
                                        ) : (
                                            <div className="w-6 h-6 mx-auto border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                                                <span className="text-gray-300 text-[10px]">+</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4"></td>
                                </tr>
                                {expandedRowId === row.id && (
                                    <tr className="bg-indigo-50">
                                        <td colSpan={5} className="px-4 pb-4 pt-0">
                                            <div className="bg-white rounded-lg p-4 shadow-inner border border-indigo-100 space-y-3 animation-slide-down">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">日付</label>
                                                        <input
                                                            type="date"
                                                            value={editDate}
                                                            onChange={(e) => setEditDate(e.target.value)}
                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">金額</label>
                                                        <input
                                                            type="number"
                                                            value={editAmount}
                                                            onChange={(e) => setEditAmount(e.target.value)}
                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">内容</label>
                                                    <input
                                                        type="text"
                                                        value={editDescription}
                                                        onChange={(e) => setEditDescription(e.target.value)}
                                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                                        placeholder="内容なし"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">レシート (変更する場合のみ選択)</label>
                                                    <input
                                                        type="file"
                                                        onChange={(e) => setEditFile(e.target.files ? e.target.files[0] : null)}
                                                        className="block w-full text-xs text-slate-500
                                                            file:mr-4 file:py-2 file:px-4
                                                            file:rounded-full file:border-0
                                                            file:text-xs file:font-semibold
                                                            file:bg-indigo-50 file:text-indigo-700
                                                            hover:file:bg-indigo-100
                                                        "
                                                        accept="image/*"
                                                    />
                                                </div>
                                                <div className="flex justify-between pt-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            void handleDelete();
                                                        }}
                                                        disabled={editLoading}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition-colors"
                                                    >
                                                        削除
                                                    </button>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedRowId(null);
                                                            }}
                                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200 transition-colors"
                                                        >
                                                            キャンセル
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleUpdate();
                                                            }}
                                                            disabled={editLoading}
                                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-colors"
                                                        >
                                                            保存
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}

                        <tr className="bg-gray-50 font-bold border-t-2 border-gray-300 text-[11px]">
                            <td className="py-2 px-2 text-center">計</td>
                            <td className="py-2 px-2 text-right text-red-700">{totalExpense.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-gray-900">{runningBalance.toLocaleString()}</td>
                            <td className="py-2 px-2"></td>
                            <td className="py-2 px-2"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {previewImage && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 text-white p-2 rounded-full bg-gray-800 bg-opacity-50 hover:bg-opacity-75"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={previewImage}
                        alt="Receipt"
                        className="max-w-full max-h-[90vh] object-contain rounded"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
