'use client';

import { useState } from 'react';
import { X, Mail, Clock, CheckCircle } from 'lucide-react';

type ModalState = 'idle' | 'loading' | 'loading-resend' | 'pending' | 'approved' | 'error';

interface Props {
  onApproved: () => void;
  onClose: () => void;
}

export default function SignupModal({ onApproved, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<ModalState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (endpoint: string, loadingState: ModalState) => {
    if (!email.trim()) return;
    setState(loadingState);
    setErrorMsg('');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong');
        setState('error');
        return;
      }

      if (data.status === 'approved') {
        setState('approved');
        setTimeout(() => onApproved(), 800);
      } else {
        setState('pending');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit('/api/auth/signup', 'loading');
  };

  const handleResendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit('/api/auth/signup-resend', 'loading-resend');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <X size={16} />
        </button>

        {state === 'pending' ? (
          <PendingState email={email} />
        ) : state === 'approved' ? (
          <ApprovedState />
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Mail size={22} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Access HalalStocks AI</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your approved email to continue</p>
            </div>

            <form onSubmit={handleResendSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition text-sm"
                />
              </div>

              {state === 'error' && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={state === 'loading-resend'}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition shadow-md shadow-blue-600/20 text-sm"
              >
                {state === 'loading-resend' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Access App'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function PendingState({ email }: { email: string }) {
  return (
    <div className="text-center py-4">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <Clock size={28} className="text-amber-600" />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Request Received!</h2>
      <p className="text-gray-500 text-sm leading-relaxed">
        We&apos;ve sent an approval request to the admin for <strong className="text-gray-700">{email}</strong>.
      </p>
      <p className="text-gray-500 text-sm leading-relaxed mt-2">
        You&apos;ll receive an email once your access is approved. Then come back and enter your email to sign in.
      </p>
      <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-600">
        Approval is usually within a few hours.
      </div>
    </div>
  );
}

function ApprovedState() {
  return (
    <div className="text-center py-4">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={28} className="text-green-600" />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Welcome back!</h2>
      <p className="text-gray-500 text-sm">Opening the analyzer...</p>
    </div>
  );
}
