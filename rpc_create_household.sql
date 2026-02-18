-- Function to create a household and add the creator as a member in one transaction
create or replace function create_household(name text)
returns json
language plpgsql
security definer
as $$
declare
  new_household_id uuid;
  new_household_name text;
  result json;
begin
  -- 1. Create household
  insert into public.households (name)
  values (create_household.name)
  returning id, public.households.name into new_household_id, new_household_name;

  -- 2. Add creator as owner
  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  -- 3. Return the household object
  select json_build_object('id', new_household_id, 'name', new_household_name, 'role', 'owner')
  into result;

  return result;
end;
$$;
