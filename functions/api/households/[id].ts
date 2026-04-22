import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, errorResponse, getDb, json, readJson, requireHouseholdMembership, requireHouseholdOwner, requireUser } from '../../../server/app';

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
    try {
        const householdId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        const role = await requireHouseholdMembership(context.env, householdId, user.id);

        const household = await getDb(context.env)
            .prepare('SELECT id, name FROM households WHERE id = ? LIMIT 1')
            .bind(householdId)
            .first<{ id: string; name: string }>();

        if (!household) {
            throw new HttpError(404, '家計簿が見つかりませんでした。');
        }

        return json({
            household: {
                id: household.id,
                name: household.name,
                role,
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
};

export const onRequestPatch: PagesFunction<AppEnv> = async (context) => {
    try {
        const householdId = context.params.id as string;
        const user = await requireUser(context.env, context.request);
        await requireHouseholdOwner(context.env, householdId, user.id);

        const body = await readJson<{ name?: string; isArchived?: boolean }>(context.request);
        const updates: string[] = [];
        const bindings: unknown[] = [];

        if (typeof body.name === 'string') {
            const name = body.name.trim();
            if (!name) {
                throw new HttpError(400, '家計簿名を入力してください。');
            }
            updates.push('name = ?');
            bindings.push(name);
        }

        if (typeof body.isArchived === 'boolean') {
            updates.push('is_archived = ?');
            bindings.push(body.isArchived ? 1 : 0);
        }

        if (updates.length === 0) {
            throw new HttpError(400, '更新内容がありません。');
        }

        bindings.push(householdId);
        await getDb(context.env)
            .prepare(`UPDATE households SET ${updates.join(', ')} WHERE id = ?`)
            .bind(...bindings)
            .run();

        const household = await getDb(context.env)
            .prepare(`
                SELECT h.id, h.name, hm.role
                FROM households h
                JOIN household_members hm ON hm.household_id = h.id
                WHERE h.id = ? AND hm.user_id = ?
                LIMIT 1
            `)
            .bind(householdId, user.id)
            .first<{ id: string; name: string; role: 'owner' | 'member' }>();

        if (!household) {
            throw new HttpError(404, '家計簿が見つかりませんでした。');
        }

        return json({
            household: {
                id: household.id,
                name: household.name,
                role: household.role,
            },
        });
    } catch (error) {
        return errorResponse(error);
    }
};
