/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Copy, Check, Diamond, Heart, MessageCircle, Shield, Users, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SCRIPTS_DATA } from './data/scripts';

interface ScriptCategory {
  title: string;
  scripts: string[];
}

interface ScriptsData {
  categories: Record<string, ScriptCategory>;
}

export default function App() {
  const [data, setData] = useState<ScriptsData | null>(SCRIPTS_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [view, setView] = useState<'home' | 'login' | 'signup' | 'settings'>(localStorage.getItem('userToken') ? 'home' : 'login');
  const [diamondCount, setDiamondCount] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('userToken'));
  const [user, setUser] = useState<{ username: string; displayName: string } | null>(null);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Load data from localStorage
    const savedCount = localStorage.getItem('diamondCount');
    if (savedCount) setDiamondCount(parseInt(savedCount, 10));

    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    
    const savedUser = localStorage.getItem('userData');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();
    const password = (formData.get('password') as string).trim();

    // Simple local auth for SPA compatibility
    const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
    const existingUser = users.find((u: any) => u.email === email && u.password === password);

    if (existingUser) {
      const mockToken = `token-${Date.now()}`;
      setToken(mockToken);
      setUser({ username: email, displayName: existingUser.displayName || email.split('@')[0] });
      
      localStorage.setItem('userToken', mockToken);
      localStorage.setItem('userData', JSON.stringify({ username: email, displayName: existingUser.displayName || email.split('@')[0] }));
      
      setView('home');
      setAuthError('');
    } else {
      setAuthError('Invalid email or password');
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();
    const password = (formData.get('password') as string).trim();

    const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
    if (users.find((u: any) => u.email === email)) {
      setAuthError('Email already exists');
      return;
    }

    users.push({ email, password, displayName: email.split('@')[0] });
    localStorage.setItem('localUsers', JSON.stringify(users));
    
    setView('login');
    setAuthError('');
  };

  const toggleFavorite = (text: string) => {
    const newFavorites = favorites.includes(text)
      ? favorites.filter(f => f !== text)
      : [...favorites, text];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    setView('login');
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !user) return;
    
    setIsUpdatingProfile(true);
    const formData = new FormData(e.currentTarget);
    const displayName = (formData.get('displayName') as string).trim();

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, displayName })
      });

      if (res.ok) {
        const updatedUser = { ...user, displayName };
        setUser(updatedUser);
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        setView('home');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleCopy = async (text: string) => {
    setShowPopup(true);
    setCopiedScript(text);
    
    // Increment diamond count
    const newCount = diamondCount + 1;
    setDiamondCount(newCount);
    localStorage.setItem('diamondCount', newCount.toString());

    // Wait for animation then copy
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(text);
        setShowPopup(false);
        // Show a brief success toast or indicator if needed, 
        // but the requirement says "Auto-copies to clipboard AFTER popup"
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }, 2000);
  };

  const filteredScripts = useMemo(() => {
    if (!data) return [];
    const all: { category: string; text: string; categoryKey: string }[] = [];
    const categories = data.categories as Record<string, ScriptCategory>;
    Object.entries(categories).forEach(([key, cat]) => {
      cat.scripts.forEach(script => {
        if (script.toLowerCase().includes(searchQuery.toLowerCase())) {
          all.push({ category: cat.title, text: script, categoryKey: key });
        }
      });
    });
    return all;
  }, [data, searchQuery]);

  if (loadError) return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-rose/20 max-w-[320px]">
        <Shield size={48} className="mx-auto text-rose mb-4" />
        <h2 className="text-xl font-serif text-sage-dark mb-2">Connection Issue</h2>
        <p className="text-sm text-ink/60 mb-6">{loadError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-sage text-white rounded-xl font-bold"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <motion.div 
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-sage"
      >
        <Diamond size={48} fill="currentColor" />
      </motion.div>
    </div>
  );

  if (view === 'login' || view === 'signup') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-white p-8 rounded-3xl shadow-xl border border-sage/20">
          {token && (
            <button onClick={() => setView('home')} className="mb-6 text-sage flex items-center gap-2">
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <h2 className="text-3xl font-serif text-sage mb-6 text-center">
            {view === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <form onSubmit={view === 'login' ? handleLogin : handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email Address</label>
              <input name="email" type="email" placeholder="your@email.com" required className="w-full px-4 py-3 rounded-xl bg-cream/30 border-none focus:ring-2 focus:ring-sage outline-none" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <input 
                name="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                required 
                className="w-full px-4 py-3 rounded-xl bg-cream/30 border-none focus:ring-2 focus:ring-sage outline-none" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[38px] text-sage/60 hover:text-sage"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {authError && <p className="text-rose text-sm font-medium">{authError}</p>}
            <button type="submit" className="w-full py-4 bg-sage text-white rounded-xl font-bold shadow-md active:scale-95 transition-all">
              {view === 'login' ? 'Login to Vault' : 'Sign Up'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-ink/60">
            {view === 'login' ? (
              <>Don't have an account? <button onClick={() => { setView('signup'); setAuthError(''); }} className="text-sage font-bold">Sign Up</button></>
            ) : (
              <>Already have an account? <button onClick={() => { setView('login'); setAuthError(''); }} className="text-sage font-bold">Login</button></>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (view === 'settings' && user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-white p-8 rounded-3xl shadow-xl border border-sage/20">
          <button onClick={() => setView('home')} className="mb-6 text-sage flex items-center gap-2">
            <ArrowLeft size={18} /> Back
          </button>
          <h2 className="text-3xl font-serif text-sage mb-6 text-center">Account Settings</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email Address</label>
              <input 
                type="text" 
                disabled 
                value={user.username} 
                className="w-full px-4 py-3 rounded-xl bg-cream/10 border-none text-ink/40 cursor-not-allowed outline-none" 
              />
              <p className="text-[10px] text-ink/40 mt-1 italic">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Display Name</label>
              <input 
                name="displayName" 
                type="text" 
                defaultValue={user.displayName} 
                placeholder="How should we call you?" 
                required 
                className="w-full px-4 py-3 rounded-xl bg-cream/30 border-none focus:ring-2 focus:ring-sage outline-none" 
              />
            </div>
            <button 
              type="submit" 
              disabled={isUpdatingProfile}
              className="w-full py-4 bg-sage text-white rounded-xl font-bold shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isUpdatingProfile ? 'Updating...' : 'Save Changes'}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-sage/10">
            <button 
              onClick={handleLogout}
              className="w-full py-3 border-2 border-rose/20 text-rose rounded-xl font-bold hover:bg-rose/5 transition-all"
            >
              Logout from Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Remove Admin view as it's no longer used for users

  const categories = data.categories as Record<string, ScriptCategory>;
  const currentCategory = selectedCategory ? categories[selectedCategory] : null;

  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Hero Header */}
      <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-md px-4 pt-6 pb-4 max-w-[400px] mx-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl text-sage font-serif leading-tight">SOS Script Vault</h1>
            <p className="text-sm text-rose font-medium italic">Speak from your worth. Heal through words.</p>
            {user && (
              <p className="text-[10px] text-sage-dark font-bold mt-1 uppercase tracking-widest">
                Welcome, {user.displayName}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white px-3 py-1 rounded-full shadow-sm flex items-center gap-1 border border-sage/20">
              <Diamond size={14} className="text-sage" fill="currentColor" />
              <span className="text-xs font-bold text-sage-dark">{diamondCount}</span>
            </div>
            {user && (
              <button onClick={handleLogout} className="text-[10px] text-rose font-bold uppercase tracking-tighter">
                Logout
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sage" size={18} />
          <input
            type="text"
            placeholder="Search scripts (e.g. 'distance', 'sorry')..."
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm border-none focus:ring-2 focus:ring-sage outline-none text-sm transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="px-4 max-w-[400px] mx-auto mt-4">
        {searchQuery ? (
          <section>
            <h2 className="text-xl mb-4 flex items-center gap-2">
              <Search size={20} className="text-sage" />
              Search Results
            </h2>
            <div className="space-y-4">
              {filteredScripts.length > 0 ? (
                filteredScripts.map((item, idx) => (
                  <ScriptCard 
                    key={`${item.categoryKey}-${idx}`} 
                    text={item.text} 
                    category={item.category} 
                    onCopy={() => handleCopy(item.text)} 
                    isFavorite={favorites.includes(item.text)}
                    onToggleFavorite={() => toggleFavorite(item.text)}
                  />
                ))
              ) : (
                <p className="text-center py-10 text-ink/60 italic">No scripts found matching your search.</p>
              )}
            </div>
          </section>
        ) : showFavorites ? (
          <section>
            <button 
              onClick={() => setShowFavorites(false)}
              className="flex items-center gap-2 text-sage font-medium mb-6 hover:text-sage-dark transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <h2 className="text-2xl mb-6 text-ink flex items-center gap-2">
              <Heart size={24} className="text-rose fill-rose" />
              My Favorite Scripts
            </h2>
            <div className="space-y-6">
              {favorites.length > 0 ? (
                favorites.map((script, idx) => (
                  <ScriptCard 
                    key={`fav-${idx}`} 
                    text={script} 
                    onCopy={() => handleCopy(script)} 
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(script)}
                  />
                ))
              ) : (
                <div className="text-center py-20">
                  <Heart size={48} className="mx-auto text-rose/20 mb-4" />
                  <p className="text-ink/60 italic">You haven't saved any favorites yet.</p>
                </div>
              )}
            </div>
          </section>
        ) : selectedCategory && currentCategory ? (
          <section>
            <button 
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-sage font-medium mb-6 hover:text-sage-dark transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <h2 className="text-2xl mb-6 text-ink">{currentCategory.title}</h2>
            <div className="space-y-6">
              {currentCategory.scripts.map((script, idx) => (
                <ScriptCard 
                  key={`${selectedCategory}-${idx}`} 
                  text={script} 
                  onCopy={() => handleCopy(script)} 
                  isFavorite={favorites.includes(script)}
                  onToggleFavorite={() => toggleFavorite(script)}
                />
              ))}
            </div>
          </section>
        ) : (
          <section>
            <div className="grid grid-cols-1 gap-4">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowFavorites(true)}
                className="w-full h-16 flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-rose/20 text-rose font-semibold shadow-sm hover:bg-rose/5 transition-all mb-2"
              >
                <Heart size={20} className="fill-rose" />
                View My Favorites ({favorites.length})
              </motion.button>
              
              {Object.entries(categories).map(([key, cat], idx) => (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedCategory(key)}
                  className="btn-category pulse-load"
                >
                  {cat.title}
                </motion.button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 px-6 py-10 bg-white/50 border-t border-sage/10 max-w-[400px] mx-auto text-center space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Shield size={24} className="text-sage" />
          <p className="text-sm font-medium">50+ scripts crafted by relationship experts</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <MessageCircle size={24} className="text-sage" />
          <p className="text-sm font-medium">Works offline - Instant WhatsApp copy</p>
        </div>
        <div className="pt-4 border-t border-sage/5">
          <div className="flex items-center justify-center gap-2 text-rose font-serif italic mb-4">
            <Users size={18} />
            <span>17,492 women protected their worth ✨</span>
          </div>
          <button 
            onClick={() => setView('settings')}
            className="text-[10px] uppercase tracking-widest text-ink/30 hover:text-sage transition-colors"
          >
            {user ? 'Account Settings' : 'Login / Sign Up'}
          </button>
        </div>
      </footer>

      {/* Diamond Pop-up Overlay */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center diamond-popup-overlay p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-[320px] border border-sage/20"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="mb-6 inline-block text-sage"
              >
                <Diamond size={64} fill="currentColor" />
              </motion.div>
              <h3 className="text-2xl font-serif text-sage-dark mb-4">Remember, you are a Diamond.</h3>
              <p className="text-ink/80 leading-relaxed">
                This script is a bridge, not a plea. Your worth is inherent and protected.
              </p>
              <div className="mt-8 flex justify-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className="h-1 bg-sage rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScriptCard({ text, category, onCopy, isFavorite, onToggleFavorite }: { text: string; category?: string; onCopy: () => void | Promise<void>; isFavorite: boolean; onToggleFavorite: () => void; key?: string | number }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = () => {
    onCopy();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="script-card group relative"
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="absolute top-4 right-4 text-rose transition-transform active:scale-125"
      >
        <Heart size={20} className={isFavorite ? "fill-rose" : ""} />
      </button>

      {category && (
        <span className="text-[10px] uppercase tracking-wider text-rose font-bold mb-1 block">{category}</span>
      )}
      <p className="text-ink leading-relaxed mb-4 italic">"{text}"</p>
      <button
        onClick={handleCopyClick}
        className="w-full py-2.5 px-4 bg-rose text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-rose/90"
      >
        {isCopied ? (
          <>
            <Check size={16} />
            <span>Copied & Protected</span>
          </>
        ) : (
          <>
            <Copy size={16} />
            <span>📋 Copy & Heal</span>
          </>
        )}
      </button>
    </motion.div>
  );
}
