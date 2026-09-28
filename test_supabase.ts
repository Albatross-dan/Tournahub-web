import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("Missing Supabase credentials in process.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const uefaId = '8ae4b47a-7362-453c-8900-ef51c9c313eb';
    console.log(`=== Fixtures via RPC for UEFA CHAMPIONS LEAGUE (ID: ${uefaId}) ===`);
    
    const { data: fixturesData, error: fErr } = await (supabase as any).rpc('get_tournament_fixtures_with_badges', { 
      p_tournament_id: uefaId 
    });

    if (fErr) {
      console.error("Error get_tournament_fixtures_with_badges:", fErr);
    } else {
      console.log("Fixtures returned from RPC:");
      console.log(JSON.stringify(fixturesData, null, 2));
    }

  } catch (err) {
    console.error(err);
  }
}

run();



