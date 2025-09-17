// Supabase Edge Function: create-user
// Creates a Supabase Auth user (admin API) and inserts a matching row in the `users` table.
// Expects JSON body: { name, address, username, password, email, phoneNumber, profileImage?, role? }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CreateUserPayload = {
  name: string;
  address: string;
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  profileImage?: string;
  role?: string;
  comments?: string;
};

// Note: Secrets starting with SUPABASE_ are reserved and cannot be set via `supabase secrets set`.
// Supabase automatically injects SUPABASE_URL at runtime. For the service role, use SERVICE_ROLE_KEY.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 
      'Content-Type': 'application/json',
      ...getCorsHeaders()
    },
  });
}

export async function handler(req: Request): Promise<Response> {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(),
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: getCorsHeaders()
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server not configured: missing SERVICE_ROLE_KEY or PROJECT_URL' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...getCorsHeaders()
        } 
      }
    );
  }

  let body: CreateUserPayload;
  try {
    body = (await req.json()) as CreateUserPayload;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { name, address, username, password, email, phoneNumber, profileImage, role, comments } = body;
  if (!name || !address || !username || !password || !email || !phoneNumber) {
    return badRequest('Missing required fields');
  }
  if (password.length < 6) {
    return badRequest('Password must be at least 6 characters long');
  }

  // 1) Ensure Auth user exists
  const { data: list, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr);
    return new Response(JSON.stringify({ error: 'Auth admin list failed' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders()
      },
    });
  }
  const existingAuth = list.users.find((u) => u.email === email);

  let authUserId: string | null = null;
  if (!existingAuth) {
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      console.error('Failed to create auth user:', createErr);
      return new Response(JSON.stringify({ error: 'Failed to create auth user' }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...getCorsHeaders()
        },
      });
    }
    authUserId = created.user.id;
  } else {
    authUserId = existingAuth.id;
    // Ensure password complies with request
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(existingAuth.id, {
      password,
    });
    if (updateErr) {
      console.error('Failed to update auth user password:', updateErr);
      return new Response(JSON.stringify({ error: 'Failed to update auth password' }), {
        status: 422,
        headers: { 
          'Content-Type': 'application/json',
          ...getCorsHeaders()
        },
      });
    }
  }

  // 2) Upsert into `users` table with the Auth user id
  const newUserRow = {
    id: authUserId!,
    name,
    address,
    username,
    password, // NOTE: stored as plain text in this app baseline; hash in production
    email,
    phone_number: phoneNumber,
    profile_image: profileImage ?? null,
    role: role ?? 'user',
    comments: comments ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Check username/email uniqueness
  const { data: dupUser } = await adminClient.from('users').select('id').eq('username', username).maybeSingle();
  if (dupUser) {
    return badRequest('Username already exists');
  }
  const { data: dupEmail } = await adminClient.from('users').select('id').eq('email', email).maybeSingle();
  if (dupEmail) {
    return badRequest('Email already exists');
  }

  const { data: inserted, error: insertErr } = await adminClient
    .from('users')
    .insert([newUserRow])
    .select()
    .single();

  if (insertErr || !inserted) {
    console.error('Failed to insert users row:', insertErr);
    return new Response(JSON.stringify({ error: 'Failed to insert users row' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders()
      },
    });
  }

  return new Response(JSON.stringify(inserted), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      ...getCorsHeaders()
    },
  });
}

// Deno serve
Deno.serve(handler);


