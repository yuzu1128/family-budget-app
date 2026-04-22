import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tempRoot = join(projectRoot, '.tmp', 'legacy-import');

const supabaseUrl = process.env.LEGACY_SUPABASE_URL;
const serviceRoleKey = process.env.LEGACY_SUPABASE_SERVICE_ROLE_KEY;
const targetD1 = process.env.TARGET_D1_DATABASE ?? 'family-budget-app';
const targetR2 = process.env.TARGET_R2_BUCKET ?? 'family-budget-app-receipts';
const skipReceipts = process.env.IMPORT_SKIP_RECEIPTS === '1';

if (!supabaseUrl || !serviceRoleKey) {
    console.error('LEGACY_SUPABASE_URL and LEGACY_SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

function log(message) {
    process.stdout.write(`${message}\n`);
}

function sqlValue(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid numeric value: ${value}`);
        }
        return String(value);
    }

    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }

    return `'${String(value).replace(/'/g, "''")}'`;
}

function deriveUserId(email, sourceId, usedIds) {
    const emailLocalPart = email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
    const fallback = `user${sourceId.replace(/-/g, '').slice(0, 8)}`;
    const base = /^[a-z0-9]+$/.test(emailLocalPart) && emailLocalPart ? emailLocalPart : fallback;

    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) {
        candidate = `${base}${suffix}`;
        suffix += 1;
    }

    usedIds.add(candidate);
    return candidate;
}

function makePlaceholderPassword() {
    const password = randomBytes(32).toString('hex');
    const salt = randomBytes(16);
    const hash = pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex');
    return {
        salt: salt.toString('hex'),
        hash,
    };
}

