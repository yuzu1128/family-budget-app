# Owner Removes User

## Goal Description
Allow the owner of a household to remove other members from the household.

## User Review Required
> [!IMPORTANT]
> This requires running a new SQL policy. Please execute the provided SQL in your Supabase SQL Editor.

## Context and Orientation
- **Current State**: Owners can add members, but cannot remove them.
- **Target State**: Owners have a "Remove" button next to members.

## Plan of Work
### Database (Supabase)
#### [NEW] [owner_remove_policy.sql](file:///c:/Users/YDKo/.gemini/antigravity/scratch/family-budget-app/owner_remove_policy.sql)
- Create RLS policy for `DELETE` on `household_members`.

### Frontend
#### [MODIFY] [Settings.tsx](src/pages/Settings.tsx)
- **Refactor `fetchData`**: Change `members` state to store arrays of `{ userId: string, fullName: string }` instead of just string arrays.
- **Update UI**:
    - Replace the simple text list of members with a flex container of "chips" (badges).
    - For each member chip:
        - Display Name.
        - If (Current User is Owner) AND (Member != Current User), show an "X" button.
- **Implement functionality**:
    - `handleRemoveMember(householdId, userId)`:
        - Confirm dialog ("Are you sure you want to remove this user?").
        - Call `supabase.from('household_members').delete()...`.
        - Refresh data on success.
