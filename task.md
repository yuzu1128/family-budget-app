# Deployment Task List

- [x] Read deployment documentation (Done)
- [x] Build the application (Handled by deploy script)
- [x] Deploy utilizing the documented method (likely `deploy.ps1`)
- [x] Verify deployment (Script confirmed success)

# UI Enhancement
- [x] Global Styles & Layout (Backdrop blur, soft bg)
- [x] Dashboard Metrics (Stat cards)
- [x] Expense Input (Floating form)
- [x] Expense List (Card style)
- [x] Login/Register Pages (Premium look)
- [x] Verify UI Changes
- [x] Re-deploy with UI Enhancements

# V2 Ledger Upgrade (Mobile First)
- [x] **Phase 1: Mobile Structure**
    - [x] Create `MobileBottomNav` component
    - [x] Create `FloatingActionButton`
    - [x] Create `ExpenseInputModal` (with Autocomplete & Camera)
    - [x] Refactor `AppLayout` & `Dashboard` for Mobile
- [x] **Phase 2: Ledger Table**
    - [x] Create `LedgerTable` component (5 columns, Sticky Header)
    - [x] Implement Receipt Cell (Emoji/Dotted)
    - [x] Implement Running Balance Calculation
    - [x] Implement Monthly Pagination & Footer
- [x] アカウント認証方式の修正とバグ修正
    - [x] ID形式（英数字）への変更
    - [x] 重複IDのチェック
    - [x] 自動ログインのデバッグと修正
    - [x] Supabaseのメール認証設定の確認と案内
- [x] 設定画面の改善 [x]
    - [x] 家族メンバー一覧の表示
    - [x] ログイン中ユーザー名の表示改善 (IDではなく氏名を表示)
- [x] **Phase 4: Multi-Household Management** [x]
    - [x] Create `HouseholdContext` for app-wide household state
    - [x] Update `Dashboard` to support household switching
    - [x] Redesign `Settings` with management UI (rename, archive, switch)
    - [x] Add owner-only permission logic for sensitive actions
- [x] **Phase 5: Verification & Cleanup** (Done)
    - [x] Verify SQL updates (is_archived column, owners policy)
    - [x] Verify switching between multiple households
    - [x] Final UI polish and deployment confirm
    - [x] Refine invitation visibility (Modal-only) and verify flow

# Owner Privileges
- [ ] **Member Removal**
    - [ ] Create RLS policy for owners to delete members
    - [ ] Update Member List UI with Remove button (Owner only)
    - [ ] Verify owner cannot remove themselves

