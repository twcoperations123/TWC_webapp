// sync-auth-users.js
import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase project URL and service role key
const SUPABASE_URL = 'https://pdlfszxxyvggtcvgxznp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbGZzenh4eXZnZ3Rjdmd4em5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY2NDQ2MywiZXhwIjoyMDY5MjQwNDYzfQ.phdAjFx0alXP-M1ULNpglMmzYz4YqCu6Fk1dJkmA9X0';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  // 1. Get all users from your custom users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('email, password');

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  // 2. Get all emails from Supabase Auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }
  const emailToAuthUser = new Map(authUsers.users.map(u => [u.email, u]));

  // 3. For each user missing from Auth, create an Auth user
  for (const user of users) {
    const authUser = emailToAuthUser.get(user.email);
    if (!authUser) {
      const password = user.password || 'ChangeMe123!';
      const { error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password,
        email_confirm: true,
      });
      if (createError) {
        console.error(`Failed to create auth user for ${user.email}:`, createError);
      } else {
        console.log(`Created auth user for ${user.email}`);
      }
    } else {
      // Ensure password matches the one in the users table
      const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: user.password || 'ChangeMe123!'
      });
      if (updateError) {
        console.error(`Failed to update password for ${user.email}:`, updateError);
      } else {
        console.log(`Updated password for ${user.email}`);
      }
    }
  }
}

main();