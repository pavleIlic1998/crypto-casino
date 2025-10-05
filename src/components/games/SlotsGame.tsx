import { useState, useEffect } from 'react';
import { Play, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SlotsGameProps {
  onBalanceUpdate: () => void;
}

const SYMBOL_EMOJIS: Record<string, string> = {
  cherry: '🍒',
  lemon: '🍋',
  orange: '🍊',
  plum: '🥨',
  grape: '🍇',
  watermelon: '🍉',
  seven: '7️⃣',
  diamond: '💎',
};

export default function SlotsGame({ onBalanceUpdate }: SlotsGameProps) {
  const [betAmount, setBetAmount] = useState(1);
  const [reels, setReels] = useState<string[][]>([
    ['cherry', 'lemon', 'orange'],
    ['cherry', 'lemon', 'orange'],
    ['cherry', 'lemon', 'orange'],
    ['cherry', 'lemon', 'orange'],
    ['cherry', 'lemon', 'orange'],
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    initSeeds();
  }, []);

  const initSeeds = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/init-seeds`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const spin = async () => {
    if (betAmount <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    setError('');
    setIsSpinning(true);
    setLastResult(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/play-slots`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ betAmount }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      setReels(data.result.reels);
      setLastResult(data.result);
      onBalanceUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to spin');
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Slots 5x3</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="bg-slate-950 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-5 gap-2">
            {reels.map((reel, reelIndex) => (
              <div key={reelIndex} className="space-y-2">
                {reel.map((symbol, rowIndex) => (
                  <div
                    key={`${reelIndex}-${rowIndex}`}
                    className={`bg-slate-800 border-2 ${
                      lastResult?.winningLines?.length > 0
                        ? 'border-emerald-500 shadow-lg shadow-emerald-500/50'
                        : 'border-slate-700'
                    } rounded-lg h-20 flex items-center justify-center text-4xl transition-all ${
                      isSpinning ? 'animate-pulse' : ''
                    }`}
                  >
                    {SYMBOL_EMOJIS[symbol] || symbol}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Bet Amount ($)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={betAmount}
              onChange={(e) => setBetAmount(parseFloat(e.target.value))}
              disabled={isSpinning}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
            />
          </div>

          <button
            onClick={spin}
            disabled={isSpinning}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSpinning ? (
              <>
                <Loader className="animate-spin" size={20} />
                Spinning...
              </>
            ) : (
              <>
                <Play size={20} />
                Spin
              </>
            )}
          </button>
        </div>

        {lastResult && (
          <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Result:</span>
              <span
                className={`font-bold text-lg ${
                  lastResult.isWin ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {lastResult.isWin ? '+' : '-'}${Math.abs(lastResult.payoutAmount - lastResult.betAmount).toFixed(2)}
              </span>
            </div>
            {lastResult.isWin && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-slate-400">Multiplier:</span>
                <span className="font-bold text-emerald-500">
                  {lastResult.multiplier.toFixed(2)}x
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
