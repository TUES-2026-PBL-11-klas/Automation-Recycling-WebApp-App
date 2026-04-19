'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { registerUser } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      router.push('/login?registered=true');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md animate-slide-up z-10 glass-card p-10 rounded-3xl">
        <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-muted-foreground mb-8">Join the green revolution today.</p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="relative">
            <User className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input 
              type="text" 
              name="name"
              placeholder="Full Name"
              className="w-full bg-secondary/50 border border-border rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input 
              type="email" 
              name="email"
              placeholder="Email address"
              className="w-full bg-secondary/50 border border-border rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input 
              type="tel" 
              name="phoneNumber"
              placeholder="Phone Number (optional)"
              className="w-full bg-secondary/50 border border-border rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input 
              type="password" 
              name="password"
              placeholder="Password"
              className="w-full bg-secondary/50 border border-border rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          {registerMutation.isError && (
            <p className="text-destructive text-sm">{registerMutation.error.message}</p>
          )}

          <button 
            type="submit" 
            disabled={registerMutation.isPending}
            className="w-full bg-accent text-accent-foreground font-semibold rounded-xl py-4 shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {registerMutation.isPending ? <Loader2 className="animate-spin" /> : 'Register'}
          </button>
        </form>
        
        <p className="text-center text-muted-foreground mt-8 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-accent font-medium hover:underline hover:text-white transition-colors">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
