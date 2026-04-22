import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, errorResponse, getActiveInvite, getDb, json, requireUser } from '../../../../server/app';

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const token = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        const invite = await getActiveInvite(context.env, token);

        const existingMembership = await getDb(context.env)
            .prepare('SELECT role FROM household_members WHERE household_id = ? AND user_id = ? LIMIT 1')
            .bind(invite.householdId, user.id)
            .first<{ role: 'owner' | 'member' }>();

        if (!existingMembership) {
            await getDb(context.env)
                .prepare(`
                    INSERT INTO household_members (id, household_id, user_id, role, joined_at)
                    VALUES (?, ?, ?, 'member', ?)
                `)
                .bind(crypto.randomUUID(), invite.householdId, user.id, new Date().toISOString())
                .run();
        }

        return json({
            household: {
                id: invite.householdId,
                name: invite.householdName,
                role: existingMembership?.role ?? 'member',
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
};
