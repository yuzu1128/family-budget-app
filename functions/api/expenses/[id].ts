import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, deleteReceipt, errorResponse, getDb, getExpenseRecord, json, mapExpense, parseInteger, putReceipt, requireHouseholdMembership, requireUser, sanitizeText } from '../../../server/app';

export const onRequestPatch: PagesFunction<AppEnv> = async (context) => {
    try {
        const expenseId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        const expense = await getExpenseRecord(context.env, expenseId);

        if (!expense) {
            throw new HttpError(404, '支出データが見つかりません。');
        }

        await requireHouseholdMembership(context.env, expense.household_id, user.id);

        const formData = await context.request.formData();
        const amount = parseInteger(formData.get('amount'), 'amount');
        const description = sanitizeText(formData.get('description'));
        const transactionDate = sanitizeText(formData.get('transactionDate'));

        if (!transactionDate) {
            throw new HttpError(400, 'transactionDate is required');
        }

        const receipt = formData.get('receipt');
        const uploadedReceiptKey = receipt instanceof File && receipt.size > 0
            ? await putReceipt(context.env, expense.household_id, expenseId, receipt)
            : null;
        const nextReceiptKey = uploadedReceiptKey ?? expense.receipt_key;

        try {
            await getDb(context.env)
                .prepare(`
                    UPDATE expenses
                    SET amount = ?, description = ?, transaction_date = ?, receipt_key = ?, updated_at = ?
                    WHERE id = ?
                `)
                .bind(amount, description, transactionDate, nextReceiptKey, new Date().toISOString(), expenseId)
                .run();
        } catch (error) {
            if (uploadedReceiptKey && uploadedReceiptKey !== expense.receipt_key) {
                await deleteReceipt(context.env, uploadedReceiptKey);
            }
            throw error;
        }

        if (uploadedReceiptKey && expense.receipt_key && expense.receipt_key !== uploadedReceiptKey) {
            await deleteReceipt(context.env, expense.receipt_key);
        }

        const row = await getDb(context.env)
            .prepare(`
                SELECT expenses.id, expenses.amount, expenses.description, expenses.transaction_date,
                       expenses.created_at, expenses.receipt_key, users.full_name AS creator_name
                FROM expenses
                JOIN users ON users.id = expenses.created_by
                WHERE expenses.id = ?
                LIMIT 1
            `)
            .bind(expenseId)
            .first<{
                id: string;
                amount: number;
                description: string | null;
                transaction_date: string;
                created_at: string;
                receipt_key: string | null;
                creator_name: string;
            }>();

        if (!row) {
            throw new HttpError(500, '更新後の支出データを読み込めませんでした。');
        }

        return json({ expense: mapExpense(row) });
    } catch (error) {
        return errorResponse(error);
    }
};

export const onRequestDelete: PagesFunction<AppEnv> = async (context) => {
    try {
        const expenseId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        const expense = await getExpenseRecord(context.env, expenseId);

        if (!expense) {
            throw new HttpError(404, '支出データが見つかりません。');
        }

        await requireHouseholdMembership(context.env, expense.household_id, user.id);
        await getDb(context.env)
            .prepare('DELETE FROM expenses WHERE id = ?')
            .bind(expenseId)
            .run();
        await deleteReceipt(context.env, expense.receipt_key);

        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
