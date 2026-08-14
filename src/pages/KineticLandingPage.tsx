import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Shield, Play, LayoutDashboard, ExternalLink } from 'lucide-react';
import { RotatingScrollIndicator } from '../components/kinetic/RotatingScrollIndicator';
import { BrutalistServiceCard } from '../components/kinetic/BrutalistServiceCard';

export const KineticLandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLaunchControlCenter = () => {
    navigate('/control-center');
  };

  const handleRunSimulation = () => {
    navigate('/simulation');
  };

  return (
    <div className="kinetic-theme min-h-screen bg-[#FF4D00] text-black font-inter selection:bg-black selection:text-[#FF4D00] overflow-x-hidden">
      
      {/* ─── FLOATING NAVIGATION ────────────────────────────────────────────── */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4 md:px-8 flex items-center justify-between pointer-events-none">
        {/* Logo Left */}
        <div className="pointer-events-auto flex items-center gap-2 bg-black text-white px-4 py-2 font-archivo text-lg tracking-tight uppercase shadow-2xl">
          <Shield className="w-5 h-5 text-[#FF4D00] fill-[#FF4D00]" />
          <span>RESQ<span className="text-[#FF4D00]">AI</span></span>
        </div>

        {/* Center Floating Black Pill Navigation */}
        <nav className="pointer-events-auto flex items-center gap-1.5 bg-black text-white rounded-full px-4 py-2 border border-white/20 shadow-2xl overflow-x-auto max-w-full">
          <Link
            to="/control-center"
            className="font-space text-[12px] tracking-[-0.02em] uppercase text-white/90 hover:text-black hover:bg-white px-3 py-1 rounded-full transition-colors duration-200 whitespace-nowrap"
          >
            Control Center
          </Link>
          <Link
            to="/driver"
            className="font-space text-[12px] tracking-[-0.02em] uppercase text-[#FF4D00] hover:text-black hover:bg-[#FF4D00] px-3 py-1 rounded-full font-bold transition-colors duration-200 whitespace-nowrap"
          >
            Driver Panel
          </Link>
          <Link
            to="/simulation"
            className="font-space text-[12px] tracking-[-0.02em] uppercase text-white/90 hover:text-black hover:bg-white px-3 py-1 rounded-full transition-colors duration-200 whitespace-nowrap"
          >
            Simulation
          </Link>
          <Link
            to="/analytics"
            className="font-space text-[12px] tracking-[-0.02em] uppercase text-white/90 hover:text-black hover:bg-white px-3 py-1 rounded-full transition-colors duration-200 whitespace-nowrap"
          >
            Analytics
          </Link>
          <Link
            to="/incidents"
            className="font-space text-[12px] tracking-[-0.02em] uppercase text-white/90 hover:text-black hover:bg-white px-3 py-1 rounded-full transition-colors duration-200 whitespace-nowrap"
          >
            Incidents
          </Link>
          <Link
            to="/resources"
            className="font-space text-[12px] tracking-[-0.02em] uppercase text-white/90 hover:text-black hover:bg-white px-3 py-1 rounded-full transition-colors duration-200 whitespace-nowrap"
          >
            Fleet Pool
          </Link>
        </nav>

        {/* Right Status Badge */}
        <div className="pointer-events-auto flex items-center gap-2 bg-black text-white px-3.5 py-2 font-space text-[11px] uppercase tracking-tight shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>v1.0 • SYSTEM OPERATIONAL</span>
        </div>
      </header>

      {/* ─── TYPOGRAPHIC HERO SECTION ───────────────────────────────────────── */}
      <section className="min-h-screen pt-32 pb-12 px-4 md:px-12 flex flex-col justify-between border-b-2 border-black">
        {/* Top Tagline */}
        <div className="flex justify-between items-center font-space text-xs uppercase tracking-tight font-bold border-b-2 border-black pb-4">
          <span>[ EMERGENCY DECISION SUPPORT ]</span>
          <span>INTELLIGENT FLEET ALLOCATION</span>
        </div>

        {/* Giant Main Headline */}
        <div className="my-auto py-8 text-center">
          <h1 className="font-archivo uppercase text-black text-[16vw] leading-[0.85] tracking-[-0.04em] select-none drop-shadow-sm">
            RESQAI
          </h1>
          <p className="font-space font-bold uppercase text-black text-sm sm:text-base md:text-xl tracking-tight mt-4 max-w-4xl mx-auto">
            Dynamic Emergency Response & Resource Reallocation Engine
          </p>
        </div>

        {/* Hero Metadata Row separated by 2px black border */}
        <div className="border-t-2 border-black pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Left Metadata */}
          <div className="font-space text-xs md:text-sm font-bold uppercase tracking-[-0.02em] space-y-1">
            <div className="text-black/70">BASED IN HYDERABAD, IN</div>
            <div className="text-black">EST. 2026 • HACKATHON EDITION</div>
            <div className="text-black/80 font-inter font-normal normal-case text-xs pt-1">
              "When emergencies escalate simultaneously, ResQAI prioritizes incidents and allocates response units."
            </div>
          </div>

          {/* Center Rotating Circle */}
          <div className="flex justify-center my-4 md:my-0">
            <RotatingScrollIndicator />
          </div>

          {/* Right Role / CTA buttons */}
          <div className="flex flex-col gap-3 items-start md:items-end">
            <button
              onClick={handleLaunchControlCenter}
              className="w-full sm:w-auto font-space font-bold text-xs uppercase bg-black text-white px-6 py-3.5 rounded-full hover:scale-105 transition-transform duration-200 flex items-center justify-center gap-2 shadow-xl"
            >
              <LayoutDashboard className="w-4 h-4 text-[#FF4D00]" />
              ENTER CONTROL CENTER →
            </button>
            <button
              onClick={handleRunSimulation}
              className="w-full sm:w-auto font-space font-bold text-xs uppercase border-2 border-black bg-transparent text-black px-6 py-3 rounded-full hover:bg-black hover:text-white transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              RUN SIMULATION
            </button>
          </div>
        </div>
      </section>

      {/* ─── SKEWED MARQUEE SECTION ─────────────────────────────────────────── */}
      <section className="bg-black text-white my-12 transform -skew-y-2 overflow-hidden py-10 md:py-14 border-y-2 border-black shadow-2xl">
        <div className="transform skew-y-2 space-y-4">
          {/* Row 1: Orange text (#FF4D00) Archivo Black 10vw forward */}
          <div className="overflow-hidden whitespace-nowrap">
            <div className="animate-marquee-left">
              <span className="font-archivo text-[#FF4D00] text-[10vw] uppercase leading-none tracking-[-0.04em] mr-8">
                DYNAMIC ALLOCATION • PRIORITY INTELLIGENCE • EMERGENCY SURGE ENGINE • PARETO REALLOCATION •
              </span>
              <span className="font-archivo text-[#FF4D00] text-[10vw] uppercase leading-none tracking-[-0.04em] mr-8">
                DYNAMIC ALLOCATION • PRIORITY INTELLIGENCE • EMERGENCY SURGE ENGINE • PARETO REALLOCATION •
              </span>
            </div>
          </div>

          {/* Row 2: White text 80% opacity scrolling reverse */}
          <div className="overflow-hidden whitespace-nowrap">
            <div className="animate-marquee-right">
              <span className="font-archivo text-white/80 text-[7vw] uppercase leading-none tracking-[-0.04em] mr-8">
                REALTIME GIS ROUTING • DECISION SUPPORT • OPERATOR IN THE LOOP • ZERO DELAY •
              </span>
              <span className="font-archivo text-white/80 text-[7vw] uppercase leading-none tracking-[-0.04em] mr-8">
                REALTIME GIS ROUTING • DECISION SUPPORT • OPERATOR IN THE LOOP • ZERO DELAY •
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VERTICAL SERVICE / ENGINES LIST ────────────────────────────────── */}
      <section className="bg-black text-white py-20 px-4 md:px-12 border-t-2 border-black">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 border-b-2 border-white/20">
            <div>
              <span className="font-space text-xs font-bold text-[#FF4D00] uppercase tracking-widest block mb-2">
                [ PLATFORM CAPABILITIES ]
              </span>
              <h2 className="font-archivo text-4xl md:text-6xl uppercase tracking-[-0.04em] text-white">
                CORE INTELLIGENCE ENGINES
              </h2>
            </div>
            <p className="font-space text-xs text-slate-400 max-w-md mt-4 md:mt-0">
              ResQAI executes deterministic decision models to eliminate dispatch latency during multi-emergency surges.
            </p>
          </div>

          {/* Brutalist Cards List */}
          <div className="divide-y divide-white/20">
            <BrutalistServiceCard
              index="01"
              title="PRIORITY ENGINE"
              description="Computes explainable 0–100 risk scores from casualties, injury level, zone vulnerability, and waiting time."
              tags={['EXPLAINABLE AI', 'WEIGHTED RISK', 'DETERMINISTIC']}
              onClick={() => navigate('/control-center')}
            />
            <BrutalistServiceCard
              index="02"
              title="RESOURCE ALLOCATION"
              description="Evaluates fleet capability matching, travel distance, OSRM driving routes, and unit workload."
              tags={['CAPABILITY MATCHING', 'OSRM ROUTING', 'SUITABILITY SCORE']}
              onClick={() => navigate('/resources')}
            />
            <BrutalistServiceCard
              index="03"
              title="DYNAMIC REALLOCATION"
              description="Continuous conflict detection that recommends optimal resource reassignment when critical emergencies surge."
              tags={['PARETO OPTIMAL', 'CONFLICT DETECTION', 'QUALITY GAIN']}
              onClick={() => navigate('/reallocation')}
            />
            <BrutalistServiceCard
              index="04"
              title="CONTROL CENTER"
              description="Interactive command center with live Leaflet maps, priority incident queues, and alert toasts."
              tags={['REALTIME GIS', 'OPERATOR IN-THE-LOOP', 'LEAFLET MAPS']}
              onClick={() => navigate('/control-center')}
            />
            <BrutalistServiceCard
              index="05"
              title="EMERGENCY SIMULATION"
              description="Reproducible simulation runner with clock controls (start/pause/step) and isolated synthetic test scenarios."
              tags={['URBAN SURGE', 'ISOLATED RUNS', 'REPRODUCIBLE']}
              onClick={() => navigate('/simulation')}
            />
          </div>
        </div>
      </section>

      {/* ─── GIANT CTA AND FOOTER ───────────────────────────────────────────── */}
      <section className="bg-[#FF4D00] text-black py-24 px-4 md:px-12 border-t-2 border-black flex flex-col items-center justify-center text-center">
        <span className="font-space font-bold text-xs uppercase tracking-widest mb-4 bg-black text-[#FF4D00] px-4 py-1.5 rounded-full">
          READY FOR LIVE DEMONSTRATION
        </span>
        
        <h2 className="font-archivo text-[14vw] leading-[0.85] uppercase tracking-[-0.04em] mb-8">
          RESPOND FASTER
        </h2>

        {/* Large Rounded-Full Button */}
        <button
          onClick={handleLaunchControlCenter}
          className="bg-black text-white rounded-full px-10 py-6 text-lg sm:text-2xl font-space font-bold hover:scale-110 transition-transform duration-300 shadow-2xl flex items-center gap-4 group cursor-pointer border-2 border-black"
        >
          <span>LAUNCH CONTROL CENTER</span>
          <ArrowRight className="w-7 h-7 text-[#FF4D00] group-hover:translate-x-2 transition-transform" />
        </button>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#FF4D00] border-t-2 border-black py-8 px-4 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-space tracking-tight">
        <div>
          © 2026 RESQAI PLATFORM • ALL RIGHTS RESERVED
        </div>

        <div className="flex items-center gap-6">
          <Link to="/control-center" className="hover:underline font-bold">CONTROL CENTER</Link>
          <Link to="/simulation" className="hover:underline font-bold">SIMULATION</Link>
          <Link to="/analytics" className="hover:underline font-bold">ANALYTICS</Link>
          <a href="/docs/final-readiness-report.md" target="_blank" rel="noreferrer" className="hover:underline font-bold flex items-center gap-1">
            DOCS <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>

    </div>
  );
};

export default KineticLandingPage;
