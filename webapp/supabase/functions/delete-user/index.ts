// Supabase Edge Function: delete-user
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  console.log('Delete function called, method:', req.method)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('Method not POST, returning 405')
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('Processing POST request')
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey
    })
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Create admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Get request body
    const body = await req.json()
    console.log('Request body:', body)
    
    const { id } = body
    
    if (!id) {
      console.log('Missing id in request')
      return new Response(
        JSON.stringify({ error: 'Missing user id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Deleting user with id:', id)

    let authDeleted = false
    let dbDeleted = false

    // First try to delete from auth (so they can't log in anymore)
    console.log('Attempting to delete from Supabase Auth...')
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(id)
      if (authError) {
        console.error('Auth delete error:', authError)
        console.log('Auth user may not exist or deletion failed, continuing...')
      } else {
        console.log('Successfully deleted from Supabase Auth')
        authDeleted = true
      }
    } catch (error) {
      console.error('Auth deletion threw an error:', error)
      console.log('Continuing with database deletion...')
    }

    // Always try to delete from users table
    console.log('Attempting to delete from users table...')
    try {
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
      
      if (dbError) {
        console.error('DB delete error:', dbError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete user profile', 
            details: dbError.message,
            authDeleted 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.log('Successfully deleted from users table')
        dbDeleted = true
      }
    } catch (error) {
      console.error('Database deletion threw an error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user profile', 
          details: error.message,
          authDeleted 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User deletion completed successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        authDeleted, 
        dbDeleted,
        message: `User deleted - Auth: ${authDeleted ? 'Yes' : 'No'}, Database: ${dbDeleted ? 'Yes' : 'No'}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
