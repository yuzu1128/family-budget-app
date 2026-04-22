import type { PagesFunction } from '@cloudflare/workers-types';
import { AppEnv, HttpError, createOpaqueToken, errorResponse, getActiveInvite, getDb, json, readJson, requireHouseholdMembership, requireUser } from '../../../server/app';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const onRequestGet: PagesFunction<AppEnv> = async (context) => {
    try {
        const url = new URL(context.request.url);
        const token = url.searchParams.get('token');
        const householdId = url.searchParams.get('householdId');

        if (token) {
            const invite = await getActiveInvite(context.env, token);

            return json({
                household: {
                    id: invite.householdId,
                    name: invite.householdName,
                    expiresAt: invite.expiresAt,
                },
            });
        }

        if (!householdId) {
            throw new HttpError(400, '無効な招待リンクです。');
        }

        const user = await requireUser(context.env, context.request);
        await requireHouseholdMembership(context.env, householdId, user.id);

        const invite = await getDb(context.env)
            .prepare(`
                SELECT hi.token, hi.expires_at, h.name AS household_name
                FROM household_invites hi
                JOIN households h ON h.id = hi.household_id
                WHERE hi.household_id = ?
                  AND hi.revoked_at IS NULL
                  AND hi.expires_at > ?
                ORDER BY hi.created_at DESC
                LIMIT 1
            `)
            .bind(householdId, new Date().toISOString())
            .first<{ token: string; expires_at: string; household_name: string }>();

        return json({
            invite: invite ? {
                householdId,
                householdName: invite.household_name,
                token: invite.token,
                expiresAt: invite.expires_at,
            } : null,
        });
    } catch (error) {
        return errorResponse(error);
    }
};

export const onRequestPost: PagesFunction<AppEnv> = async (context) => {
    try {
        const user = await requireUser(context.env, context.request);
        const body = await readJson<{ householdId?: string }>(context.request);
        const householdId = body.householdId?.trim() ?? '';

        if (!householdId) {
            throw new HttpError(400, '家計簿を選択してください。');
        }

        await requireHouseholdMembership(context.env, householdId, user.id);

        const household = await getDb(context.env)
            .prepare('SELECT name, is_archived FROM households WHERE id = ? LIMIT 1')
            .bind(householdId)
            .first<{ name: string; is_archived: number }>();

        if (!household) {
            throw new HttpError(404, '家計簿が見つかりませんでした。');
        }

        if (household.is_archived) {
            throw new HttpError(409, 'アーカイブ済みの家計簿には招待リンクを発行できません。');
        }

        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
        const inviteId = crypto.randomUUID();
        const token = createOpaqueToken();

        await getDb(context.env).batch([
            getDb(context.env)
                .prepare(`
                    UPDATE household_invites
                    SET revoked_at = ?
                    WHERE household_id = ?
                      AND revoked_at IS NULL
                      AND expires_at > ?
                `)
                .bind(now, householdId, now),
            getDb(context.env)
                .prepare(`
                    INSERT INTO household_invites (id, token, household_id, created_by, created_at, expires_at, revoked_at)
                    VALUES (?, ?, ?, ?, ?, ?, NULL)
                `)
                .bind(inviteId, token, householdId, user.id, now, expiresAt),
        ]);

        return json({
            invite: {
                householdId,
                householdName: household.name,
                token,
                expiresAt,
            },
        }, 201);
    } catch (error) {
        return errorResponse(error);
    }
};
