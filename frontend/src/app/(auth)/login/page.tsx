'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { loginUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.access_token);
      router.push('/dashboard'); 
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md animate-slide-up z-10 glass-card p-10 rounded-3xl">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-muted-foreground mb-8">Sign in to continue your recycling journey.</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input 
              type="email" 
              placeholder="Email address"
              className="w-full bg-secondary/50 border border-border rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input 
              type="password" 
              placeholder="Password"
              className="w-full bg-secondary/50 border border-border rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {loginMutation.isError && (
            <p className="text-destructive text-sm">{loginMutation.error.message}</p>
          )}

          <button 
            type="submit" 
            disabled={loginMutation.isPending}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-4 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loginMutation.isPending ? <Loader2 className="animate-spin" /> : 'Log In'}
          </button>
        </form>
        
        <p className="text-center text-muted-foreground mt-8 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary font-medium hover:underline hover:text-white transition-colors">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
