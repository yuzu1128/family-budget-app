import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, errorResponse, getDb, json, requireUser } from '../../../../server/app';

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const householdId = context.params.id as string;
        const user = await requireUser(context.env, context.request);

        const household = await getDb(context.env)
            .prepare('SELECT id, name FROM households WHERE id = ? LIMIT 1')
            .bind(householdId)
            .first<{ id: string; name: string }>();

        if (!household) {
            throw new HttpError(404, '家計簿が見つかりませんでした。');
        }

        const existingMembership = await getDb(context.env)
            .prepare('SELECT role FROM household_members WHERE household_id = ? AND user_id = ? LIMIT 1')
            .bind(householdId, user.id)
            .first<{ role: 'owner' | 'member' }>();

        if (!existingMembership) {
            await getDb(context.env)
                .prepare(`
                    INSERT INTO household_members (id, household_id, user_id, role, joined_at)
                    VALUES (?, ?, ?, 'member', ?)
                `)
                .bind(crypto.randomUUID(), householdId, user.id, new Date().toISOString())
                .run();
        }

        return json({
            household: {
                id: household.id,
                name: household.name,
                role: existingMembership?.role ?? 'member',
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
};
