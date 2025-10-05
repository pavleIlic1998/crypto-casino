import { useState, useEffect } from 'react';
import { LogIn, UserPlus, Wallet, Sparkles, TrendingUp, Circle } from 'lucide-react';
import { supabase } from './lib/supabase';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import Dashboard from './components/Dashboard';

interface User {
  id: string;
  email?: string;
}

interface UserProfile {
  username: string;
  balance: number;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username, balance')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleBalanceUpdate = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  if (user && profile) {
    return (
      <Dashboard
        user={user}
        profile={profile}
        onLogout={handleLogout}
        onBalanceUpdate={handleBalanceUpdate}
      />
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
              {user ? (
                <>
                  <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                    <Wallet className="text-emerald-500" size={20} />
                    <span className="text-white font-semibold">
                      ${profile?.balance.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-white font-medium">{profile?.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors border border-slate-700"
                  >
                    <LogIn size={18} />
                    Login
                  </button>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all transform hover:scale-105"
                  >
                    <UserPlus size={18} />
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Welcome to the Future of{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Crypto Gaming
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Provably fair games. Instant withdrawals. Maximum excitement.
          </p>
        </div>

        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="text-emerald-500" size={28} />
            Featured Games
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-8">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl mb-4 shadow-lg">
                  <Sparkles className="text-white" size={32} />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">Slots</h4>
                <p className="text-slate-400 mb-4">
                  Classic slot machine action with massive jackpots and exciting bonus rounds
                </p>
                <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                  <span>Coming Soon</span>
                  <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded">Provably Fair</span>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-8">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mb-4 shadow-lg">
                  <TrendingUp className="text-white" size={32} />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">Crash</h4>
                <p className="text-slate-400 mb-4">
                  Watch the multiplier soar and cash out before the crash. High risk, high reward
                </p>
                <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                  <span>Coming Soon</span>
                  <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded">Provably Fair</span>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 transform hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-8">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-xl mb-4 shadow-lg">
                  <Circle className="text-white" size={32} />
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">Roulette</h4>
                <p className="text-slate-400 mb-4">
                  Place your bets on red or black, numbers, or combinations. Classic casino gaming
                </p>
                <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                  <span>Coming Soon</span>
                  <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded">Provably Fair</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-2xl p-8 border border-emerald-500/20">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-4">Why Choose CryptoCasino?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                <div className="text-emerald-500 text-4xl mb-3">🔒</div>
                <h4 className="text-xl font-semibold text-white mb-2">Provably Fair</h4>
                <p className="text-slate-400">
                  All games use cryptographic verification to ensure fairness
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                <div className="text-emerald-500 text-4xl mb-3">⚡</div>
                <h4 className="text-xl font-semibold text-white mb-2">Instant Payouts</h4>
                <p className="text-slate-400">
                  Withdraw your winnings instantly with cryptocurrency
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                <div className="text-emerald-500 text-4xl mb-3">🎮</div>
                <h4 className="text-xl font-semibold text-white mb-2">Exciting Games</h4>
                <p className="text-slate-400">
                  Wide variety of games with competitive RTPs
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-500">
            <p className="mb-2">Play responsibly. 18+ only.</p>
            <p className="text-sm">Demo version - All games coming soon</p>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
    </div>
  );
}

export default App;
