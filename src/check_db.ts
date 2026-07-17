import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreate() {
  console.log('Connecting to:', supabaseUrl);
  
  // 1. Create platform owner test account
  const devEmail = 'taufiqqurohman98@gmail.com';
  let devUserId = '3a5d58ee-8267-47fa-8ef3-3c6c29a6cfbd'; // Existing ID if present
  
  const { data: users, error: _uErr } = await supabase.auth.admin.listUsers();
  const existingDev = users?.users.find(u => u.email === devEmail);
  
  if (!existingDev) {
    console.log('Creating developer auth user...');
    const { data: newUser, error: newUErr } = await supabase.auth.admin.createUser({
      email: devEmail,
      password: 'password123',
      email_confirm: true
    });
    if (newUErr) {
      console.error('Failed to create developer auth user:', newUErr.message);
    } else if (newUser.user) {
      devUserId = newUser.user.id;
      console.log('Created auth user with ID:', devUserId);
    }
  } else {
    devUserId = existingDev.id;
    console.log('Developer auth user exists with ID:', devUserId);
    // Reset password to 'password123' so we know it
    await supabase.auth.admin.updateUserById(devUserId, { password: 'password123' });
    console.log('Reset developer password to "password123"');
  }

  // Ensure profiles table has this platform_owner
  const { error: pErr } = await supabase.from('profiles').upsert({
    id: devUserId,
    email: devEmail,
    role: 'platform_owner',
    full_name: 'Platform Owner',
    business_id: null
  });
  if (pErr) console.error('Failed to upsert platform_owner profile:', pErr.message);
  else console.log('Platform Owner profile verified');

  // 1b. Create developer test account (lim.dev@gmail.com / limdev98#)
  const developerEmail = 'lim.dev@gmail.com';
  let developerUserId = '4f8d0cf6-0839-4e93-ba7e-b71db66af80c';
  const existingDevAccount = users?.users.find(u => u.email === developerEmail);
  if (!existingDevAccount) {
    console.log('Creating developer admin auth user...');
    const { data: newUser, error: newUErr } = await supabase.auth.admin.createUser({
      email: developerEmail,
      password: 'limdev98#',
      email_confirm: true
    });
    if (newUErr) {
      console.error('Failed to create developer auth user:', newUErr.message);
    } else if (newUser.user) {
      developerUserId = newUser.user.id;
      console.log('Created developer auth user with ID:', developerUserId);
    }
  } else {
    developerUserId = existingDevAccount.id;
    console.log('Developer auth user exists with ID:', developerUserId);
    await supabase.auth.admin.updateUserById(developerUserId, { password: 'limdev98#' });
    console.log('Reset developer password to "limdev98#"');
  }

  // Verify platform owner business exists
  const devBizId = 'biz-platform-owner';
  const { error: devBizErr } = await supabase.from('businesses').upsert({
    id: devBizId,
    name: 'Platform Owner Container',
    business_type: 'Platform',
    slug: 'platform-owner-container',
    plan_code: 'pro',
    subscription_status: 'active'
  });
  if (devBizErr) console.error('Failed to upsert platform owner business:', devBizErr.message);
  else console.log('Platform Owner business verified');

  // Ensure profiles table has the developer profile
  const { error: pDevErr } = await supabase.from('profiles').upsert({
    id: developerUserId,
    email: developerEmail,
    role: 'admin',
    full_name: 'Developer Admin',
    business_id: devBizId
  });
  if (pDevErr) console.error('Failed to upsert developer profile:', pDevErr.message);
  else console.log('Developer profile verified');

  // 2. Create business and admin owner test account
  const adminEmail = 'testing1@gmail.com';
  let adminUserId = '3d7d0cf6-0839-4e93-ba7e-b71db66af80c';
  
  const existingAdmin = users?.users.find(u => u.email === adminEmail);
  if (!existingAdmin) {
    console.log('Creating admin auth user...');
    const { data: newUser, error: newUErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: 'password123',
      email_confirm: true
    });
    if (newUErr) {
      console.error('Failed to create admin auth user:', newUErr.message);
    } else if (newUser.user) {
      adminUserId = newUser.user.id;
      console.log('Created admin auth user with ID:', adminUserId);
    }
  } else {
    adminUserId = existingAdmin.id;
    console.log('Admin auth user exists with ID:', adminUserId);
    // Reset password to 'password123'
    await supabase.auth.admin.updateUserById(adminUserId, { password: 'password123' });
    console.log('Reset admin password to "password123"');
  }

  // Create testing business if it doesn't exist
  const businessId = 'biz-1784210683821-mmu7';
  const { error: bErr } = await supabase.from('businesses').upsert({
    id: businessId,
    name: 'Testing 1',
    business_type: 'Restaurant',
    slug: 'testing-1',
    plan_code: 'pro',
    subscription_status: 'active'
  });
  if (bErr) console.error('Failed to upsert business:', bErr.message);
  else console.log('Testing business verified');

  // Ensure profiles table has this admin
  const { error: pAdminErr } = await supabase.from('profiles').upsert({
    id: adminUserId,
    email: adminEmail,
    role: 'admin',
    full_name: 'Testing Owner',
    business_id: businessId
  });
  if (pAdminErr) console.error('Failed to upsert admin profile:', pAdminErr.message);
  else console.log('Admin profile verified');
}

checkAndCreate();
