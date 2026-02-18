# Mobile UX Optimization Plan

## Goal
Transform the current "desktop-shrunk" mobile interface into a true "mobile-first" experience. The goal is to maximize screen real estate for data viewing while making data entry quick and accessible via one-handed thumb interaction.

## UI Diagnosis (Why it feels "hard to use")
1.  **Form Dominance**: The "Add Expense" form takes up 60-80% of the mobile screen, pushing critical information (history, budget status) below the fold.
2.  **Scroll Fatigue**: Users have to scroll past the huge form just to see their updated transactions.
3.  **Reachability**: Key actions are scattered.
4.  **Layout**: Stacked cards (Budget, Spent, Remaining) consume too much vertical space on small screens.

## Proposed Changes

### 1. Introduce Mobile Bottom Navigation
**Why**: Standard pattern for mobile apps, easier thumb reach than top menus.
*   **Structure**: Fix a navigation bar at the bottom of the screen.
*   **Items**:
    *   **Home** (Dashboard Summary + Recent Transactions)
    *   **History** (Full transaction list)
    *   **Profile/Settings** (Logout, User info)
*   *Note: On Desktop, these can remain as a sidebar or top header.*

### 2. Floating Action Button (FAB) & Modal Input
**Why**: Cleans up the interface. "Add Expense" is a primary action but shouldn't block content.
*   **Change**: Remove the embedded `ExpenseInput` form from the main `Dashboard` flow.
*   **New**: Add a floating "+" button in the bottom-right (or center dock).
*   **Interaction**: Tapping "+" opens a **Slide-up Bottom Sheet** (or Modal) containing the input form.
*   **Benefit**: Users see their budget/history immediately. Data entry is on-demand focused.

### 3. Compact Dashboard Metrics
**Why**: 3 stacked cards are too tall.
*   **Change**: On mobile, use a **Horizontal Scroll (Swiper)** or a **Single Row Grid** (2x2 or 1x3 compact) for metrics.
*   **Structure**: Ensure the user sees "Remaining Budget" instantly without scrolling.

## Component Strategy

### `src/components/MobileNav.tsx` [NEW]
*   Fixed bottom bar.
*   Visible only on `md:hidden` (small screens).

### `src/components/ExpenseInputModal.tsx` [NEW]
*   Wraps the existing `ExpenseInput` logic in a `Dialog/Modal` component.
*   Launched by FAB.

### `src/pages/Dashboard.tsx`
*   **Refactor**:
    *   Hide `ExpenseInput` inline form on mobile.
    *   Add FAB trigger.
    *   Optimize `DashboardSummary` layout for mobile (CSS Grid/Flex adjustments).

## Implementation Steps

1.  **Create Components**:
    *   `FloatingActionButton`
    *   `MobileBottomNav`
    *   `ExpenseModal` (using a simple accessible dialog implementation or Tailwind UI pattern).
2.  **Refactor Dashboard**:
    *   Integrate FAB and Modal.
    *   Add state to control modal visibility.
3.  **Refactor Layout**:
    *   Add `MobileBottomNav` to `AppLayout`.

## Verification
*   **Mobile View**: Verify "Add" form is hidden by default.
*   **Interaction**: Click FAB -> Modal opens -> Submit -> Modal closes & List updates.
*   **Responsiveness**: Ensure Desktop view remains robust (or keeps existing layout).
