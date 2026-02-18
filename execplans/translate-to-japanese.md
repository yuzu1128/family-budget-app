# Translate Application to Japanese

## Purpose / Big Picture
The user wants the application text to be in Japanese. Currently, the UI displays English text. The goal is to translate these user-facing strings into Japanese to meet the user's requirement ("文字を日本語にしたい").

## Progress
- [x] Identify source files containing English text
- [x] Create translation mapping (Done in this plan)
- [ ] Apply translations to the codebase
- [ ] Verify UI displays Japanese correctly

## Context and Orientation
- **Current State**: Application uses English strings hardcoded in React components. Date formatting is also in English style.
- **Goal**: Full Japanese UI.
- **Target Files**: 8 files identified in `src/pages` and `src/components`.

## Plan of Work
1.  **Translate Strings**: Replace English text with Japanese manually in the components.
2.  **Format Dates**: Update `date-fns` formatting for `expenselist` and `dashboard` to use Japanese format (e.g., `yyyy年M月d日`).

## Detailed Translation Mapping

### Pages
1.  **`src/pages/Dashboard.tsx`**
    - "Welcome to Kakeibo" -> "家計簿へようこそ"
    - "You don't belong to any household yet..." -> "まだ家計簿グループに参加していません。新しく作成して始めましょう！"
    - "Create New Household" -> "新しい家計簿グループを作成"
    - "Household Name" -> "家計簿名"
    - "Create" -> "作成"
    - "Cancel" -> "キャンセル"
    - "Create Household" -> "家計簿を作成"
    - "Join via Invite" -> "招待から参加"
    - "Role:" -> "権限:"
    - "Loading..." -> "読み込み中..."

2.  **`src/pages/Login.tsx`**
    - "Sign in" -> "ログイン"
    - "Or start managing your budget" -> "または家計簿管理を始める"
    - "Email address" -> "メールアドレス"
    - "Password" -> "パスワード"
    - "Signing in..." -> "ログイン中..."

3.  **`src/pages/Register.tsx`**
    - "Create account" -> "アカウント作成"
    - "sign in to existing account" -> "既存のアカウントでログイン"
    - "Full Name" -> "氏名"
    - "Register" -> "登録"
    - "Registering..." -> "登録中..."

### Components
4.  **`src/components/AppLayout.tsx`**
    - "Kakeibo" -> "Kakeibo" (Brand name kept, or "家計簿")

5.  **`src/components/AuthLayout.tsx`**
    - "Family Budget App" -> "家族の家計簿"

6.  **`src/components/DashboardSummary.tsx`**
    - "Monthly Budget" -> "今月の予算"
    - "No budget set" -> "予算未設定"
    - "Total Spent" -> "支出合計"
    - "Remaining" -> "残高"
    - "Loading summary..." -> "集計を読み込み中..."

7.  **`src/components/ExpenseInput.tsx`**
    - ("Add Expense" header) -> "支出を追加"
    - "Amount (¥)" -> "金額 (円)"
    - "Date" -> "日付"
    - "Description" -> "内容" (Placeholder: "食費、家賃など")
    - "Receipt Image" -> "レシート画像"
    - "Upload a file" -> "ファイルをアップロード"
    - "or drag and drop" -> "またはドラッグ＆ドロップ"
    - "Remove file" -> "ファイルを削除"
    - "Adding Expense..." -> "追加中..."
    - ("Add Expense" button) -> "追加する"

8.  **`src/components/ExpenseList.tsx`**
    - "Recent Transactions" -> "最近の支出"
    - "No expenses recorded yet." -> "まだ支出記録がありません。"
    - "Loading transactions..." -> "履歴を読み込み中..."
    - "Receipt" -> "レシート"
    - "Are you sure...?" -> "この支出を削除してもよろしいですか？"
    - Date Format: `'MMMM d, yyyy'` -> `'yyyy年M月d日'`

## Validation and Acceptance
- **Visual Verification**: Use browser subagent to check that:
    - Login/Register pages show Japanese labels.
    - Dashboard shows Japanese headers and buttons.
    - Expense list dates are in Japanese format.
