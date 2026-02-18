import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Expense {
    id: string;
    amount: number;
    description: string;
    transaction_date: string;
    receipt_url?: string;
    receipt_path?: string;
    created_at?: string;
    profiles: {
        full_name: string;
    };
}

interface LedgerTableProps {
    householdId: string;
    lastUpdate: number;
    onUpdate: () => void;
}

export default function LedgerTable({ householdId, lastUpdate, onUpdate }: LedgerTableProps) {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [previousBalance, setPreviousBalance] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Inline Editing State
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editFile, setEditFile] = useState<File | null>(null);
    const [editLoading, setEditLoading] = useState(false);

    // Inline Input State
    const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
    const [inputExpense, setInputExpense] = useState('');
    const [inputFile, setInputFile] = useState<File | null>(null);
    const [inputLoading, setInputLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        // Use local date strings `yyyy-MM-dd` to avoid UTC shifts
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        // Calculate end of month - use the first day of NEXT month for exclusive comparison roughly?
        // Or just matching endOfMonth string 
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

        // 1. Get Previous Balance (Sum of all transactions BEFORE this month start date)
        const { data: prevData, error: prevError } = await supabase
            .from('expenses')
            .select('amount')
            .eq('household_id', householdId)
            .lt('transaction_date', start);

        let prevBal = 0;
        if (!prevError && prevData) {
            prevData.forEach(p => {
                prevBal -= p.amount;
            });
        }
        setPreviousBalance(prevBal);

        // 2. Get Current Month Transactions
        const { data: expenseData, error } = await supabase
            .from('expenses')
            .select(`
                id,
                amount,
                description,
                transaction_date,
                receipt_url,
                receipt_path,
                created_at,
                profiles (full_name)
            `)
            .eq('household_id', householdId)
            .gte('transaction_date', start)
            .lte('transaction_date', end)
            .order('transaction_date', { ascending: true })
            .order('created_at', { ascending: true });

        if (!error) {
            // @ts-expect-error Supabase types mismatch with local interface
            setExpenses(expenseData || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [householdId, lastUpdate, currentMonth]);

    const handleAddFromRow = async () => {
        if (!user) return;

        let amount = 0;

        if (inputExpense) {
            amount = Math.abs(parseInt(inputExpense));
        } else {
            alert('金額を入力してください');
            return;
        }

        setInputLoading(true);
        try {
            let receiptUrl = null;
            let receiptPath = null;

            if (inputFile) {
                const fileExt = inputFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${householdId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(filePath, inputFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(filePath);

                receiptUrl = publicUrl;
                receiptPath = filePath;
            }

            const { error } = await supabase.from('expenses').insert({
                household_id: householdId,
                created_by: user.id,
                amount: amount,
                description: '', // Intentionally empty
                transaction_date: inputDate,
                receipt_url: receiptUrl,
                receipt_path: receiptPath
            });

            if (error) throw error;

            // Reset Input
            setInputExpense('');
            setInputFile(null);

            fetchData();
            onUpdate();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert('Error: ' + message);
        } finally {
            setInputLoading(false);
        }
    };

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleRowClick = (expense: any) => {
        if (expandedRowId === expense.id) {
            setExpandedRowId(null);
        } else {
            setExpandedRowId(expense.id);
            setEditDescription(expense.description || '');
            setEditAmount(Math.abs(expense.amount).toString());
            setEditDate(expense.transaction_date.split('T')[0]);
            setEditFile(null);
        }
    };

    const handleUpdate = async () => {
        if (!expandedRowId) return;
        setEditLoading(true);

        try {
            const val = parseInt(editAmount);
            if (isNaN(val)) throw new Error('Invalid Amount');

            const originalRow = expenses.find(e => e.id === expandedRowId);
            const isOriginalIncome = originalRow && originalRow.amount < 0;
            const finalAmount = isOriginalIncome ? -Math.abs(val) : Math.abs(val);

            // Handle File Upload if selected
            let receiptUpdates = {};
            if (editFile) {
                const fileExt = editFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${householdId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(filePath, editFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(filePath);

                receiptUpdates = {
                    receipt_url: publicUrl,
                    receipt_path: filePath
                };
            }

            const { error } = await supabase
                .from('expenses')
                .update({
                    description: editDescription,
                    amount: finalAmount,
                    transaction_date: editDate,
                    ...receiptUpdates
                })
                .eq('id', expandedRowId);

            if (error) throw error;

            setExpandedRowId(null);
            onUpdate();
            fetchData();

        } catch (e: any) {
            alert('Update failed: ' + e.message);
        } finally {
            setEditLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!expandedRowId || !confirm('この履歴を削除しますか？')) return;
        setEditLoading(true);

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expandedRowId);

            if (error) throw error;

            setExpandedRowId(null);
            onUpdate();
            fetchData();
        } catch (e: any) {
            alert('Delete failed: ' + e.message);
        } finally {
            setEditLoading(false);
        }
    };

    // Calculate Totals and Running Balance
    let runningBalance = previousBalance;
    let totalIncome = 0;
    let totalExpense = 0;

    const rows = expenses.map(expense => {
        const isIncome = expense.amount < 0;
        const absAmount = Math.abs(expense.amount);

        if (isIncome) {
            totalIncome += absAmount;
            runningBalance += absAmount;
        } else {
            totalExpense += absAmount;
            runningBalance -= absAmount;
        }

        return {
            ...expense,
            isIncome,
            absAmount,
            currentBalance: runningBalance
        };
    });

    if (loading) return <div className="py-10 text-center text-xs text-gray-400">Loading...</div>;

    return (
        <div className="bg-white shadow-sm border-t border-gray-100 mb-20">
            {/* Header */}
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

            {/* Table Area - Scrollable for mobile */}
            <div className="w-full overflow-x-auto">
                <table className="w-full text-xs min-w-[350px]">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 border-b border-gray-300">
                        <tr>
                            <th className="py-2 px-2 text-center w-[120px]">日付</th>
                            <th className="py-2 px-2 text-right">支出</th>
                            <th className="py-2 px-2 text-right w-[100px] text-gray-400">残高</th>
                            <th className="py-2 px-2 text-center w-[50px] whitespace-nowrap">レシート</th>
                            <th className="py-2 px-2 w-[40px]"></th> {/* Actions */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-800">
                        {/* Input Row */}
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
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddFromRow()}
                                />
                            </td>
                            <td className="p-1 text-center text-gray-400">
                                -
                            </td>
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
                                    onClick={handleAddFromRow}
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
                            <>
                                <tr
                                    onClick={() => handleRowClick(row)}
                                    className={`transition-colors cursor-pointer ${expandedRowId === row.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                                >
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {format(parseISO(row.transaction_date), 'yyyy/MM/dd')}
                                    </td>
                                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-bold ${row.isIncome ? 'text-green-600' : 'text-red-700'}`}>
                                        {row.isIncome ? '+' : ''}{row.absAmount.toLocaleString()}
                                    </td>
                                    <td className={`px-4 py-4 whitespace-nowrap text-sm text-right font-bold ${row.currentBalance < 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                                        {row.currentBalance.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                        {row.receipt_url ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Don't trigger expand
                                                    setPreviewImage(row.receipt_url || null);
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
                                {/* Expanded Row Content */}
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
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                                        disabled={editLoading}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition-colors"
                                                    >
                                                        削除
                                                    </button>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setExpandedRowId(null); }}
                                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200 transition-colors"
                                                        >
                                                            キャンセル
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleUpdate(); }}
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
                            </>
                        ))}

                        {/* Footer Totals */}
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

            {/* Receipt Preview Overlay */}
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
