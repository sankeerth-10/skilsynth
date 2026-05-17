import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Briefcase, 
  Target, 
  Brain, 
  Video, 
  Mic, 
  MicOff, 
  Send, 
  ChevronRight, 
  Award, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  Play,
  Square,
  Shield,
  Activity,
  Maximize2,
  Scan,
  ArrowLeft,
  Lightbulb,
  Sparkles,
  Zap,
  Check,
  BookOpen,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Phase, CandidateContext, InterviewMessage, SkillSynthReport } from './types';
import { getNextInterviewQuestion, generateReport } from './services/gemini';
import { useSpeechToText } from './hooks/useSpeechToText';
import { Logo } from './components/Logo';
import { Boxes } from '@/components/ui/background-boxes';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { PricingPage } from './components/PricingPage';
import { ProDashboard } from './components/ProDashboard';

export default function App() {
  const [phase, setPhase] = useState<Phase>(Phase.LANDING);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [context, setContext] = useState<CandidateContext>({
    goal: '',
    level: '',
    education: '',
    confidence: '',
    struggle: '',
    interviewType: ''
  });
  const [history, setHistory] = useState<InterviewMessage[]>([]);
  const [report, setReport] = useState<SkillSynthReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [setupStep, setSetupStep] = useState(1);
  
  const { transcript, isListening, startListening, stopListening, setTranscript } = useSpeechToText();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRetryTrigger, setCameraRetryTrigger] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.onloadedmetadata = () => {
        node.play().catch(e => console.warn("Video play failed:", e));
      };
    }
  }, []);

  const needsCamera = phase === Phase.CONTEXT || phase === Phase.INTERVIEW;

  // Start camera when entering context or interview phase
  useEffect(() => {
    let isMounted = true;

    const startCamera = async (retryCount = 0) => {
      if (!needsCamera) return;
      if (streamRef.current && streamRef.current.active && !cameraError) return;

      try {
        setCameraError(null);
        // Stop any existing tracks first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Your browser does not support camera access or it is blocked.");
          return;
        }

        // Increase delay for the first attempt to let the UI and hardware settle
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Start with more modest constraints to avoid hardware timeouts
        const constraints = { 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: "user"
          }, 
          audio: true 
        };

        console.log(`Attempting camera access (attempt ${retryCount + 1})...`);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) return;

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.warn("Video play failed:", e));
          };
        }
        console.log("Camera started successfully.");
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          console.warn(`Camera permission denied (attempt ${retryCount + 1}):`, err);
          if (isMounted) {
            setCameraError("Camera/Microphone access denied. Please allow permissions in your browser settings.");
          }
          return;
        }

        console.warn(`Camera error (attempt ${retryCount + 1}):`, err);
        
        if (!isMounted) return;

        // If it's a timeout or hardware error, try again with a longer delay
        if (retryCount < 3) {
          const delay = 1500 * (retryCount + 1);
          console.log(`Retrying camera in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return startCamera(retryCount + 1);
        }

        // Final fallback: try video only
        console.log("Attempting final fallback (video only)...");
        try {
          const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (isMounted) {
            streamRef.current = videoOnlyStream;
            if (videoRef.current) {
              videoRef.current.srcObject = videoOnlyStream;
              videoRef.current.play().catch(e => console.warn("Video-only play failed:", e));
            }
          }
        } catch (fallbackErr: any) {
          console.warn("Critical camera failure:", fallbackErr);
          if (fallbackErr.name === 'NotAllowedError' || fallbackErr.message?.includes('Permission denied')) {
            setCameraError("Camera access denied. Please allow permissions in your browser settings.");
          } else {
            setCameraError("Unable to access camera. Please check your hardware connections.");
          }
        }
      }
    };

    if (needsCamera) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      isMounted = false;
    };
  }, [needsCamera, cameraRetryTrigger]);

  const handleStartInterview = async () => {
    setIsProcessing(true);
    const firstQuestion = await getNextInterviewQuestion(context, []);
    setCurrentQuestion(firstQuestion);
    setHistory([{ role: 'interviewer', text: firstQuestion, timestamp: Date.now() }]);
    setPhase(Phase.INTERVIEW);
    setIsProcessing(false);
  };

  const handleAnswerSubmit = async () => {
    if (!transcript.trim()) return;
    
    const userMessage: InterviewMessage = { 
      role: 'candidate', 
      text: transcript, 
      timestamp: Date.now() 
    };
    
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setTranscript('');
    stopListening();
    setIsProcessing(true);

    if (questionCount >= 7) {
      setPhase(Phase.LOADING_REPORT);
      const finalReport = await generateReport(context, newHistory);
      setReport(finalReport);
      // Artificial delay for animation effect
      setTimeout(() => setPhase(Phase.REPORT), 3000);
    } else {
      const nextQuestion = await getNextInterviewQuestion(context, newHistory);
      setCurrentQuestion(nextQuestion);
      setHistory(prev => [...prev, { role: 'interviewer', text: nextQuestion, timestamp: Date.now() }]);
      setQuestionCount(prev => prev + 1);
    }
    setIsProcessing(false);
  };

  const handleBack = () => {
    if (phase === Phase.CONTEXT) {
      if (setupStep > 1) {
        setSetupStep(prev => prev - 1);
      } else {
        setPhase(Phase.LANDING);
      }
    } else if (phase === Phase.INTERVIEW) {
      setPhase(Phase.CONTEXT);
      setQuestionCount(0);
      setHistory([]);
    } else if (phase === Phase.REPORT) {
      setPhase(Phase.LANDING);
      setReport(null);
      setQuestionCount(0);
      setHistory([]);
      setSetupStep(1);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-x-hidden transition-colors duration-700 ${
      phase === Phase.INTERVIEW 
        ? 'h-screen overflow-hidden bg-slate-50' 
        : phase === Phase.REPORT
        ? 'bg-slate-50'
        : 'bg-slate-50'
    }`}>
      <AnimatePresence>
        {phase !== Phase.LANDING && phase !== Phase.LOADING_REPORT && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={handleBack}
            className="fixed top-8 left-8 z-[60] p-3 bg-white rounded-full border border-slate-100 shadow-sm hover:bg-slate-50 transition-all text-slate-600 hover:text-indigo-600 group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === Phase.LANDING && (
          <LandingPage 
            onStart={() => {
              setPhase(Phase.CONTEXT);
            }}
            user={user}
            authLoading={authLoading}
            onLogin={() => signInWithPopup(auth, googleProvider).catch((error: any) => {
              if (error.code === 'auth/unauthorized-domain') {
                alert('Login failed: Unauthorized domain. Please add ' + window.location.hostname + ' to your Firebase Authorized Domains in the console.');
              } else {
                console.error(error);
              }
            })}
            onLogout={() => signOut(auth).catch(console.error)}
            onPricingClick={() => setPhase(Phase.PRICING)}
          />
        )}
        
        {phase === Phase.CONTEXT && (
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 video-glow aspect-video w-full max-w-md mx-auto lg:max-w-none flex items-center justify-center">
              {cameraError ? (
                <div className="text-center p-6 space-y-4 z-20">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-sm font-medium text-red-200">{cameraError}</p>
                  <button 
                    onClick={() => setCameraRetryTrigger(prev => prev + 1)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-900 rounded-lg text-sm font-medium transition-colors"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <video 
                  ref={setVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover mirror absolute inset-0"
                />
              )}
              <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 z-20">
                <div className={`w-2 h-2 rounded-full animate-pulse ${cameraError ? 'bg-red-500' : 'bg-blue-500'}`} />
                {cameraError ? 'Camera Error' : 'Camera Preview'}
              </div>
            </div>
            <ContextCollection 
              context={context} 
              setContext={setContext} 
              onComplete={handleStartInterview}
              isProcessing={isProcessing}
              step={setupStep}
              setStep={setSetupStep}
            />
          </div>
        )}
        
        {phase === Phase.INTERVIEW && (
          <InterviewRoom 
            videoRef={setVideoRef}
            currentQuestion={currentQuestion}
            transcript={transcript}
            isListening={isListening}
            isProcessing={isProcessing}
            startListening={startListening}
            stopListening={stopListening}
            onSubmit={handleAnswerSubmit}
            history={history}
            questionCount={questionCount + 1}
            totalQuestions={8}
            cameraError={cameraError}
          />
        )}

        {phase === Phase.LOADING_REPORT && (
          <LoadingReportPhase />
        )}
        
        {phase === Phase.REPORT && report && (
          <ReportPage 
            report={report} 
            onRestart={() => window.location.reload()} 
          />
        )}

        {phase === Phase.PRICING && (
          <PricingPage 
            onBack={() => setPhase(Phase.LANDING)}
            onUpgradeSuccess={() => setPhase(Phase.PRO_DASHBOARD)}
          />
        )}

        {phase === Phase.PRO_DASHBOARD && (
          <ProDashboard 
            onBack={() => setPhase(Phase.LANDING)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingPage({ onStart, user, authLoading, onLogin, onLogout, onPricingClick }: { 
  onStart: () => void;
  user: FirebaseUser | null;
  authLoading: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onPricingClick: () => void;
}) {
  return (
    <div className="w-full min-h-screen bg-slate-50 selection:bg-cyan-900/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <Logo className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">SkillSynth</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-cyan-400 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-cyan-400 transition-colors">How it Works</a>
            <button onClick={onPricingClick} className="text-sm font-medium text-slate-600 hover:text-cyan-400 transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-4">
            {!authLoading && !user && (
              <>
                <button onClick={onLogin} className="text-sm font-semibold text-slate-600 hover:text-cyan-400 px-4 py-2 transition-colors">Log in</button>
                <button 
                  onClick={onStart}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  Get Started
                </button>
              </>
            )}
            {!authLoading && user && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 hidden sm:block">{user.displayName || user.email}</span>
                  {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />}
                  <button onClick={onLogout} className="text-slate-500 hover:text-red-500 transition-colors" title="Log out">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-24 overflow-hidden bg-slate-50">
        {/* Background Animation */}
        <div className="absolute inset-0 z-0">
          <Boxes />
        </div>
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10"></div>

        <div className="relative z-20 max-w-5xl mx-auto px-6 pt-16 flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-8 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            AI-Powered Placement Readiness Platform
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]"
          >
            Transform Soft Skills into Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">Competitive Advantage</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-600 max-w-3xl leading-relaxed mb-10"
          >
            SkillSynth evaluates communication, confidence, body language, and interview performance to generate your SkillSynth DNA report.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-3"
            >
              Start Free Interview
              <ChevronRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 border border-slate-200 hover:bg-slate-700 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3">
              View Sample DNA Report
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-medium text-slate-500"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              </div>
              Used by students preparing for placements
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              </div>
              Detailed AI-generated feedback
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              </div>
              Hireability Score tracking
            </div>
          </motion.div>
        </div>

        {/* Floating Metric Cards */}
        <motion.div 
          animate={{ y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="absolute left-[5%] top-1/4 hidden lg:flex items-center gap-4 glass3d p-4 rounded-3xl z-20 group hover:scale-105 transition-transform"
        >
          <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-shadow">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">84/100</p>
            <p className="text-[10px] text-cyan-400 uppercase tracking-widest">Communication Score</p>
          </div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 15, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
          className="absolute right-[5%] top-1/3 hidden lg:flex items-center gap-4 glass3d p-4 rounded-3xl z-20 group hover:scale-105 transition-transform"
        >
          <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-shadow">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">91/100</p>
            <p className="text-[10px] text-purple-400 uppercase tracking-widest">Confidence Score</p>
          </div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 2 }}
          className="absolute right-[15%] bottom-1/4 hidden lg:flex items-center gap-4 glass3d p-4 rounded-3xl z-20 group hover:scale-105 transition-transform"
        >
          <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-shadow">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">87/100</p>
            <p className="text-[10px] text-blue-400 uppercase tracking-widest">Hireability Score</p>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-slate-50 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
              Platform Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Everything you need to land your dream job</h2>
            <p className="text-lg text-slate-500">Our AI-driven platform analyzes every aspect of your performance to give you a competitive edge.</p>
          </div>

          <div className="space-y-32">
            {/* Feature 1: Personalized Tailoring */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6 order-2 lg:order-1">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">Personalized Career Tailoring</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  SkillSynth begins by understanding your unique professional DNA. By analyzing your career goals, experience level, confidence, and key weaknesses, our system customizes the entire interview experience to match your specific needs.
                </p>
                <ul className="space-y-3">
                  {['Goal-oriented question mapping', 'Experience-level calibration', 'Confidence-based pressure scaling'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                      <Check className="w-5 h-5 text-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative order-1 lg:order-2">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#818cf815_1px,transparent_1px),linear-gradient(to_bottom,#818cf815_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative glass3d p-8 rounded-3xl flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-400">
                        <Target className="w-10 h-10" />
                      </div>
                      <div className="space-y-2 text-center">
                        <div className="h-2 w-32 bg-indigo-500/30 rounded-full mx-auto"></div>
                        <div className="h-2 w-24 bg-indigo-500/20 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 glass3d p-6 rounded-3xl hidden md:block">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-900/30 rounded-2xl text-indigo-400">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Tailored for You</p>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Profile Sync Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Semi-Adaptive AI Interview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#c084fc15_1px,transparent_1px),linear-gradient(to_bottom,#c084fc15_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative glass3d p-8 rounded-3xl flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-purple-400">
                        <Brain className="w-10 h-10" />
                      </div>
                      <div className="space-y-2 text-center">
                        <div className="h-2 w-32 bg-purple-500/30 rounded-full mx-auto"></div>
                        <div className="h-2 w-24 bg-purple-500/20 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -left-6 glass3d p-6 rounded-3xl hidden md:block">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-900/30 rounded-2xl text-red-400">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">HR Pressure Simulation</p>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Adaptive Logic On</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/30">
                  <Brain className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">Semi-Adaptive AI Interviews</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Experience a realistic HR environment where questions evolve based on your responses. Simulating real-world pressure with time limits, follow-ups, and challenging prompts that test your critical thinking and adaptability.
                </p>
                <ul className="space-y-3">
                  {['Dynamic follow-up questions', 'Realistic time-pressure simulation', 'Behavioral & situational challenges'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                      <Check className="w-5 h-5 text-purple-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 3: Voice & Communication Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6 order-2 lg:order-1">
                <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                  <Mic className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">Neural Voice Analysis</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Our platform captures your voice responses and performs deep neural analysis. We evaluate communication quality, clarity, fluency, and the depth of your answers to provide a comprehensive view of your soft skill proficiency.
                </p>
                <ul className="space-y-3">
                  {['Fluency & clarity detection', 'Tone & sentiment analysis', 'Filler word & pace tracking'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                      <Check className="w-5 h-5 text-cyan-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative order-1 lg:order-2">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d415_1px,transparent_1px),linear-gradient(to_bottom,#06b6d415_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative glass3d p-8 rounded-3xl flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-400">
                        <Mic className="w-10 h-10" />
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="w-2 h-8 bg-cyan-500/50 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-6 glass3d p-6 rounded-3xl hidden md:block">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-900/30 rounded-2xl text-cyan-400">
                      <Scan className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Communication DNA</p>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Real-time Sequencing</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: SkillSynth DNA Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f615_1px,transparent_1px),linear-gradient(to_bottom,#3b82f615_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative glass3d p-8 rounded-3xl flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-400">
                        <Award className="w-10 h-10" />
                      </div>
                      <div className="space-y-2 text-center">
                        <div className="h-2 w-32 bg-blue-500/30 rounded-full mx-auto"></div>
                        <div className="h-2 w-24 bg-blue-500/20 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 glass3d p-6 rounded-3xl hidden md:block">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-900/30 rounded-2xl text-blue-400">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Hireability Score</p>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Report Generated</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">SkillSynth DNA Report</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Receive a comprehensive "SkillSynth DNA" report after every session. This includes your hireability score, detailed skill ratings, a personality tag, core strengths, growth areas, and a personalized role-fit analysis.
                </p>
                <ul className="space-y-3">
                  {['Multi-dimensional skill ratings', 'Personalized improvement roadmap', 'AI-driven role-fit analysis'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                      <Check className="w-5 h-5 text-blue-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 5: Continuous Improvement */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6 order-2 lg:order-1">
                <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">Continuous Improvement System</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  SkillSynth is more than just an assessment tool—it's a journey. Retake interviews as many times as you need to track your progress over time, refine your responses, and build the confidence required for high-stakes placements.
                </p>
                <ul className="space-y-3">
                  {['Progress tracking over time', 'Unlimited interview simulations', 'Iterative feedback loops'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                      <Check className="w-5 h-5 text-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative order-1 lg:order-2">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#818cf815_1px,transparent_1px),linear-gradient(to_bottom,#818cf815_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative glass3d p-8 rounded-3xl flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-400">
                        <TrendingUp className="w-10 h-10" />
                      </div>
                      <div className="flex items-end gap-2 h-12">
                        {[4, 6, 8, 12].map((h, i) => (
                          <div key={i} className={`w-4 bg-indigo-500/50 rounded-t-sm`} style={{ height: `${h * 4}px` }}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-6 -right-6 glass3d p-6 rounded-3xl hidden md:block">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-900/30 rounded-2xl text-indigo-400">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Growth Tracking</p>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Neural History Synced</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 6: Practicality & Readiness */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200">
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#94a3b815_1px,transparent_1px),linear-gradient(to_bottom,#94a3b815_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="relative glass3d p-8 rounded-3xl flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-600">
                        <Shield className="w-10 h-10" />
                      </div>
                      <div className="space-y-2 text-center">
                        <div className="h-2 w-32 bg-slate-700 rounded-full mx-auto"></div>
                        <div className="h-2 w-24 bg-slate-700/50 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-6 glass3d p-6 rounded-3xl hidden md:block">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl text-slate-600">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Placement Ready</p>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Enterprise Standard</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-lg border border-slate-200">
                  <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900">Practical Placement Readiness</h3>
                <p className="text-lg text-slate-500 leading-relaxed">
                  Designed for students, colleges, and job seekers. Support for downloadable reports, role-specific interview flows, and a clean, intuitive interface that replicates real interview environments to ensure you're fully prepared.
                </p>
                <ul className="space-y-3">
                  {['Downloadable PDF reports', 'Role-specific interview flows', 'Intuitive placement-ready UI'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-600 font-medium">
                      <Check className="w-5 h-5 text-slate-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Three steps to interview mastery</h2>
            <p className="text-lg text-slate-500">Our seamless process takes you from nervous to natural in minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white -translate-y-1/2 z-0"></div>
            
            {[
              { step: "01", title: "Setup Context", desc: "Tell SkillSynth about your target role and experience level." },
              { step: "02", title: "Live Simulation", desc: "Engage in a high-pressure, AI-driven behavioral interview." },
              { step: "03", title: "DNA Analysis", desc: "Receive a deep-dive report on your soft skills and hireability." }
            ].map((item, i) => (
              <div key={i} className="relative z-10 glass3d p-8 rounded-[2rem] border border-slate-200 text-center space-y-4">
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-400 font-bold mx-auto border border-cyan-500/30">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6 bg-slate-100 text-slate-900 rounded-[4rem] mx-6 mb-24 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="text-lg text-slate-500">Choose the plan that fits your career goals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                name: "SkillSynth Starter", 
                price: "Free", 
                desc: "Perfect for a quick practice session.", 
                features: ["1 Full Interview", "Basic DNA Report", "Vocal Analysis", "Community Access"],
                cta: "Start Free",
                popular: false
              },
              { 
                name: "SkillSynth Pro", 
                price: "₹999/year", 
                desc: "For serious job seekers.", 
                features: ["Unlimited AI interviews", "Detailed SkillSynth DNA reports", "Progress tracking", "Priority support"],
                cta: "Upgrade Now",
                popular: true
              },
              { 
                name: "Enterprise", 
                price: "Custom", 
                desc: "For universities and hiring teams.", 
                features: ["Bulk Licenses", "Admin Dashboard", "API Access", "Custom Branding", "Dedicated Manager"],
                cta: "Contact Sales",
                popular: false
              }
            ].map((plan, i) => (
              <div key={i} className={`p-8 rounded-3xl ${plan.popular ? 'glass3d border-cyan-500/30' : 'glass3d border-slate-200/50'} flex flex-col h-full`}>
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-2 text-slate-900">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{plan.desc}</p>
                </div>
                
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-slate-600">
                      <CheckCircle2 className={`w-5 h-5 ${plan.popular ? 'text-cyan-400' : 'text-blue-500'}`} />
                      <span className="opacity-90">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={plan.name === "SkillSynth Starter" ? onStart : undefined}
                  className={`w-full py-4 rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] ${plan.popular ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <Logo className="w-8 h-8" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">SkillSynth</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 SkillSynth AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-indigo-600">Privacy</a>
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-indigo-600">Terms</a>
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-indigo-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContextCollection({ 
  context, 
  setContext, 
  onComplete,
  isProcessing,
  step,
  setStep
}: { 
  context: CandidateContext, 
  setContext: (c: CandidateContext) => void,
  onComplete: () => void,
  isProcessing: boolean,
  step: number,
  setStep: (s: number | ((prev: number) => number)) => void
}) {
  const steps = [
    {
      id: 'goal',
      question: "What is your primary career goal?",
      options: ["Software Engineer", "Data Analyst", "Product Manager", "Sales / Marketing", "MBA / Business", "General Placement"],
      icon: <Briefcase className="w-5 h-5" />
    },
    {
      id: 'level',
      question: "What is your current professional level?",
      options: ["Student (1st/2nd Year)", "Final Year Student", "Fresh Graduate", "Junior Professional", "Senior Professional"],
      icon: <User className="w-5 h-5" />
    },
    {
      id: 'education',
      question: "What is your educational background?",
      options: ["Computer Science / IT", "Engineering (Non-IT)", "Business / Management", "Arts / Humanities", "Science / Mathematics", "Other"],
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      id: 'confidence',
      question: "How would you rate your communication confidence?",
      options: ["Beginner", "Intermediate", "Advanced", "Expert"],
      icon: <Award className="w-5 h-5" />
    },
    {
      id: 'struggle',
      question: "What is your biggest interview struggle?",
      options: ["Nervousness", "Structuring Answers", "Technical Depth", "Soft Skills", "English Fluency"],
      icon: <AlertCircle className="w-5 h-5" />
    },
    {
      id: 'interviewType',
      question: "Select the interview simulation type:",
      options: ["Standard HR", "Stress Interview", "Behavioral Focus", "Leadership Round"],
      icon: <Target className="w-5 h-5" />
    }
  ];

  const currentStepData = steps[step - 1];

  const handleOptionSelect = (option: string) => {
    setContext({ ...context, [currentStepData.id]: option });
    if (step < steps.length) {
      setStep(step + 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-xl space-y-8"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          <span>Simulation Setup</span>
          <span>Step {step} of {steps.length}</span>
        </div>
        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(step / steps.length) * 100}%` }}
            className="h-full bg-indigo-600"
          />
        </div>
      </div>

      <div className="glass p-8 rounded-3xl border-slate-100 space-y-8">
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50 rounded-xl w-fit text-indigo-600">
            {currentStepData.icon}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {currentStepData.question}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {currentStepData.options.map((option) => {
            const isSelected = context[currentStepData.id as keyof CandidateContext] === option;
            return (
              <button
                key={option}
                onClick={() => handleOptionSelect(option)}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
                  isSelected 
                    ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/20 shadow-[0_4px_20px_rgba(6,182,212,0.15)]" 
                    : "border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200"
                }`}
              >
                <span className={`font-medium transition-colors ${
                  isSelected ? "text-cyan-900" : "text-slate-700 group-hover:text-cyan-600"
                }`}>{option}</span>
                <ChevronRight className={`w-4 h-4 transition-colors ${
                  isSelected ? "text-cyan-600" : "text-slate-500 group-hover:text-cyan-600"
                }`} />
              </button>
            );
          })}
        </div>

        {step === steps.length && context.interviewType && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-6"
          >
            <button
              onClick={onComplete}
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Starting..." : "Start Interview Simulation"}
              {!isProcessing && <ChevronRight className="w-5 h-5" />}
            </button>
          </motion.div>
        )}
      </div>

      {step > 1 && (
        <button 
          onClick={() => setStep(step - 1)}
          className="text-[10px] font-mono text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest flex items-center gap-2 mx-auto"
        >
          <ChevronRight className="w-3 h-3 rotate-180" />
          Previous Step
        </button>
      )}
    </motion.div>
  );
}

function InterviewRoom({ 
  videoRef, 
  currentQuestion, 
  transcript, 
  isListening, 
  isProcessing,
  startListening, 
  stopListening, 
  onSubmit,
  history,
  questionCount,
  totalQuestions,
  cameraError
}: {
  videoRef: (node: HTMLVideoElement | null) => void,
  currentQuestion: string,
  transcript: string,
  isListening: boolean,
  isProcessing: boolean,
  startListening: () => void,
  stopListening: () => void,
  onSubmit: () => void,
  history: InterviewMessage[],
  questionCount: number,
  totalQuestions: number,
  cameraError: string | null
}) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepCountdown, setPrepCountdown] = useState(10);
  const prepTimeLimit = 10;
  
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    if (currentQuestion) {
      if (isListening) stopListening();
      setIsPreparing(true);
      setPrepCountdown(prepTimeLimit);
    }
  }, [currentQuestion]);

  useEffect(() => {
    let timer: any;
    if (isPreparing && prepCountdown > 0 && !isProcessing) {
      timer = setTimeout(() => {
        setPrepCountdown(c => c - 1);
      }, 1000);
    } else if (isPreparing && prepCountdown === 0 && !isProcessing) {
      setIsPreparing(false);
      startListening();
    }
    return () => clearTimeout(timer);
  }, [isPreparing, prepCountdown, startListening, isProcessing]);

  useEffect(() => {
    let timer: any;
    if (isListening && !isPreparing) {
      timer = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(timer);
  }, [isListening, isPreparing]);

  const handleStartNow = () => {
    setIsPreparing(false);
    startListening();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 h-full max-h-[85vh]"
    >
      {/* Main Interview Area */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex-1 relative rounded-3xl overflow-hidden bg-white/70 backdrop-blur-xl border border-slate-100 flex flex-col items-center justify-center p-12 text-center shadow-sm">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05]" />
          </div>

          <div className="absolute top-8 left-8 flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-100 shadow-sm z-10">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-indigo-200">
              {questionCount}
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Question {questionCount} of {totalQuestions}</span>
          </div>

          <div className="space-y-10 max-w-xl relative z-10">
            <div className="flex justify-center">
              <div className="relative">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1], 
                    rotate: [0, 90, 180, 270, 360],
                    opacity: [0.2, 0.4, 0.2] 
                  }}
                  transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 blur-3xl rounded-full" 
                />
                <div className="relative p-6 bg-slate-100 rounded-2xl border border-slate-200 shadow-xl">
                  <Logo className="w-12 h-12" />
                </div>
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="space-y-4"
              >
                <h2 className="text-3xl md:text-4xl font-bold leading-tight text-slate-900 tracking-tight">
                  {currentQuestion}
                </h2>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                        className="w-full h-full bg-indigo-400/30"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {isPreparing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center"
              >
                <div className="text-4xl font-black text-indigo-600 mb-2">{prepCountdown}</div>
                <p className="text-sm text-indigo-800 font-medium font-mono uppercase tracking-widest mb-4">
                  Prepare your answer...
                </p>
                <button
                  onClick={handleStartNow}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-md hover:bg-indigo-700 transition"
                >
                  Start Answer Now
                </button>
              </motion.div>
            )}
            
            {isListening && !isPreparing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 inline-flex items-center gap-3 bg-red-50 border border-red-100 rounded-full px-6 py-3"
              >
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono font-bold text-red-600 text-lg">
                  {formatTime(recordingTime)}
                </span>
                <span className="text-sm font-medium text-red-800 ml-2">Recording Response</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar: Video & History */}
      <div className="flex flex-col gap-6">
        <div className="aspect-video rounded-3xl overflow-hidden border border-slate-100 shadow-xl relative group video-glow bg-slate-100 flex items-center justify-center">
          {cameraError ? (
            <div className="text-center p-6 space-y-4 z-20">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm font-medium text-red-200">{cameraError}</p>
              <p className="text-xs text-slate-500">The interview will continue without video.</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-900 rounded-lg text-sm font-medium transition-colors"
              >
                Reload to Retry
              </button>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover mirror opacity-90 group-hover:opacity-100 transition-opacity absolute inset-0"
            />
          )}
          <div className="absolute inset-0 border-[12px] border-white/5 pointer-events-none z-10" />
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 border border-white/10 z-20">
            <div className={`w-2 h-2 rounded-full animate-pulse ${cameraError ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`} />
            <span className="text-slate-900">{cameraError ? 'Feed Error' : 'Secure Feed'}</span>
          </div>
          
          {/* Corner accents */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/20 m-4 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/20 m-4 rounded-bl-lg" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] text-center">
            Biometric Verification Active
          </p>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <motion.div 
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                className="w-1 h-1 bg-indigo-500 rounded-full"
              />
            ))}
          </div>
        </div>

        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-600 rounded-2xl p-6 text-slate-900 shadow-xl shadow-indigo-200 relative overflow-hidden"
          >
            <motion.div 
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
            <div className="flex items-center gap-4 relative z-10">
              <RefreshCcw className="w-6 h-6 animate-spin" />
              <div className="space-y-1">
                <p className="text-xs font-mono uppercase tracking-widest opacity-80">Neural Engine</p>
                <p className="text-sm font-bold">Synthesizing Response...</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
          {isListening && !isPreparing && (
            <div className="absolute inset-0 pointer-events-none">
              <motion.div 
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-red-100/30"
              />
            </div>
          )}
          
          <div className="flex flex-col gap-4 relative z-10 w-full">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isListening && !isPreparing ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Voice Link</span>
              </div>
              <div className="flex items-center h-4">
                {isListening && !isPreparing ? (
                  <div className="flex gap-[2px] items-end h-4">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [4, Math.random() * 12 + 4, 4] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                        className="w-[3px] bg-red-400 rounded-full"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-600 font-medium italic">
                    {isPreparing ? "Initializing..." : "Waiting"}
                  </p>
                )}
              </div>
            </div>

            <motion.button
              whileHover={!(isPreparing || isProcessing) ? { scale: 1.02, boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.2)" } : {}}
              whileTap={!(isPreparing || isProcessing) ? { scale: 0.98 } : {}}
              onClick={isListening && !isPreparing ? onSubmit : undefined}
              disabled={isProcessing || isPreparing || (!isListening && !isPreparing)}
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                isListening && !isPreparing
                  ? 'bg-red-600 text-white shadow-red-200' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              } disabled:opacity-50`}
            >
              <div className="relative">
                <Square className="w-4 h-4 fill-current" />
              </div>
              Stop Answer
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingReportPhase() {
  const steps = [
    "Sequencing communication patterns...",
    "Analyzing emotional intelligence...",
    "Evaluating stress response...",
    "Synthesizing soft skill DNA...",
    "Generating final hireability report..."
  ];
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="relative w-64 h-64 mb-12">
        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="absolute inset-0 border-t-4 border-indigo-600 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo className="w-24 h-24 animate-pulse" />
        </div>
      </div>
      
      <div className="space-y-6 max-w-md">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Synthesizing Your <span className="text-indigo-600">DNA Report</span></h2>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 3 }}
            className="h-full bg-indigo-600"
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.p 
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-slate-500 font-mono text-sm uppercase tracking-widest"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}function ReportPage({ report, onRestart }: { report: SkillSynthReport, onRestart: () => void }) {
  const skillData = Object.entries(report.skillRatings).map(([name, value]) => ({
    name: name.replace(/([A-Z])/g, ' $1').toUpperCase(),
    value
  }));

  const pieData = [
    { name: 'Technical', value: report.competencyBreakdown.technical },
    { name: 'Behavioral', value: report.competencyBreakdown.behavioral },
    { name: 'Situational', value: report.competencyBreakdown.situational },
    { name: 'Communication', value: report.competencyBreakdown.communication },
  ];

  const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-7xl space-y-12 py-16 px-6 relative"
    >
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <Logo className="w-16 h-16" />
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-mono uppercase tracking-widest"
        >
          Analysis Complete
        </motion.div>
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
          SkillSynth <span className="text-gradient">DNA Report</span>
        </h2>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Comprehensive multi-dimensional sequencing of your professional persona and soft skill architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Score Card */}
        <div className="lg:col-span-4 glass3d p-10 rounded-[3rem] border border-cyan-500/20 flex flex-col items-center justify-center space-y-8 relative group min-h-[450px]">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="112" cy="112" r="100"
                fill="none" stroke="currentColor" strokeWidth="16"
                className="text-slate-100"
              />
              <motion.circle
                cx="112" cy="112" r="100"
                fill="none" stroke="currentColor" strokeWidth="16"
                strokeDasharray={628.3}
                initial={{ strokeDashoffset: 628.3 }}
                animate={{ strokeDashoffset: 628.3 - (628.3 * report.hireabilityScore) / 100 }}
                transition={{ duration: 2, ease: "circOut" }}
                strokeLinecap="round"
                className="text-indigo-600"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-7xl font-bold tracking-tighter text-slate-900">{report.hireabilityScore}</span>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Hireability Index</span>
            </div>
          </div>
          
          <div className="text-center space-y-3 relative">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em]">Persona Classification</p>
            <div className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-lg font-bold shadow-xl shadow-indigo-200">
              {report.personalityTag}
            </div>
          </div>
        </div>

        {/* Skill Bar Chart */}
        <div className="lg:col-span-8 glass3d p-10 rounded-[3rem] border border-indigo-500/20 space-y-8 relative flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Award className="w-6 h-6 text-indigo-600" />
              </div>
              Skill DNA Sequencing
            </h3>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Performance Metrics</div>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 10]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                  width={120}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#4f46e5" 
                  radius={[0, 10, 10, 0]} 
                  barSize={24}
                >
                  {skillData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Competency Pie Chart */}
        <div className="lg:col-span-5 glass3d p-10 rounded-[3rem] border border-purple-500/20 space-y-8 relative flex flex-col">
          <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            Competency Mix
          </h3>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Behavioral Insights */}
        <div className="lg:col-span-7 glass3d p-10 rounded-[3rem] border border-slate-200/50 space-y-10 relative">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <Brain className="w-6 h-6 text-emerald-600" />
              </div>
              Psychological Profile
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Emotional Intelligence</span>
                <p className="text-slate-700 leading-relaxed text-sm">{report.emotionalIntelligence}</p>
              </div>
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Stress Handling</span>
                <p className="text-slate-700 leading-relaxed text-sm">{report.stressHandling}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
              <div className="p-2 bg-amber-50 rounded-xl">
                <Zap className="w-6 h-6 text-amber-600" />
              </div>
              Role Fit Analysis
            </h3>
            <p className="text-slate-700 leading-relaxed bg-amber-50/30 p-6 rounded-3xl border border-amber-100/50">
              {report.roleFitAnalysis}
            </p>
          </div>
        </div>
      </div>

      {/* AI Suggestions Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <Sparkles className="w-8 h-8 text-slate-900" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">AI-Powered Growth Suggestions</h3>
            <p className="text-slate-500">Personalized action items to elevate your professional DNA.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {report.detailedAISuggestions.map((suggestion, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass3d p-8 rounded-[2.5rem] border border-slate-200/50 space-y-6 flex flex-col"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">{suggestion.title}</h4>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed flex-1">
                {suggestion.description}
              </p>
              <div className="space-y-3 pt-4 border-t border-slate-50">
                {suggestion.actionItems.map((item, j) => (
                  <div key={j} className="flex items-start gap-3 text-xs text-slate-700">
                    <div className="p-0.5 bg-emerald-100 rounded-full mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              {suggestion.resources && suggestion.resources.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recommended Resources</p>
                  <div className="space-y-2">
                    {suggestion.resources.map((resource, j) => (
                      <a 
                        key={j} 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 hover:underline bg-indigo-50/50 p-2 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{resource.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass3d p-10 rounded-[3rem] border border-emerald-500/20 space-y-6">
          <h3 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            Core Strengths
          </h3>
          <ul className="space-y-4">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 text-slate-700 font-medium">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass3d p-10 rounded-[3rem] border border-red-500/20 space-y-6">
          <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Growth Areas
          </h3>
          <ul className="space-y-4">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-red-50/50 border border-red-100/50 text-slate-700 font-medium">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onRestart}
          className="px-12 py-5 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-white transition-all shadow-2xl shadow-slate-200 flex items-center gap-3 group"
        >
          <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          Start New Simulation
        </button>
      </div>
    </motion.div>
  );
}
