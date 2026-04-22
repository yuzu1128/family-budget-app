import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, errorResponse, getDb, requireHouseholdMembership, requireUser } from '../../../../server/app';

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
    try {
        const expenseId = context.params.id as string;
        const user = await requireUser(context.env, context.request);

        const expense = await getDb(context.env)
            .prepare(`
                SELECT household_id, receipt_key
                FROM expenses
                WHERE id = ?
                LIMIT 1
            `)
            .bind(expenseId)
            .first<{ household_id: string; receipt_key: string | null }>();

        if (!expense || !expense.receipt_key) {
            throw new HttpError(404, 'レシートが見つかりません。');
        }

        await requireHouseholdMembership(context.env, expense.household_id, user.id);

        if (!context.env.RECEIPTS) {
            throw new HttpError(503, 'R2 binding `RECEIPTS` is missing.');
        }

        const object = await context.env.RECEIPTS.get(expense.receipt_key);
        if (!object) {
            throw new HttpError(404, 'レシートが見つかりません。');
        }

        return new Response(object.body, {
            headers: {
                'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
                'cache-control': 'private, max-age=300',
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
};
