import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, errorResponse, getDb, json, mapExpense, parseMonthKey, requireHouseholdMembership, requireUser } from '../../../../server/app';

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
    try {
        const householdId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        await requireHouseholdMembership(context.env, householdId, user.id);

        const month = new URL(context.request.url).searchParams.get('month');
        const { start, end } = parseMonthKey(month);

        const previousRows = await getDb(context.env)
            .prepare(`
                SELECT amount
                FROM expenses
                WHERE household_id = ? AND transaction_date < ?
            `)
            .bind(householdId, start)
            .all<{ amount: number }>();

        let previousBalance = 0;
        for (const row of previousRows.results ?? []) {
            previousBalance -= Number(row.amount);
        }

        const ledgerRows = await getDb(context.env)
            .prepare(`
                SELECT expenses.id, expenses.amount, expenses.description, expenses.transaction_date,
                       expenses.created_at, expenses.receipt_key, users.full_name AS creator_name
                FROM expenses
                JOIN users ON users.id = expenses.created_by
                WHERE expenses.household_id = ?
                  AND expenses.transaction_date >= ?
                  AND expenses.transaction_date <= ?
                ORDER BY expenses.transaction_date ASC, expenses.created_at ASC
            `)
            .bind(householdId, start, end)
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
            previousBalance,
            expenses: (ledgerRows.results ?? []).map(mapExpense),
        });
    } catch (error) {
        return errorResponse(error);
    }
};
