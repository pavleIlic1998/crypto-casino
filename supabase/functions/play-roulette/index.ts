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

function generateProvablyFairNumber(hash: string, max: number): number {
  const slice = hash.substring(0, 8);
  const decimal = parseInt(slice, 16);
  return decimal % max;
}

function generateControlledNumber(playerNumbers: number[], max: number): number {
  const unavailable = new Set(playerNumbers);
  const available = [];
  for (let i = 0; i < max; i++) {
    if (!unavailable.has(i)) {
      available.push(i);
    }
  }
  return available[Math.floor(Math.random() * available.length)];
}

function calculateWinnings(spinResult: number, bets: any[]): number {
  let totalWinnings = 0;
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
  
  for (const bet of bets) {
    const { type, numbers, amount } = bet;
    let isWin = false;
    let payout = 0;
    
    switch (type) {
      case 'straight':
        isWin = numbers.includes(spinResult);
        payout = 35;
        break;
      case 'red':
        isWin = redNumbers.includes(spinResult);
        payout = 1;
        break;
      case 'black':
        isWin = blackNumbers.includes(spinResult);
        payout = 1;
        break;
      case 'even':
        isWin = spinResult !== 0 && spinResult % 2 === 0;
        payout = 1;
        break;
      case 'odd':
        isWin = spinResult !== 0 && spinResult % 2 === 1;
        payout = 1;
        break;
      case 'low':
        isWin = spinResult >= 1 && spinResult <= 18;
        payout = 1;
        break;
      case 'high':
        isWin = spinResult >= 19 && spinResult <= 36;
        payout = 1;
        break;
      case 'dozen1':
        isWin = spinResult >= 1 && spinResult <= 12;
        payout = 2;
        break;
      case 'dozen2':
        isWin = spinResult >= 13 && spinResult <= 24;
        payout = 2;
        break;
      case 'dozen3':
        isWin = spinResult >= 25 && spinResult <= 36;
        payout = 2;
        break;
    }
    
    if (isWin) {
      totalWinnings += amount * (payout + 1);
    }
  }
  
  return totalWinnings;
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

    const { bets } = await req.json();
    
    if (!bets || !Array.isArray(bets) || bets.length === 0) {
      throw new Error('Invalid bets');
    }
    
    const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (!profile || profile.balance < totalBetAmount) {
      throw new Error('Insufficient balance');
    }

    const { data: config } = await supabase
      .from('game_config')
      .select('*')
      .eq('game_type', 'roulette')
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

    let spinResult: number;
    
    if (config.rng_mode === 'controlled') {
      const playerNumbers = bets
        .filter(bet => bet.type === 'straight')
        .flatMap(bet => bet.numbers);
      spinResult = generateControlledNumber(playerNumbers, 37);
    } else {
      const message = `${seeds.client_seed}:${seeds.nonce}`;
      const hash = await hmacSha256(seeds.server_seed_plain, message);
      spinResult = generateProvablyFairNumber(hash, 37);
    }

    const payoutAmount = calculateWinnings(spinResult, bets);
    const isWin = payoutAmount > totalBetAmount;
    const multiplier = totalBetAmount > 0 ? payoutAmount / totalBetAmount : 0;

    await supabase
      .from('game_seeds')
      .update({ nonce: seeds.nonce + 1 })
      .eq('id', seeds.id);

    await supabase
      .from('game_bets')
      .insert({
        user_id: user.id,
        game_type: 'roulette',
        seed_id: seeds.id,
        nonce: seeds.nonce,
        bet_amount: totalBetAmount,
        payout_amount: payoutAmount,
        multiplier: multiplier,
        game_data: { spinResult, bets },
        server_seed_hash: seeds.server_seed,
        client_seed: seeds.client_seed,
        is_win: isWin,
      });

    const newBalance = profile.balance - totalBetAmount + payoutAmount;
    await supabase
      .from('user_profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          spinResult,
          bets,
          totalBetAmount,
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
