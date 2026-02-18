# V2 Upgrade: Digital Ledger & Mobile UX

## Overview
Transform the application from a "Card-based Desktop App" to a **"Mobile-First Digital Notebook (Ledger)"**. This redesign prioritizes quick data entry on smartphones and a clear, table-based view of finances similar to a physical household account book.

## 1. Mobile-First UX (Usability)
*   **Bottom Navigation**:
    *   Fixed footer menu for easy thumb access: `[Home]`, `[History/Ledger]`, `[Settings]`.
    *   Replaces top-right menu on mobile.
*   **Floating Action Button (FAB)**:
    *   Remove the massive "Add Expense" form provided inline.
    *   Use a fixed `(+)` button in the bottom-right.
    *   **Action**: Opens a **Modal/Sheet** for data entry.
    *   *Benefit*: Keeps the main view clean for viewing data.

## 2. Ledger UI (The "Notebook" View)
Replace the list with a high-density Table/Grid view.

### Columns (Layout)
| Date | Income (Budget) | Expense | Balance | Receipt |
| :--- | :--- | :--- | :--- | :--- |
| 12/28| ¥20,000 | | ¥20,000 | [ ] |
| 12/28| | ¥1,956 | ¥18,044 | 🧾 |

*   **Date**: Compact `MM/dd`.
*   **Income**: Displays budget additions or extra income.
*   **Expense**: Displays spending amount.
*   **Balance**: **Auto-calculated running balance**.
    *   *Formula*: (Previous Balance + Income) - Expense.
*   **Receipt**:
    *   **Empty**: Dotted square `[ ]`.
    *   **uploaded**: Emoji `🧾` (clickable to view image).

### Visual Logic
*   **Alert Colors**:
    *   **Red Text**: Balance < 0.
    *   **Yellow Background/Text**: Balance < 20% of monthly budget (Preventative warning).
*   **Pagination**:
    *   **Monthly View**: Buttons to switch months `< 2025/12 >`.
    *   Only shows transactions for the selected month to keep the "Balance" calculation context clear.
*   **Sticky Header**: The table header (`Date | Income | ...`) will remain fixed at the top of the timeline while scrolling.
*   **Monthly Footer**: A summary row at the bottom of the table displaying "Total Income", "Total Expense", and "Month End Balance".

## 3. Data Logic Updates
*   **Input Candidates (Autocomplete)**:
    *   When typing the "Description" (Content), suggest previously used terms (e.g., "Supermarket", "Lunch") to speed up entry.
*   **Income/Budget Entry**:
    *   Currently, "Budget" is a single field in the DB (`households` table).
    *   **New**: Treat Budget additions as a transaction type (or create a simple "Income" log).
    *   *Simplification phase*: For now, we might keep the single "Set Budget" feature but display it as the "Opening Balance" row at the top of the month.
    *   **Future**: Add explicit "Income Transaction" type.

## 4. Smart Date & Sort Logic
*   **Input Form**:
    *   **Default**: Automatically set to **Today's Date** (`new Date()`) when opening the form.
    *   **Editing**: Fully editable.
*   **Auto-Sorting (Chronological)**:
    *   The table will display in **Ascending Order (Oldest -> Newest)** to match the physical notebook 12/28 -> 12/29 -> 12/30 flow.
    *   **Insertion**: If a user creates a record for a *past date*, it will automatically slot into the correct chronological position between existing rows.
    *   **Re-calculation**: The "Balance" column for all subsequent rows will automatically update to reflect the inserted transaction.
*   **Receipt Capture**:
    *   **Browse & Snap**: Input will support `accept="image/*" capture="environment"` to allow direct camera access on mobile devices, alongside standard file browsing.

## Implementation Steps

### Phase 1: Mobile Structure
1.  Create `MobileBottomNav` component.
2.  Create `FloatingActionButton` & `ExpenseInputModal`.
    *   *Task*: Ensure `date` input defaults to `YYYY-MM-DD` of today.
3.  Refactor `Dashboard.tsx` layout.

### Phase 2: Ledger Table
1.  Create `LedgerTable` component.
    *   *Task*: Switch List to **Ascending Sort** (Month layout).
    *   *Task*: Implement month-based pagination (to make Ascending sort workable/logical).
2.  Implement `ReceiptCell` (Dotted/Emoji logic).
3.  Implement `RunningBalance` logic (Client-side calculation starting from month start).

### Phase 3: Polish
1.  Apply Alert Colors.
2.  Final Mobile Responsiveness check.
