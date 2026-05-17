import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, X, Shield, Smartphone } from 'lucide-react';
import { Phase } from '../types';

interface PricingPageProps {
  onBack: () => void;
  onUpgradeSuccess: () => void;
}

const YOUR_UPI_ID = 'hemaramu99-1@okaxis';
const AMOUNT = '999';
const PAYEE_NAME = 'SkillSynth+Pro';
const NOTE = 'SkillSynth+Pro+Annual+Plan';

export function PricingPage({ onBack, onUpgradeSuccess }: PricingPageProps) {
  const [showModal, setShowModal] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const getUPILink = () => {
    return `upi://pay?pa=${YOUR_UPI_ID}&pn=${PAYEE_NAME}&am=${AMOUNT}&cu=INR&tn=${NOTE}`;
  };

  const openUPIApp = () => {
    setIsDetecting(true);
    setCountdown(5);
    window.location.href = getUPILink();
    
    // Auto-detect logic via visibilitychange
    const onReturnFromUPI = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', onReturnFromUPI);
      window.removeEventListener('focus', onReturnFromUPI);
      window.removeEventListener('pageshow', onReturnFromUPI);
      
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        onUpgradeSuccess();
      }, 1500);
    };

    document.addEventListener('visibilitychange', onReturnFromUPI);
    window.addEventListener('focus', onReturnFromUPI);
    window.addEventListener('pageshow', onReturnFromUPI);
  };

  useEffect(() => {
    let timer: any;
    if (isDetecting && countdown > 0 && !paymentSuccess) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDetecting, countdown, paymentSuccess]);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden py-24 selection:bg-cyan-900/30">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 p-3 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-slate-800 z-10"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Simple, transparent pricing</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">Choose the plan that fits your career goals.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-center items-center lg:items-stretch">
          
          {/* Starter Plan */}
          <div className="bg-slate-100/50 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-8 flex-1 max-w-md w-full shadow-sm hover:shadow-md transition-all">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">SkillSynth Starter</div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">Free</div>
            <div className="text-sm text-slate-500 mb-8">Perfect for a quick practice session.</div>
            
            <ul className="space-y-4 mb-8">
              {['1 Full Interview', 'Basic DNA Report', 'Vocal Analysis', 'Community Access'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className="w-full py-4 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-200/50 transition-colors mt-auto">
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white border-2 border-blue-500 rounded-3xl p-10 flex-1 max-w-md w-full shadow-[0_20px_60px_-15px_rgba(37,99,235,0.2)] transform scale-105 relative">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-t-3xl"></div>
            <div className="absolute -top-4 right-8 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              MOST POPULAR
            </div>
            
            <div className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-2">SkillSynth Pro</div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-5xl font-extrabold text-slate-900">₹999</span>
              <span className="text-slate-500 font-medium pb-1">/year</span>
            </div>
            <div className="text-sm text-slate-500 mb-8">For serious job seekers aiming to excel.</div>
            
            <ul className="space-y-4 mb-10">
              {['Unlimited AI interviews', 'Detailed SkillSynth DNA reports', 'Progress tracking', 'Priority support'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-blue-600 stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => setShowModal(true)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:shadow-[0_8px_25px_-5px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all mt-auto"
            >
              Upgrade Now
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-slate-100/50 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-8 flex-1 max-w-md w-full shadow-sm hover:shadow-md transition-all">
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Enterprise</div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">Custom</div>
            <div className="text-sm text-slate-500 mb-8">For universities and hiring teams.</div>
            
            <ul className="space-y-4 mb-8">
              {['Bulk Licenses', 'Admin Dashboard', 'API Access', 'Custom Branding', 'Dedicated Manager'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className="w-full py-4 px-6 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-200/50 transition-colors mt-auto">
              Contact Sales
            </button>
          </div>
        </div>
      </div>

      {/* UPI Payment Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isDetecting && setShowModal(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white rounded-[2rem] p-8 md:p-10 max-w-md w-full shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isDetecting}
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-6">
                <div className="text-2xl font-extrabold text-slate-900 mb-1">
                  Skill<span className="text-blue-600">Synth</span>
                </div>
                <p className="text-sm text-slate-500 font-medium flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" /> Secure UPI Payment — No gateway fees
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-5 mb-6 text-center">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Upgrading to</div>
                <div className="text-4xl font-extrabold text-slate-900 mb-1">₹{AMOUNT}</div>
                <div className="text-sm font-semibold text-blue-600">⚡ SkillSynth Pro — 1 Year</div>
              </div>

              {isDetecting ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                  {!paymentSuccess ? (
                    <>
                      <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <div className="text-base font-bold text-green-700 mb-1">Waiting for payment...</div>
                      <div className="text-sm text-slate-600 mb-3">Complete payment in your UPI app. This activates automatically.</div>
                      {countdown > 0 && <div className="text-xs text-slate-500">Checking in {countdown}s...</div>}
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                      <div className="text-lg font-bold text-green-700 mb-1">Payment detected!</div>
                      <div className="text-sm text-slate-600">Activating your Pro plan...</div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-col items-center">
                    <p className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                      <Smartphone className="w-4 h-4" /> Scan from GPay, PhonePe, BHIM
                    </p>
                    <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm inline-block">
                      <QRCode 
                        value={getUPILink()} 
                        size={180} 
                        level="H"
                        fgColor="#0f172a" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">OR directly jump to</div>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  <button 
                    onClick={openUPIApp}
                    className="w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-[0_8px_25px_-5px_rgba(37,99,235,0.4)] hover:-translate-y-0.5"
                  >
                    📲 Pay ₹{AMOUNT} via UPI App
                  </button>

                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-sm text-slate-500">
                    Paying to: <span className="font-semibold text-blue-600 select-all">{YOUR_UPI_ID}</span>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
