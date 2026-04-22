import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, errorResponse, getDb, json, parseMonthKey, requireHouseholdMembership, requireUser } from '../../../../server/app';

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
    try {
        const householdId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        await requireHouseholdMembership(context.env, householdId, user.id);

        const month = new URL(context.request.url).searchParams.get('month');
        const { end } = parseMonthKey(month);
        const rows = await getDb(context.env)
            .prepare(`
                SELECT amount
                FROM expenses
                WHERE household_id = ? AND transaction_date <= ?
            `)
            .bind(householdId, end)
            .all<{ amount: number }>();

        let totalIncome = 0;
        let totalSpent = 0;

        for (const row of rows.results ?? []) {
            const amount = Number(row.amount);
            if (amount < 0) {
                totalIncome += Math.abs(amount);
            } else {
                totalSpent += amount;
            }
        }

        return json({ totalIncome, totalSpent });
    } catch (error) {
        return errorResponse(error);
    }
};
