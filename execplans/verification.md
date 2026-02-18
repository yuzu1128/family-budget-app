# Verification Plan

## Goal
Verify the application builds, lints, and runs correctly after recent changes.

## Deployed Environment
- **URL**: [https://family-budget-ydko-01.fly.dev/](https://family-budget-ydko-01.fly.dev/)
- **Status**: Deployed successfully (verified via logs).

## Automated Checks
1. [x] **Build**: `npm run build` (Success)
2. [x] **Lint**: `npm run lint` (Passed with 2 warnings)
    - Warning: `LegacyTable.tsx` (useEffect dependency) - *Acceptable for now*
    - Warning: `AuthContext.tsx` (Fast refresh) - *Acceptable for now*

## Manual Browser Verification (User Action)
**Note**: Automated browser verification is restricted in this environment. Please perform the following checks on the deployed URL:

### 1. Mobile & Responsive Layout
- [ ] Open in Mobile View (DevTools or Real Device).
- [ ] Verify Bottom Navigation exists and works.
- [ ] Verify Floating Action Button (FAB) is visible.

### 2. Ledger View
- [ ] Columns should be: Date, Category, Memo, Amount, Receipt.
- [ ] Scroll horizontally; ensure "Receipt" column is visible.
- [ ] "Receipt" column should show an icon or empty indicator.

### 3. Expense Input
- [ ] Click FAB (+ button).
- [ ] Verify Modal opens.
- [ ] Verify "Receipt" upload field exists.

### 4. Font Rendering
- [ ] Verify Japanese characters display correctly (Noto Sans JP).

- [x] Verify Japanese characters display correctly (Noto Sans JP).

## Verification Run 1 (2026-01-01)
- **Status**: Failed
- **Issues Found**:
    - Mobile FAB (+) missing.
    - Expense Input Modal inaccessible on mobile.
- **Root Cause**: `FloatingActionButton` component was created but never added to `AppLayout` or `Dashboard`.
- **Fix**: Added `<FloatingActionButton />` to `Dashboard.tsx`.
- **Next Step**: Redeploy and re-verify.

## Verification Run 2 (2026-01-01) - Post-Fix
- **Status**: Passed
- **Verification**:
    - Mobile FAB is valid and visible.
    - Clicking FAB opens "Expense Input" modal correctly.
    - Receipt upload field is present in the modal.
- **Screenshot**: Verified `mobile_dashboard_retry.png`.

