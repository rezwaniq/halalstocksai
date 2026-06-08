'use client';

import { useState } from 'react';
import { X, Star, Clock, CheckCircle } from 'lucide-react';

type ModalState = 'options' | 'upgrade-soon' | 'feedback' | 'submitting' | 'submitted' | 'error';

interface Props {
  onClose: () => void;
}

const QUESTIONS = [
  { key: 'q1', label: 'How accurate was the Shariah compliance analysis?' },
  { key: 'q2', label: 'How useful was the Geopolitical Intelligence feature?' },
  { key: 'q3', label: 'How easy was the app to navigate and use?' },
  { key: 'q4', label: 'How would you rate the quality and reliability of the data?' },
  { key: 'q5', label: 'How likely are you to recommend HalalStocks AI to other Muslim investors?' },
] as const;

type RatingKey = typeof QUESTIONS[number]['key'];

export default function LimitReachedModal({ onClose }: Props) {
  const [state, setState] = useState<ModalState>('options');
  const [email, setEmail] = useState('');
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({ q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 });
  const [hoveredStar, setHoveredStar] = useState<{ key: RatingKey; value: number } | null>(null);
  const [freeText, setFreeText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const allRated = QUESTIONS.every(q => ratings[q.key] > 0);
  const canSubmit = email.trim().length > 0 && allRated;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setState('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/feedback-reapply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), ratings, freeText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setState('error');
        return;
      }
      setState('submitted');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <X size={16} />
        </button>

        {state === 'submitted' ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Request Received!</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Thank you for your feedback. We&apos;ve sent your re-access request to the admin.
              You&apos;ll receive an email once your access is approved.
            </p>
            <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-600">
              Approval is usually within a few hours.
            </div>
          </div>
        ) : state === 'upgrade-soon' ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Coming Soon</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Paid plans are launching shortly. In the meantime, you can request continued free access below.
            </p>
            <button
              onClick={() => setState('feedback')}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-sm"
            >
              Request Access Again
            </button>
            <button onClick={() => setState('options')} className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition">
              Go back
            </button>
          </div>
        ) : state === 'feedback' || state === 'submitting' || state === 'error' ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-gray-900">Request Access Again</h2>
              <p className="text-sm text-gray-500 mt-1">Share your experience to help us improve</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your email</label>
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

              <div className="space-y-4">
                {QUESTIONS.map(q => (
                  <div key={q.key}>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{q.label}</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(val => {
                        const filled = hoveredStar?.key === q.key
                          ? val <= hoveredStar.value
                          : val <= ratings[q.key];
                        return (
                          <button
                            key={val}
                            type="button"
                            onMouseEnter={() => setHoveredStar({ key: q.key, value: val })}
                            onMouseLeave={() => setHoveredStar(null)}
                            onClick={() => setRatings(prev => ({ ...prev, [q.key]: val }))}
                            className="w-9 h-9 flex items-center justify-center rounded-lg transition hover:scale-110"
                          >
                            <Star
                              size={22}
                              className={filled ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
                              strokeWidth={1.5}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  What else would you like to see? <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  rows={3}
                  placeholder="Tell us what you found most useful, what's missing, or any other feedback..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition text-sm resize-none"
                />
              </div>

              {state === 'error' && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit || state === 'submitting'}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-md shadow-blue-600/20 text-sm"
              >
                {state === 'submitting' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : 'Submit & Request Access'}
              </button>
            </form>
          </>
        ) : (
          /* options state */
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-xl font-black text-gray-900">Trial Limit Reached</h2>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                You&apos;ve used all 3 free trial screenings. Choose an option below to continue.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setState('upgrade-soon')}
                className="w-full text-left flex items-start gap-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:border-blue-300 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-700 transition">
                  <span className="text-white text-lg">⭐</span>
                </div>
                <div>
                  <p className="font-bold text-blue-900 text-sm">Upgrade to Paid Tier</p>
                  <p className="text-xs text-blue-700 mt-0.5">Get unlimited screenings, priority processing, and full report history</p>
                </div>
              </button>
              <button
                onClick={() => setState('feedback')}
                className="w-full text-left flex items-start gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-100 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-300 transition">
                  <span className="text-gray-700 text-lg">✉️</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Request Access Again</p>
                  <p className="text-xs text-gray-500 mt-0.5">Share quick feedback and we&apos;ll review your request for continued access</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
