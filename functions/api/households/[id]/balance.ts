import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, errorResponse, getDb, json, readJson, requireHouseholdMembership, requireUser } from '../../../../server/app';

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const householdId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        await requireHouseholdMembership(context.env, householdId, user.id);

        const body = await readJson<{ mode?: 'add' | 'set'; amount?: number }>(context.request);
        const amount = Number(body.amount);
        const mode = body.mode === 'set' ? 'set' : 'add';

        if (Number.isNaN(amount)) {
            throw new HttpError(400, '有効な数値を入力してください。');
        }

        if (mode === 'add') {
            await getDb(context.env)
                .prepare(`
                    INSERT INTO expenses (id, household_id, created_by, amount, description, transaction_date, created_at, updated_at, entry_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'balance_adjustment')
                `)
                .bind(
                    crypto.randomUUID(),
                    householdId,
                    user.id,
                    -Math.abs(amount),
                    '残高追加',
                    '2000-01-01',
                    new Date().toISOString(),
                    new Date().toISOString(),
                )
                .run();
        } else {
            await getDb(context.env)
                .prepare(`
                    DELETE FROM expenses
                    WHERE household_id = ?
                      AND entry_type = 'balance_adjustment'
                `)
                .bind(householdId)
                .run();

            const rows = await getDb(context.env)
                .prepare('SELECT amount FROM expenses WHERE household_id = ?')
                .bind(householdId)
                .all<{ amount: number }>();

            let actualBalance = 0;
            for (const row of rows.results ?? []) {
                actualBalance += Number(row.amount);
            }

            const targetActualBalance = -amount;
            const adjustmentAmount = targetActualBalance - actualBalance;

            await getDb(context.env)
                .prepare(`
                    INSERT INTO expenses (id, household_id, created_by, amount, description, transaction_date, created_at, updated_at, entry_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'balance_adjustment')
                `)
                .bind(
                    crypto.randomUUID(),
                    householdId,
                    user.id,
                    adjustmentAmount,
                    '資産初期残高',
                    '2000-01-01',
                    new Date().toISOString(),
                    new Date().toISOString(),
                )
                .run();
        }

        return json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
};