async function fetchJson(path, params = new URLSearchParams()) {
    const url = new URL(path, supabaseUrl);
    url.search = params.toString();
    const response = await fetch(url, {
        headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase request failed: ${response.status} ${response.statusText} ${path} ${text}`);
    }

    return response.json();
}

async function fetchAll(table, select = '*', order = 'created_at.asc') {
    const rows = [];
    const pageSize = 1000;

    for (let offset = 0; ; offset += pageSize) {
        const params = new URLSearchParams({
            select,
            limit: String(pageSize),
            offset: String(offset),
        });

        if (order) {
            params.set('order', order);
        }

        const page = await fetchJson(`/rest/v1/${table}`, params);
        rows.push(...page);

        if (page.length < pageSize) {
            break;
        }
    }

    return rows;
}

async function downloadReceipt(expense) {
    if (!expense.receipt_path || !expense.receipt_url) {
        return null;
    }

    const destination = join(tempRoot, 'receipts', ...expense.receipt_path.split('/'));
    await mkdir(dirname(destination), { recursive: true });

    const response = await fetch(expense.receipt_url);
    if (!response.ok) {
        throw new Error(`Receipt download failed for ${expense.id}: ${response.status} ${response.statusText}`);
    }

    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    return {
        key: expense.receipt_path,
        file: destination,
        contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    };
}

function runCommand(command, args) {
    const result = spawnSync(command, args, {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });

    if (result.status !== 0) {
        throw new Error(`Command failed: ${command} ${args.join(' ')}`);
    }
}

async function main() {
    await rm(tempRoot, { recursive: true, force: true });
    await mkdir(tempRoot, { recursive: true });

    log('Fetching legacy Supabase tables...');
    const [profiles, households, householdMembers, expenses, budgets] = await Promise.all([
        fetchAll('profiles', 'id,email,full_name,updated_at', 'id.asc'),
        fetchAll('households', 'id,name,is_archived,created_at'),
        fetchAll('household_members', 'id,household_id,user_id,role,joined_at', 'joined_at.asc'),
        fetchAll('expenses', 'id,household_id,created_by,amount,description,transaction_date,receipt_url,receipt_path,created_at'),
        fetchAll('budgets', 'id,household_id,amount,period_type,updated_at', 'updated_at.asc'),
    ]);

    log(`profiles=${profiles.length} households=${households.length} members=${householdMembers.length} expenses=${expenses.length} budgets=${budgets.length}`);

    const usedIds = new Set();
    const users = profiles.map((profile) => {
        const placeholder = makePlaceholderPassword();
        return {
            id: profile.id,
            userId: deriveUserId(profile.email, profile.id, usedIds),
            email: profile.email?.trim().toLowerCase() || null,
            fullName: profile.full_name?.trim() || profile.email?.split('@')[0] || 'Imported User',
            passwordHash: placeholder.hash,
            passwordSalt: placeholder.salt,
            createdAt: profile.updated_at || new Date().toISOString(),
        };
    });

    const userIds = new Set(users.map((user) => user.id));
    const householdIds = new Set(households.map((household) => household.id));
    const memberships = householdMembers.filter((member) => userIds.has(member.user_id) && householdIds.has(member.household_id));
    const filteredExpenses = expenses.filter((expense) => userIds.has(expense.created_by) && householdIds.has(expense.household_id));

    let receipts = [];
    if (!skipReceipts) {
        const receiptEntries = [];
        for (const expense of filteredExpenses) {
            if (!expense.receipt_path || !expense.receipt_url) {
                continue;
            }

            receiptEntries.push(await downloadReceipt(expense));
        }

        receipts = receiptEntries.filter(Boolean);
        log(`Uploading ${receipts.length} receipts to R2...`);
        for (const [index, receipt] of receipts.entries()) {
            log(`Uploading ${index + 1}/${receipts.length}: ${receipt.key}`);
            runCommand('npx', [
                'wrangler',
                'r2',
                'object',
                'put',
                `${targetR2}/${receipt.key}`,
                '--remote',
                '--file',
                receipt.file,
                '--content-type',
                receipt.contentType,
            ]);
        }
    }

    const sqlLines = [
        'DELETE FROM sessions;',
        'DELETE FROM expenses;',
        'DELETE FROM household_members;',
        'DELETE FROM households;',
        'DELETE FROM users;',
    ];

    for (const user of users) {
        sqlLines.push(`INSERT INTO users (id, user_id, email, full_name, password_hash, password_salt, created_at) VALUES (${[
            user.id,
            user.userId,
            user.email,
            user.fullName,
            user.passwordHash,
            user.passwordSalt,
            user.createdAt,
        ].map(sqlValue).join(', ')});`);
    }

    for (const household of households) {
        sqlLines.push(`INSERT INTO households (id, name, is_archived, created_at) VALUES (${[
            household.id,
            household.name,
            household.is_archived ? 1 : 0,
            household.created_at || new Date().toISOString(),
        ].map(sqlValue).join(', ')});`);
    }

    for (const member of memberships) {
        sqlLines.push(`INSERT INTO household_members (id, household_id, user_id, role, joined_at) VALUES (${[
            member.id,
            member.household_id,
            member.user_id,
            member.role,
            member.joined_at || new Date().toISOString(),
        ].map(sqlValue).join(', ')});`);
    }

    for (const expense of filteredExpenses) {
        sqlLines.push(`INSERT INTO expenses (id, household_id, created_by, amount, description, transaction_date, receipt_key, created_at, updated_at) VALUES (${[
            expense.id,
            expense.household_id,
            expense.created_by,
            Math.round(Number(expense.amount)),
            expense.description ?? '',
            expense.transaction_date,
            expense.receipt_path ?? null,
            expense.created_at || new Date().toISOString(),
            expense.created_at || new Date().toISOString(),
        ].map(sqlValue).join(', ')});`);
    }

    const sqlPath = join(tempRoot, 'import.sql');
    const summaryPath = join(tempRoot, 'summary.json');
    await writeFile(sqlPath, sqlLines.join('\n'));
    await writeFile(summaryPath, JSON.stringify({
        profiles: profiles.length,
        households: households.length,
        householdMembers: memberships.length,
        expenses: filteredExpenses.length,
        receipts: receipts.length,
        budgets: budgets.length,
        users: users.map((user) => ({
            id: user.id,
            userId: user.userId,
            email: user.email,
            fullName: user.fullName,
        })),
    }, null, 2));

    log(`Applying import SQL to D1 database ${targetD1}...`);
    runCommand('npx', ['wrangler', 'd1', 'execute', targetD1, '--remote', '--file', sqlPath]);
    log(`Import finished. Summary: ${summaryPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
