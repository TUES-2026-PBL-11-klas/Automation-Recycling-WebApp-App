import Link from "next/link";
import { Recycle, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-24 relative overflow-hidden">
      {/* Background blobs for premium feeling */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="z-10 flex flex-col items-center text-center animate-slide-up max-w-4xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full mb-8">
          <Recycle size={18} />
          <span className="text-sm font-semibold tracking-wide">Smart Recycling Automation</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8">
          <span className="text-white">Transform</span> E-Waste into <br />
          <span className="heading-gradient leading-tight">Sustainable Future</span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-2xl mb-12 max-w-2xl leading-relaxed">
          Schedule, track, and manage your electronic waste recycling seamlessly. Join thousands of users making the world a cleaner place.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 w-full justify-center">
          <Link href="/register" className="px-8 py-4 bg-primary text-primary-foreground text-lg font-semibold rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 flex justify-center items-center gap-2">
            Get Started
            <ArrowRight size={20} />
          </Link>
          <Link href="/login" className="px-8 py-4 glass-card text-white text-lg font-semibold rounded-full hover:-translate-y-1 transition-all duration-300 flex justify-center items-center">
            Sign In
          </Link>
        </div>

        <Link href="/contact" className="mt-8 text-muted-foreground hover:text-primary transition-colors duration-300 text-sm font-medium">
          Have questions? Contact Us →
        </Link>
      </main>
    </div>
  );
}
