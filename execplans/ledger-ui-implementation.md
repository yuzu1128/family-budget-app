# Ledger UI Implementation Plan

## Goal
Replace the current "Card" style expense list with a "Notebook/Ledger" style table. This mimics the user's manual physical note-taking method, providing better visibility of money flow and remaining balance.

## User Requirements
1.  **Layout**: Horizontal columns (Table).
2.  **Columns**: Date (left) | Income | Expense | Balance | Receipt (right).
3.  **Receipt UI**:
    *   **No Receipt**: Dotted empty box / blank space.
    *   **With Receipt**: Display an emoji (e.g., 🧾).
    *   **Action**: Tap emoji to view image.
4.  **Running Balance**: Automatically calculate "Remaining" for each row.

## Implementation Details

### 1. Data Structure & Logic
*   **Running Balance Calculation**:
    *   Fetch `Monthly Budget`.
    *   Sort expenses by Date (Ascending or Descending? Notebooks are usually Ascending [oldest top], but apps often show Descending [newest top]. The user's notebook is chronological/Ascending: 12/28 -> 12/29 -> 12/30).
    *   **Decision**: We will use **Descending (Newest Top)** for the app as it's standard, BUT we must calculate balance carefully.
    *   *Actually, looking at the notebook (12/28 -> 12/30), it's Ascending.*
    *   **Let's stick to Descending (Newest first)** for the UI, but we calculate based on the total.
    *   *Formula*:
        *   Current Balance = Budget - (Sum of all expenses up to this date).
        *   We will perform this calculation client-side after fetching the list.

### 2. Component: `LedgerList` (New or Refactor `ExpenseList`)
We will refactor `src/components/ExpenseList.tsx`.

#### Table Structure (Mobile Friendly)
Since mobile width is limited, we need tight spacing.
*   **Date**: `MM/dd` (Narrow)
*   **In** (Income): Hide if 0? or keep empty.
*   **Out** (Expense): `¥999`
*   **Bal** (Balance): `¥999`
*   **Rec** (Receipt): Icon

#### Receipt Column Logic
```tsx
<div className="w-8 h-8 flex items-center justify-center">
  {expense.receipt_url ? (
    <button onClick={() => viewReceipt(expense.receipt_url)}>
      <span className="text-xl">🧾</span>
    </button>
  ) : (
    <div className="w-6 h-6 border-2 border-dotted border-gray-300 rounded-sm"></div>
  )}
</div>
```

### 3. "Income" Handling
*   Currently, the system only has "Expenses".
*   The "Income" column will represent the **Budget** for the very first row (or a special summary row), or we can leave it empty for now until we add an "Add Income" feature.
*   *For this step*: We will focus on the **visual columns**. We will show the "Budget" maybe as the top-most row if looking at the current month.

### 4. Implementation Steps
1.  **Modify `ExpenseList.tsx`**:
    *   Change rendering from `<ul>` cards to `<table>` (or grid `divs` for better control).
    *   Add the `ReceiptModal` logic (already likely exists or simple to add).
    *   Implement `calculateRunningBalance` helper.
2.  **Styling**:
    *   Use `border-b` and vertical lines `border-r` to mimic the notebook grid.
    *   Ensure fonts are legible on mobile (maybe smaller size `text-xs` or `text-sm`).

## Verification
*   **Visual**: Does it look like the requested notebook page?
*   **Logic**: Does the "Balance" column reduce correctly row by row?
*   **Receipt**: Does the dotted box appear for no receipt? Does the emoji appear for receipt? Does it open?
