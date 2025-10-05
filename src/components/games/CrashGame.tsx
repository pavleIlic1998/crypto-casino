import { useState, useEffect } from 'react';
import { Play, Loader, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CrashGameProps {
  onBalanceUpdate: () => void;
}

export default function CrashGame({ onBalanceUpdate }: CrashGameProps) {
  const [betAmount, setBetAmount] = useState(1);
  const [cashoutMultiplier, setCashoutMultiplier] = useState(2.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);

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

  const play = async () => {
    if (betAmount <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    if (cashoutMultiplier < 1.01) {
      setError('Cashout multiplier must be at least 1.01x');
      return;
    }

    setError('');
    setIsPlaying(true);
    setLastResult(null);
    setCurrentMultiplier(1.0);

    const animationDuration = 3000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const mult = 1 + progress * (cashoutMultiplier + 5);
      setCurrentMultiplier(mult);

      if (progress < 1 && isPlaying) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/play-crash`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ betAmount, cashoutMultiplier }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      await new Promise(resolve => setTimeout(resolve, animationDuration));

      setCurrentMultiplier(data.result.crashPoint);
      setLastResult(data.result);
      onBalanceUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to play');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Crash</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="bg-slate-950 rounded-xl p-8 mb-6 h-64 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
          <div className="relative z-10 text-center">
            <TrendingUp
              className={`mx-auto mb-4 ${
                isPlaying ? 'text-emerald-500 animate-pulse' : 'text-slate-600'
              }`}
              size={64}
            />
            <div
              className={`text-6xl font-bold ${
                isPlaying
                  ? lastResult
                    ? lastResult.isWin
                      ? 'text-emerald-500'
                      : 'text-red-500'
                    : 'text-white'
                  : 'text-slate-600'
              }`}
            >
              {isPlaying || lastResult ? `${currentMultiplier.toFixed(2)}x` : '--'}
            </div>
            {lastResult && !isPlaying && (
              <div className="mt-4">
                <div
                  className={`text-xl font-semibold ${
                    lastResult.isWin ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {lastResult.isWin ? '✓ Cashed Out!' : '✗ Crashed!'}
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  Your target: {lastResult.cashoutMultiplier.toFixed(2)}x
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                disabled={isPlaying}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Auto Cashout at
              </label>
              <input
                type="number"
                min="1.01"
                step="0.01"
                value={cashoutMultiplier}
                onChange={(e) => setCashoutMultiplier(parseFloat(e.target.value))}
                disabled={isPlaying}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <button
            onClick={play}
            disabled={isPlaying}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPlaying ? (
              <>
                <Loader className="animate-spin" size={20} />
                Playing...
              </>
            ) : (
              <>
                <Play size={20} />
                Play
              </>
            )}
          </button>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-2">Potential Payout:</div>
            <div className="text-2xl font-bold text-white">
              ${(betAmount * cashoutMultiplier).toFixed(2)}
            </div>
          </div>
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
          </div>
        )}
      </div>
    </div>
  );
}
