# Fix Japanese Font Display Issue

## Purpose / Big Picture
The goal is to ensure that the "Noto Sans JP" font is correctly applied to the entire application. Currently, the user reports that the Japanese font is not being reflected, despite no console errors. We will consolidate the font definition, optimize the loading strategy, and verify the configuration.

## Progress
- [ ] Analyze current font configuration (Done)
- [ ] Optimize `index.html` font links (Add preconnect)
- [ ] Clean up `index.css` (Remove redundant @import, rely on Tailwind)
- [ ] Verify `tailwind.config.js` (Confirmed correct)
- [ ] Verify `deploy.ps1` or build process (if relevant)

## Context and Orientation
- **Problem**: Japanese font is not applied.
- **Current State**:
    - `index.html` has a `<link>` to Google Fonts.
    - `index.css` has an `@import` of the same font.
    - `index.css` applies `font-family` with `!important` to `:root`, `html`, `body`.
    - `tailwind.config.js` extends `sans` with "Noto Sans JP".
    - `index.html` `<body>` has `class="font-sans"`.
- **Analysis**: The configuration looks ostensibly correct (if redundant). The `!important` in CSS should force it. If it's not working, likely the font resource is not loading or the browser is unable to match the font family name.

## Plan of Work
1.  **Consolidate Font Loading**: Remove `@import` from CSS and rely on `index.html`. Add `preconnect` links for better performance.
2.  **Simplify CSS**: Remove the manual `font-family` override in `index.css` and rely on Tailwind's `font-sans` class which is already applied to `body`.
3.  **Explicit Fallback**: Ensure the fallback `sans-serif` is present (it is).
4.  **Verification**: Since I cannot see the rendered page, I will make the code as standard and robust as possible.

## Concrete Steps
1.  **Update `index.html`**:
    - Add `<link rel="preconnect" href="https://fonts.googleapis.com">`
    - Add `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
    - Ensure the font link is correct.
2.  **Update `src/index.css`**:
    - Remove `@import`.
    - Remove the `:root, html, body` block with `font-family`. (Keep other styles if needed, or rely on `@layer base`).
3.  **Update `tailwind.config.js`**:
    - (Optional) Ensure `sans` is first in the list if needed, but it is currently extending.

## Decision Log
- **Why remove @import?**: It is better to use `<link>` in HTML for parallel downloading and preconnecting.
- **Why remove explicit CSS override?**: Tailwind's `font-sans` class on `body` is the idiomatic way. Overriding global styles with `!important` can lead to specificity wars.

## Validation and Acceptance
- The code changes should result in a cleaner font loading strategy.
- User will need to verify if the font appears correctly.
