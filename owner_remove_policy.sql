-- Allow owners to delete members from their household
create policy "Owners can remove members" on household_members for delete
using (
  exists (
    select 1 from household_members as hm
    where hm.household_id = household_members.household_id
    and hm.user_id = auth.uid()
    and hm.role = 'owner'
  )
);
