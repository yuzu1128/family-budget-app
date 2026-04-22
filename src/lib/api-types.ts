export type HouseholdRole = 'owner' | 'member';

export interface AppUser {
    id: string;
    userId: string;
    fullName: string;
    email?: string | null;
}

export interface AuthSession {
    userId: string;
}

export interface HouseholdRecord {
    id: string;
    name: string;
    isArchived: boolean;
}

export interface HouseholdMembership {
    householdId: string;
    role: HouseholdRole;
    household: HouseholdRecord;
    members: string[];
}

export interface HouseholdSummary {
    id: string;
    name: string;
    role: HouseholdRole;
}

export interface JoinPreview {
    id: string;
    name: string;
}

export interface LedgerExpense {
    id: string;
    amount: number;
    description: string;
    transactionDate: string;
    receiptUrl: string | null;
    createdAt: string;
    creatorName: string;
}

export interface LedgerResponse {
    previousBalance: number;
    expenses: LedgerExpense[];
}

export interface SummaryResponse {
    totalIncome: number;
    totalSpent: number;
}

export interface HouseholdListResponse {
    activeHouseholds: HouseholdMembership[];
    archivedHouseholds: HouseholdMembership[];
}

export interface RecentExpensesResponse {
    expenses: LedgerExpense[];
}
