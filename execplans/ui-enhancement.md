# UI Enhancement Plan

## Purpose / Big Picture
The user wants to "improve the UI nicely". exact goal is to transform the current functional but basic design into a "premium", modern, and aesthetically pleasing interface. We will leverage the existing Tailwind CSS stack but introduce a refined design system.

## Design Concept
- **Theme**: "Modern Clean & Soft"
- **Color Palette**:
    -   **Primary**: Soft Indigo/Violet (existing is okay, but we'll use gradients).
    -   **Background**: subtle warm gray or off-white to reduce harshness.
    -   **Surfaces**: High-quality white cards with deep, soft shadows.
-   **Typography**: `Noto Sans JP` (already fixed) with better hierarchy and tracking.
-   **Visuals**:
    -   **Glassmorphism**: On sticky headers or overlays.
    -   **Gradients**: On primary buttons and key metric cards.
    -   **Soft Borders**: Light borders to define space without harsh lines.
    -   **Rounded Corners**: `rounded-xl` or `rounded-2xl` for a friendlier feel.

## Progress
- [ ] Refine `tailwind.config.js` (Add colors/shadows if needed, or just use standard)
- [ ] Polish `AppLayout` (Navbar)
- [ ] Polish `DashboardSummary` (Metrics)
- [ ] Polish `ExpenseInput` (Form UX)
- [ ] Polish `ExpenseList` (Transaction cards)
- [ ] Polish `Login`/`Register` pages

## Detailed Changes

### 1. Global & Layout (`index.css`, `AppLayout.tsx`)
-   **Background**: Ensure a global smooth background `bg-gray-50/50`.
-   **Navbar**:
    -   Add `backdrop-blur-md` and `bg-white/80`.
    -   Remove heavy shadow, use a subtle border-b.
    -   Improve logo and title typography.

### 2. Dashboard Metrics (`DashboardSummary.tsx`)
-   **Style**: Transform simple boxes into "Stat Cards".
-   **Budget**: Gradient border or subtle background highlight.
-   **Remaining**: Large, colorful typography. Use a progress ring or better bar.

### 3. Expense Input Form (`ExpenseInput.tsx`)
-   **Card**: Floating effect with `shadow-lg`.
-   **Inputs**: Remove default heavy borders, use subtle backgrounds `bg-gray-50` that darken on focus.
-   **Button**: Big, bold gradient button with hover lift transform.

### 4. Expense List (`ExpenseList.tsx`)
-   **List Items**: transform from simple `li` to distinct "Transaction Cards" or a cleaner table-like feel with plenty of whitespace.
-   **Icons**: Add category icons (generic for now, maybe based on description).

## Validation
-   Screenshot verification of the new Dashboard and Login pages to ensure they look "premium".
