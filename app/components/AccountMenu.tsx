'use client';

import { useState, useRef, useEffect } from 'react';
import { User, LogIn, LogOut, ChevronDown } from 'lucide-react';

type AuthState = 'loading' | 'unauthenticated' | 'approved';

interface Props {
  authState: AuthState;
  userEmail: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

export default function AccountMenu({ authState, userEmail, onSignIn, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (authState === 'loading') {
    return (
      <div className="w-28 h-9 bg-gray-100 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
      >
        <User size={15} className="text-gray-500" />
        <span>My Account</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
          {authState === 'approved' ? (
            <>
              <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                <p className="text-xs text-gray-400 mb-0.5">Signed in as</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{userEmail}</p>
              </div>
              <button
                onClick={() => { setOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => { setOpen(false); onSignIn(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <LogIn size={15} className="text-blue-500" />
              Sign In
            </button>
          )}
        </div>
      )}
    </div>
  );
}
