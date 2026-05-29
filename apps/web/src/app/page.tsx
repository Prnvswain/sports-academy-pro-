'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'framer-motion';

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  ChevronRight,
  GraduationCap,
  Layers,
  Lock,
  Shield,
  Sparkles,
  Users,
  LayoutDashboard,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.55 },
  },
};

function Section({
  id, className, children,
}: {
  id?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn('relative px-5 py-20 sm:px-8 lg:px-14', className)}>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={item}
      className={className}
      viewport={{ once: true, margin: '-100px' }}
      initial="hidden"
      whileInView="show"
    >
      {children}
    </motion.div>
  );
}

const CARD_COLORS = [
  { icon: 'bg-blue-500',   card: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-600' },
  { icon: 'bg-teal-500',   card: 'bg-teal-50',   border: 'border-teal-100',   text: 'text-teal-700',   badge: 'bg-teal-100 text-teal-600' },
  { icon: 'bg-orange-500', card: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-600' },
  { icon: 'bg-purple-500', card: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-600' },
  { icon: 'bg-red-500',    card: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-700',    badge: 'bg-red-100 text-red-600' },
  { icon: 'bg-green-500',  card: 'bg-green-50',  border: 'border-green-100',  text: 'text-green-700',  badge: 'bg-green-100 text-green-600' },
];

function FeatureCard({
  title, description, icon: Icon, badge, idx,
}: {
  title: string; description: string; icon: React.ElementType; badge?: string; idx: number;
}) {
  const c = CARD_COLORS[idx % CARD_COLORS.length];
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`
        group relative overflow-hidden rounded-2xl border ${c.border} ${c.card}
        p-6 shadow-sm transition-shadow hover:shadow-md
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${c.icon} shadow-sm`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-bold text-base ${c.text}`}>{title}</p>
            {badge && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badge}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

function SyllabusExplorer() {
  const [tab, setTab] = useState<'class' | 'subject' | 'chapter'>('class');

  const nodes = useMemo(() => {
    if (tab === 'class') return [
      { key: 'c9',  label: 'Class 9',  meta: '3 subjects', color: CARD_COLORS[0], progress: null },
      { key: 'c10', label: 'Class 10', meta: '4 subjects', color: CARD_COLORS[1], progress: null },
      { key: 'c8',  label: 'Class 8',  meta: '2 subjects', color: CARD_COLORS[2], progress: null },
    ];
    if (tab === 'subject') return [
      { key: 'math',    label: 'Mathematics', meta: '12 chapters', color: CARD_COLORS[0], progress: null },
      { key: 'science', label: 'Science',     meta: '10 chapters', color: CARD_COLORS[1], progress: null },
      { key: 'english', label: 'English',     meta: '8 chapters',  color: CARD_COLORS[3], progress: null },
    ];
    return [
      { key: 'ch1', label: 'Chapter 1: Algebra Foundations',    meta: '75% complete', color: CARD_COLORS[1], progress: 75 },
      { key: 'ch2', label: 'Chapter 2: Geometry Matrices',      meta: '42% complete', color: CARD_COLORS[0], progress: 42 },
      { key: 'ch3', label: 'Chapter 3: Complex Trigonometry',   meta: '18% complete', color: CARD_COLORS[2], progress: 18 },
    ];
  }, [tab]);

  const tabs = ['class', 'subject', 'chapter'] as const;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Syllabus Explorer</p>
          <p className="text-xs text-blue-100">Browse classes, subjects &amp; chapters</p>
        </div>
      </div>

      {/* Tab bar — suppressHydrationWarning stops extension fdprocessedid mismatch */}
      <div className="relative flex border-b border-gray-100 bg-gray-50" suppressHydrationWarning>
        {tabs.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            suppressHydrationWarning
            className={cn(
              'relative flex-1 py-3 text-center text-sm font-semibold capitalize transition-colors',
              tab === k ? 'text-[#1a73e8]' : 'text-gray-400 hover:text-gray-600',
            )}
          >
            {k === 'class' ? 'Classes' : k === 'subject' ? 'Subjects' : 'Chapters'}
          </button>
        ))}
        <motion.div
          layout
          className="absolute bottom-0 h-[2px] w-1/3 bg-[#1a73e8] transition-all duration-300"
          style={{ left: tab === 'class' ? '0%' : tab === 'subject' ? '33.33%' : '66.66%' }}
        />
      </div>

      <motion.div layout className="grid gap-3 p-5">
        {nodes.map((n) => (
          <motion.div
            key={n.key}
            layout
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`
              rounded-xl border ${n.color.border} ${n.color.card}
              p-4 transition-shadow hover:shadow-sm
            `}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.color.icon}`}>
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${n.color.text}`}>{n.label}</p>
                  <p className="text-xs text-gray-400">{n.meta}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${n.color.badge}`}>
                Active
              </span>
            </div>
            {n.progress !== null && (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/60">
                  <div
                    className={`h-full rounded-full ${n.color.icon} transition-all`}
                    style={{ width: `${n.progress}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f0f4f8] text-gray-800">

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[700px] rounded-full bg-[radial-gradient(circle_at_center,rgba(26,115,232,0.10),transparent_65%)] blur-3xl" />
        <div className="absolute top-[30%] right-[-10%] h-[400px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(52,168,83,0.08),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[5%] left-[10%] h-[400px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(21,88,176,0.07),transparent_65%)] blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1558b0] shadow-md">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#1a73e8] leading-tight">SyllabusTracker</p>
              <p className="text-[10px] text-gray-400 leading-tight">Academic Management Platform</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {['Features', 'Dashboard', 'Security'].map((label) => (
              <Link
                key={label}
                href={`#${label.toLowerCase()}`}
                className="text-sm font-medium text-gray-500 transition hover:text-[#1a73e8]"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:text-[#1a73e8] transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#34a853] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#2d9249] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <Section className="pt-20">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid items-center gap-14 lg:grid-cols-2"
        >
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1a73e8]">
                <Sparkles className="h-3.5 w-3.5" />
                Academic Intelligence Platform
              </span>
            </Reveal>

            <Reveal className="mt-6">
              <h1 className="max-w-2xl text-5xl font-black leading-tight tracking-tight text-gray-900 sm:text-6xl">
                The Smart Operating System for{' '}
                <span className="bg-gradient-to-r from-[#1a73e8] via-[#34a853] to-[#1558b0] bg-clip-text text-transparent">
                  Educational Excellence
                </span>
              </h1>
            </Reveal>

            <Reveal className="mt-5">
              <p className="max-w-xl text-lg leading-relaxed text-gray-500">
                Real-time syllabus tracking, chapter-level analytics, and structured workflows that give admins full visibility — before delivery becomes a problem.
              </p>
            </Reveal>

            <Reveal className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-7 text-base font-semibold text-white shadow-md hover:bg-[#1558b0] transition-colors"
              >
                Launch Platform
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-7 text-base font-semibold text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
              >
                Explore Features
              </Link>
            </Reveal>

            <Reveal className="mt-9">
              <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#34a853]" />
                  Enterprise Security
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#1a73e8]" />
                  Multi-Tenant Architecture
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  AI Analytics
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <SyllabusExplorer />
          </Reveal>
        </motion.div>
      </Section>

      {/* Features */}
      <Section id="features">
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <Reveal>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                Platform Modules
              </span>
              <h2 className="mt-4 text-4xl font-black text-gray-900">
                Everything You Need, In One Dashboard
              </h2>
              <p className="mt-3 text-gray-500">
                Every module is purpose-built for academic workflows — from institution management to chapter-level tracking.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[
              { title: 'Institution Control',   description: 'Centralized organization management with scalable role-based access control layers.',         icon: Building2,     badge: 'Enterprise',  idx: 0 },
              { title: 'Student Analytics',     description: 'Track progression metrics, chapter completion ratios, and syllabus delivery velocity.',       icon: BarChart3,     badge: 'Analytics',   idx: 1 },
              { title: 'Faculty Management',    description: 'Advanced teacher coordination with automated assignment and distribution pipelines.',         icon: Users,         badge: 'Team',        idx: 2 },
              { title: 'Curriculum Matrix',     description: 'Dynamic syllabus structures powered by adaptive nested academic entities.',                   icon: BookOpen,      badge: 'Smart Map',   idx: 3 },
              { title: 'Security Protocol',     description: 'Encrypted tenant isolation architecture with institutional verification systems.',            icon: Lock,          badge: 'Zero Trust',  idx: 4 },
              { title: 'Academic Intelligence', description: 'Predictive operational insights generated through real-time educational telemetry.',          icon: GraduationCap, badge: 'AI Powered',  idx: 5 },
            ].map((f) => (
              <Reveal key={f.title}>
                <FeatureCard {...f} />
              </Reveal>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* Dashboard Preview */}
      <Section id="dashboard">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <div className="flex flex-col gap-5 border-b border-gray-100 bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">Platform Overview</p>
                  <p className="text-xs text-blue-100">Real-time academic monitoring</p>
                </div>
              </div>
              <div className="flex w-full max-w-sm items-center gap-2">
                <Input
                  placeholder="Search institution..."
                  className="rounded-lg border-white/20 bg-white/10 text-white placeholder:text-blue-200 focus:border-white focus:ring-white/30"
                />
                <button
                  suppressHydrationWarning
                  className="rounded-lg bg-[#34a853] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#2d9249] transition-colors whitespace-nowrap"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Active Institutions</p>
                    <p className="mt-2 text-4xl font-black text-gray-800">128</p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-600 border border-green-200">
                      +18.2% Growth
                    </span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-teal-100 bg-teal-50 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Completion Efficiency</p>
                    <p className="mt-2 text-4xl font-black text-gray-800">84%</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 shadow-sm">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/60">
                  <div className="h-full w-[84%] rounded-full bg-teal-500 transition-all" />
                </div>
              </div>

              <div className="rounded-xl border border-green-100 bg-green-50 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Platform Health</p>
                    <p className="mt-2 text-4xl font-black text-gray-800">96</p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-600 border border-green-200">
                      All Systems Stable
                    </span>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 shadow-sm">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* CTA / Security */}
      <Section id="security">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg">
            <div className="bg-gradient-to-r from-[#1a73e8] to-[#1558b0] px-8 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white">
                  Production Ready Infrastructure
                </span>
              </div>
              <h2 className="text-3xl font-black leading-tight text-white max-w-2xl">
                Deploy Your Academic Ecosystem With Enterprise-Grade Reliability
              </h2>
            </div>

            <div className="px-8 py-6">
              <p className="text-base leading-relaxed text-gray-500 max-w-2xl">
                Architected using Next.js 15, Prisma ORM, isolated MySQL node systems, and scalable cloud-native deployment pipelines. Built for schools of any size.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1a73e8] px-6 text-sm font-bold text-white shadow hover:bg-[#1558b0] transition-colors"
                >
                  Start Deployment
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  suppressHydrationWarning
                  className="inline-flex h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-6 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 text-sm text-gray-400 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-14">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a73e8] to-[#1558b0]">
              <GraduationCap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-500">
              © {new Date().getFullYear()} SyllabusTracker
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {['Security Protocol', 'API Integration', 'System Status'].map((label) => (
              <Link key={label} href="/" className="hover:text-[#1a73e8] transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}