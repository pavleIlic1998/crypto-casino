import { useState } from 'react';
import { Sparkles, TrendingUp, Circle, Wallet, ArrowLeft } from 'lucide-react';
import SlotsGame from './games/SlotsGame';
import CrashGame from './games/CrashGame';
import RouletteGame from './games/RouletteGame';

interface DashboardProps {
  user: any;
  profile: any;
  onLogout: () => void;
  onBalanceUpdate: () => void;
}

type GameType = 'slots' | 'crash' | 'roulette' | null;

export default function Dashboard({ user, profile, onLogout, onBalanceUpdate }: DashboardProps) {
  const [selectedGame, setSelectedGame] = useState<GameType>(null);

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <button
                onClick={() => setSelectedGame(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Games</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                  <Wallet className="text-emerald-500" size={20} />
                  <span className="text-white font-semibold">
                    ${profile?.balance?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                  <span className="text-white font-medium">{profile?.username}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedGame === 'slots' && <SlotsGame onBalanceUpdate={onBalanceUpdate} />}
          {selectedGame === 'crash' && <CrashGame onBalanceUpdate={onBalanceUpdate} />}
          {selectedGame === 'roulette' && <RouletteGame onBalanceUpdate={onBalanceUpdate} />}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="text-emerald-500" size={32} />
                <div className="absolute inset-0 blur-xl bg-emerald-500/30"></div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                CryptoCasino
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                <Wallet className="text-emerald-500" size={20} />
                <span className="text-white font-semibold">
                  ${profile?.balance?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                <span className="text-white font-medium">{profile?.username}</span>
              </div>
              <button
                onClick={onLogout}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome back, <span className="text-emerald-500">{profile?.username}</span>!
          </h2>
          <p className="text-xl text-slate-400">
            Choose your game and start playing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setSelectedGame('slots')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 transform hover:scale-105 p-8 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl mb-4 shadow-lg">
                <Sparkles className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Slots</h3>
              <p className="text-slate-400 mb-4">
                5x3 slot machine with multiple paylines and exciting wins
              </p>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-semibold">Play Now</span>
                <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded">Provably Fair</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedGame('crash')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 transform hover:scale-105 p-8 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mb-4 shadow-lg">
                <TrendingUp className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Crash</h3>
              <p className="text-slate-400 mb-4">
                Set your multiplier and watch the crash. Cash out in time!
              </p>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-semibold">Play Now</span>
                <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded">Provably Fair</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedGame('roulette')}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 transform hover:scale-105 p-8 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-xl mb-4 shadow-lg">
                <Circle className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Roulette</h3>
              <p className="text-slate-400 mb-4">
                Classic European roulette with multiple betting options
              </p>
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-semibold">Play Now</span>
                <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded">Provably Fair</span>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-12 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-2xl p-8 border border-emerald-500/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Provably Fair Gaming</h3>
            <p className="text-slate-400 max-w-3xl mx-auto">
              All our games use cryptographic algorithms (HMAC-SHA256) to ensure complete fairness and transparency.
              You can verify every single game result using your seeds and nonce values.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
