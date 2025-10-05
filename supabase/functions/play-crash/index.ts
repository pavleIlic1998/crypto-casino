import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateProvablyFairCrashPoint(hash: string, houseEdge: number): number {
  const slice = hash.substring(0, 8);
  const decimal = parseInt(slice, 16);
  const roll = (decimal % 10000) / 100;
  
  if (roll < houseEdge) {
    return 1.00;
  }
  
  const e = Math.pow(2, 32);
  const crashPoint = Math.floor((100 * e - decimal) / (e - decimal)) / 100;
  return Math.max(1.00, Math.min(100.00, crashPoint));
}

function generateControlledCrashPoint(cashoutMultiplier: number): number {
  const avoidRange = 0.3;
  const lowerBound = Math.max(1.00, cashoutMultiplier - avoidRange);
  const upperBound = Math.max(1.00, cashoutMultiplier - 0.05);
  
  const random = Math.random();
  if (random < 0.7) {
    return parseFloat((lowerBound + Math.random() * (upperBound - lowerBound)).toFixed(2));
  } else {
    return parseFloat((cashoutMultiplier + 0.1 + Math.random() * 5).toFixed(2));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { betAmount, cashoutMultiplier } = await req.json();
    
    if (!betAmount || betAmount <= 0) {
      throw new Error('Invalid bet amount');
    }
    
    if (!cashoutMultiplier || cashoutMultiplier < 1.01) {
      throw new Error('Invalid cashout multiplier');
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (!profile || profile.balance < betAmount) {
      throw new Error('Insufficient balance');
    }

    const { data: config } = await supabase
      .from('game_config')
      .select('*')
      .eq('game_type', 'crash')
      .single();

    if (!config || !config.is_active) {
      throw new Error('Game not available');
    }

    const { data: seeds } = await supabase
      .from('game_seeds')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!seeds) {
      throw new Error('No active seeds found');
    }

    let crashPoint: number;
    
    if (config.rng_mode === 'controlled') {
      crashPoint = generateControlledCrashPoint(cashoutMultiplier);
    } else {
      const message = `${seeds.client_seed}:${seeds.nonce}`;
      const hash = await hmacSha256(seeds.server_seed_plain, message);
      crashPoint = generateProvablyFairCrashPoint(hash, config.house_edge);
    }

    const isWin = crashPoint >= cashoutMultiplier;
    const payoutAmount = isWin ? betAmount * cashoutMultiplier : 0;
    const multiplier = isWin ? cashoutMultiplier : 0;

    await supabase
      .from('game_seeds')
      .update({ nonce: seeds.nonce + 1 })
      .eq('id', seeds.id);

    await supabase
      .from('game_bets')
      .insert({
        user_id: user.id,
        game_type: 'crash',
        seed_id: seeds.id,
        nonce: seeds.nonce,
        bet_amount: betAmount,
        payout_amount: payoutAmount,
        multiplier: multiplier,
        game_data: { crashPoint, cashoutMultiplier },
        server_seed_hash: seeds.server_seed,
        client_seed: seeds.client_seed,
        is_win: isWin,
      });

    const newBalance = profile.balance - betAmount + payoutAmount;
    await supabase
      .from('user_profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          crashPoint,
          cashoutMultiplier,
          betAmount,
          payoutAmount,
          isWin,
          newBalance,
          nonce: seeds.nonce,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
