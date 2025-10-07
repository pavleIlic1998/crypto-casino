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

async function spinReels(serverSeed: string, clientSeed: string, nonce: number, rngMode: string, symbols: string[]): Promise<string[][]> {
  const reels: string[][] = [];
  
  for (let reel = 0; reel < 5; reel++) {
    const reelSymbols: string[] = [];
    for (let row = 0; row < 3; row++) {
      const position = reel * 3 + row;
      const message = `${clientSeed}:${nonce}:${position}`;
      
      let symbolIndex: number;
      if (rngMode === 'controlled') {
        symbolIndex = generateControlledNumber([], symbols.length);
      } else {
        const hash = await hmacSha256(serverSeed, message);
        symbolIndex = generateProvablyFairNumber(hash, symbols.length);
      }
      
      reelSymbols.push(symbols[symbolIndex]);
    }
    reels.push(reelSymbols);
  }
  
  return reels;
}

function checkWinnings(reels: string[][], paylines: number[][], payouts: any): { winnings: number; winningLines: number[] } {
  let totalWinnings = 0;
  const winningLines: number[] = [];
  
  for (let lineIndex = 0; lineIndex < paylines.length; lineIndex++) {
    const line = paylines[lineIndex];
    const symbols = line.map((row, col) => reels[col][row]);
    
    let matchCount = 1;
    const firstSymbol = symbols[0];
    
    for (let i = 1; i < symbols.length; i++) {
      if (symbols[i] === firstSymbol) {
        matchCount++;
      } else {
        break;
      }
    }
    
    if (matchCount >= 3 && payouts[firstSymbol]) {
      const payout = payouts[firstSymbol][matchCount - 1] || 0;
      if (payout > 0) {
        totalWinnings += payout;
        winningLines.push(lineIndex);
      }
    }
  }
  
  return { winnings: totalWinnings, winningLines };
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

    const { betAmount } = await req.json();
    
    if (!betAmount || betAmount <= 0) {
      throw new Error('Invalid bet amount');
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
      .eq('game_type', 'slots')
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

    const reels = await spinReels(
      seeds.server_seed_plain,
      seeds.client_seed,
      seeds.nonce,
      config.rng_mode,
      config.paytable.symbols
    );

    const { winnings, winningLines } = checkWinnings(
      reels,
      config.paytable.paylines,
      config.paytable.payouts
    );

    const payoutAmount = (winnings * betAmount) / 1;
    const isWin = payoutAmount > 0;
    const multiplier = isWin ? payoutAmount / betAmount : 0;

    await supabase
      .from('game_seeds')
      .update({ nonce: seeds.nonce + 1 })
      .eq('id', seeds.id);

    await supabase
      .from('game_bets')
      .insert({
        user_id: user.id,
        game_type: 'slots',
        seed_id: seeds.id,
        nonce: seeds.nonce,
        bet_amount: betAmount,
        payout_amount: payoutAmount,
        multiplier: multiplier,
        game_data: { reels, winningLines },
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
          reels,
          winningLines,
          betAmount,
          payoutAmount,
          multiplier,
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