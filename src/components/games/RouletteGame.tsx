import { useState, useEffect } from 'react';
import { Play, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RouletteGameProps {
  onBalanceUpdate: () => void;
}

interface Bet {
  type: string;
  numbers: number[];
  amount: number;
  label: string;
}

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export default function RouletteGame({ onBalanceUpdate }: RouletteGameProps) {
  const [betAmount, setBetAmount] = useState(1);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [spinningNumber, setSpinningNumber] = useState<number | null>(null);

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

  const addBet = (type: string, numbers: number[], label: string) => {
    if (betAmount <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }
    setBets([...bets, { type, numbers, amount: betAmount, label }]);
    setError('');
  };

  const clearBets = () => {
    setBets([]);
  };

  const spin = async () => {
    if (bets.length === 0) {
      setError('Please place at least one bet');
      return;
    }

    setError('');
    setIsSpinning(true);
    setLastResult(null);

    const animationNumbers = Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * 37)
    );

    for (const num of animationNumbers) {
      setSpinningNumber(num);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/play-roulette`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bets }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }

      setSpinningNumber(data.result.spinResult);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setLastResult(data.result);
      setBets([]);
      onBalanceUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to spin');
    } finally {
      setIsSpinning(false);
    }
  };

  const getNumberColor = (num: number) => {
    if (num === 0) return 'bg-green-600';
    return RED_NUMBERS.includes(num) ? 'bg-red-600' : 'bg-slate-900';
  };

  const getTotalBetAmount = () => {
    return bets.reduce((sum, bet) => sum + bet.amount, 0);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Roulette</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="bg-slate-950 rounded-xl p-6 mb-6">
          <div className="text-center mb-4">
            <div
              className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${
                spinningNumber !== null ? getNumberColor(spinningNumber) : 'bg-slate-800'
              } border-4 border-slate-700 ${isSpinning ? 'animate-spin' : ''}`}
            >
              <span className="text-5xl font-bold text-white">
                {spinningNumber !== null ? spinningNumber : '--'}
              </span>
            </div>
          </div>

          {lastResult && !isSpinning && (
            <div className="text-center">
              <div
                className={`text-xl font-semibold ${
                  lastResult.isWin ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {lastResult.isWin ? '✓ You Won!' : '✗ Better Luck Next Time'}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addBet('red', RED_NUMBERS, 'Red')}
                disabled={isSpinning}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                Red (1:1)
              </button>
              <button
                onClick={() => addBet('black', BLACK_NUMBERS, 'Black')}
                disabled={isSpinning}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
              >
                Black (1:1)
              </button>
              <button
                onClick={() => addBet('even', [], 'Even')}
                disabled={isSpinning}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                Even (1:1)
              </button>
              <button
                onClick={() => addBet('odd', [], 'Odd')}
                disabled={isSpinning}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                Odd (1:1)
              </button>
              <button
                onClick={() => addBet('low', [], '1-18')}
                disabled={isSpinning}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                1-18 (1:1)
              </button>
              <button
                onClick={() => addBet('high', [], '19-36')}
                disabled={isSpinning}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                19-36 (1:1)
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => addBet('dozen1', [], '1st 12')}
                disabled={isSpinning}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                1st 12 (2:1)
              </button>
              <button
                onClick={() => addBet('dozen2', [], '2nd 12')}
                disabled={isSpinning}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                2nd 12 (2:1)
              </button>
              <button
                onClick={() => addBet('dozen3', [], '3rd 12')}
                disabled={isSpinning}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                3rd 12 (2:1)
              </button>
            </div>
          </div>

          <div className="bg-slate-950 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Active Bets</h3>
              <button
                onClick={clearBets}
                disabled={isSpinning || bets.length === 0}
                className="text-sm text-red-500 hover:text-red-400 disabled:opacity-50"
              >
                Clear All
              </button>
            </div>

            {bets.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                No bets placed yet
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bets.map((bet, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center bg-slate-800 rounded p-3"
                  >
                    <span className="text-white font-medium">{bet.label}</span>
                    <span className="text-emerald-500 font-semibold">
                      ${bet.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center bg-slate-700 rounded p-3 font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-emerald-500">${getTotalBetAmount().toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={spin}
          disabled={isSpinning || bets.length === 0}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {lastResult && (
          <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Result:</span>
              <span
                className={`font-bold text-lg ${
                  lastResult.isWin ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {lastResult.isWin ? '+' : '-'}${Math.abs(lastResult.payoutAmount - lastResult.totalBetAmount).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
