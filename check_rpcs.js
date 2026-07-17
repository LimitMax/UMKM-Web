const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Simple parse for .env.local
const envContent = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log('Fetching functions from information_schema...');
  
  const { data, error } = await supabase
    .from('pg_proc')
    .select('proname')
    .limit(100);

  if (error) {
    console.error('Error fetching pg_proc:', error);
    
    // Try via rest api using postgrest internal schema check
    const { data: schemaData, error: schemaError } = await supabase.rpc('get_my_claims').catch(e => ({ error: e }));
    console.log('RPC test output:', schemaData, schemaError);
  } else {
    console.log('Procs found:', data.map(p => p.proname));
  }
}
check();
