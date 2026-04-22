import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, deleteReceipt, errorResponse, getDb, json, mapExpense, parseInteger, putReceipt, requireHouseholdMembership, requireUser, sanitizeText } from '../../../../server/app';

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
    try {
        const householdId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        await requireHouseholdMembership(context.env, householdId, user.id);

        const url = new URL(context.request.url);
        const limit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10);
        const safeLimit = Number.isNaN(limit) ? 100 : Math.min(Math.max(limit, 1), 500);

        const recentRows = await getDb(context.env)
            .prepare(`
                SELECT expenses.id, expenses.amount, expenses.description, expenses.transaction_date,
                       expenses.created_at, expenses.receipt_key, users.full_name AS creator_name
                FROM expenses
                JOIN users ON users.id = expenses.created_by
                WHERE expenses.household_id = ?
                ORDER BY expenses.transaction_date DESC, expenses.created_at DESC
                LIMIT ?
            `)
            .bind(householdId, safeLimit)
            .all<{
                id: string;
                amount: number;
                description: string | null;
                transaction_date: string;
                created_at: string;
                receipt_key: string | null;
                creator_name: string;
            }>();

        return json({
            expenses: (recentRows.results ?? []).map(mapExpense),
        });
    } catch (error) {
        return errorResponse(error);
    }
};

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const householdId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        await requireHouseholdMembership(context.env, householdId, user.id);

        const formData = await context.request.formData();
        const amount = parseInteger(formData.get('amount'), 'amount');
        const description = sanitizeText(formData.get('description'));
        const transactionDate = sanitizeText(formData.get('transactionDate'));

        if (!transactionDate) {
            throw new HttpError(400, 'transactionDate is required');
        }

        const expenseId = crypto.randomUUID();
        const receipt = formData.get('receipt');
        const receiptKey = receipt instanceof File && receipt.size > 0
            ? await putReceipt(context.env, householdId, expenseId, receipt)
            : null;

        try {
            await getDb(context.env)
                .prepare(`
                    INSERT INTO expenses (id, household_id, created_by, amount, description, transaction_date, receipt_key, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .bind(
                    expenseId,
                    householdId,
                    user.id,
                    amount,
                    description,
                    transactionDate,
                    receiptKey,
                    new Date().toISOString(),
                    new Date().toISOString(),
                )
                .run();
        } catch (error) {
            await deleteReceipt(context.env, receiptKey);
            throw error;
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
            throw new HttpError(500, 'Failed to load created expense.');
        }

        return json({ expense: mapExpense(row) }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};
