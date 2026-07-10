import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import ThemeToggle from '../../components/ThemeToggle';
import {
  Building2,
  User,
  Users,
  Shield,
  ArrowRight,
} from 'lucide-react';

const loginOptions = [
  {
    title: 'Admin',
    description: 'Academy administrators and staff',
    icon: Building2,
    path: '/login/admin',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    title: 'Coach',
    description: 'Coaches and trainers',
    icon: User,
    path: '/coach/login',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  {
    title: 'Parent',
    description: 'Parents and guardians',
    icon: Users,
    path: '/parent/login',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
];

export default function LoginPage() {
  return (
    <div className="bg-surface text-foreground min-h-screen">
      <Navbar>
        <Link to="/" className="text-sm font-medium text-muted hover:text-foreground">
          Home
        </Link>
        <Link to="/signup" className="text-sm font-medium text-muted hover:text-foreground">
          Sign Up
        </Link>
        <ThemeToggle />
      </Navbar>

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Welcome Back</h1>
            <p className="text-muted mx-auto mt-4 max-w-md text-sm sm:text-base">
              Select your role to continue to your workspace
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {loginOptions.map((option) => (
              <Link
                key={option.path}
                to={option.path}
                className="group"
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`card bg-surface-secondary border-border/80 hover:border-accent/30 h-full border p-6 shadow-sm transition-all duration-300 hover:shadow-md ${option.borderColor}`}
                >
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${option.bgColor} ${option.color}`}>
                    <option.icon className="h-6 w-6" />
                  </div>
                  <h3 className={`text-foreground mb-2 text-lg font-black tracking-tight ${option.color}`}>
                    {option.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">
                    {option.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <p className="text-muted text-sm">
              New academy?{' '}
              <Link to="/signup" className="font-semibold text-accent hover:underline">
                Create your account
              </Link>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
