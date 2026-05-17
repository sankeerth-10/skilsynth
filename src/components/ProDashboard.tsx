import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Mic, Dna, TrendingUp, Calendar, Zap } from 'lucide-react';

interface ProDashboardProps {
  onBack: () => void;
}

export function ProDashboard({ onBack }: ProDashboardProps) {
  useEffect(() => {
    // Launch confetti on mount
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#60a5fa']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#60a5fa']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-cyan-900/50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-2xl font-extrabold text-white">
            Skill<span className="text-blue-400">Synth</span>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
          <Zap className="w-4 h-4 fill-current" />
          Pro Active
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Welcome Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-900/40 to-cyan-900/30 border border-blue-400/30 rounded-3xl p-10 mb-12 relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 text-9xl opacity-5">✦</div>
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <CheckCircle2 className="w-4 h-4" /> Payment Successful
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
            Welcome to <em className="text-blue-400 not-italic">SkillSynth Pro</em> 🎉
          </h2>
          <p className="text-blue-100/60 text-lg max-w-2xl">
            Your account is now upgraded. Enjoy unlimited AI interviews, detailed DNA reports, and priority support for one full year.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: Mic, value: '∞', label: 'AI Interviews Available' },
            { icon: Dna, value: '0', label: 'DNA Reports Generated' },
            { icon: TrendingUp, value: '0%', label: 'Progress Score' },
            { icon: Calendar, value: expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), label: 'Pro Expires On' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:-translate-y-1 transition-all"
            >
              <stat.icon className="w-8 h-8 text-blue-400 mb-4" />
              <div className="text-3xl font-extrabold mb-1">{stat.value}</div>
              <div className="text-xs text-white/50">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: '🤖', title: 'Start AI Interview', desc: 'Practice with a real-time AI interviewer tailored to your role and experience level.' },
            { icon: '🧬', title: 'SkillSynth DNA', desc: 'Get a detailed breakdown of your communication, confidence, and technical skills.' },
            { icon: '📊', title: 'Progress Tracking', desc: 'Track improvement over time with detailed charts and full session history.' },
            { icon: '⚡', title: 'Priority Support', desc: 'Get answers within 2 hours from our dedicated Pro support team.' }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-blue-900/20 hover:border-blue-500/30 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-bottom-left">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{feature.desc}</p>
              <span className="inline-block bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Pro Unlocked
              </span>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
