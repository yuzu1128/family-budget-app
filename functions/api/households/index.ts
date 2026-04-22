import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, errorResponse, getDb, json, readJson, requireUser } from '../../../server/app';

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
    try {
        const user = await requireUser(context.env, context.request);
        const memberships = await getDb(context.env)
            .prepare(`
                SELECT h.id AS household_id, h.name, h.is_archived, hm.role
                FROM household_members hm
                JOIN households h ON h.id = hm.household_id
                WHERE hm.user_id = ?
                ORDER BY h.created_at DESC
            `)
            .bind(user.id)
            .all<{ household_id: string; name: string; is_archived: number; role: 'owner' | 'member' }>();

        const activeHouseholds = [];
        const archivedHouseholds = [];

        for (const membership of memberships.results ?? []) {
            const members = await getDb(context.env)
                .prepare(`
                    SELECT users.full_name
                    FROM household_members
                    JOIN users ON users.id = household_members.user_id
                    WHERE household_members.household_id = ?
                    ORDER BY users.full_name ASC
                `)
                .bind(membership.household_id)
                .all<{ full_name: string }>();

            const payload = {
                householdId: membership.household_id,
                role: membership.role,
                household: {
                    id: membership.household_id,
                    name: membership.name,
                    isArchived: Boolean(membership.is_archived),
                },
                members: (members.results ?? []).map((row) => row.full_name),
            };

            if (membership.is_archived) {
                archivedHouseholds.push(payload);
            } else {
                activeHouseholds.push(payload);
            }
        }

        return json({ activeHouseholds, archivedHouseholds });
    } catch (error) {
        return errorResponse(error);
    }
};

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const user = await requireUser(context.env, context.request);
        const body = await readJson<{ name?: string }>(context.request);
        const name = body.name?.trim() ?? '';

        if (!name) {
            throw new HttpError(400, '家計簿名を入力してください。');
        }

        const householdId = crypto.randomUUID();
        const membershipId = crypto.randomUUID();
        const now = new Date().toISOString();

        await getDb(context.env).batch([
            getDb(context.env)
                .prepare(`
                    INSERT INTO households (id, name, is_archived, created_at)
                    VALUES (?, ?, 0, ?)
                `)
                .bind(householdId, name, now),
            getDb(context.env)
                .prepare(`
                    INSERT INTO household_members (id, household_id, user_id, role, joined_at)
                    VALUES (?, ?, ?, 'owner', ?)
                `)
                .bind(membershipId, householdId, user.id, now),
        ]);

        return json({
            household: {
                id: householdId,
                name,
                role: 'owner',
            },
        }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};
