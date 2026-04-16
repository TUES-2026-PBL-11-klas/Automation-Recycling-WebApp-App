'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  ArrowLeft,
  Clock,
  MessageSquare,
  Headphones,
  CheckCircle2,
} from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Replace with your actual API call to send the contact form
    // Example: await fetch('/api/contact', { method: 'POST', body: JSON.stringify(formData) });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ── Background decorative blobs ── */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-accent/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[50%] left-[60%] w-[25%] h-[25%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Top navigation bar ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-12 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors duration-300 group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform duration-300"
          />
          <span className="font-medium">Back to Home</span>
        </Link>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-12 pb-20">
        {/* ── Page header ── */}
        <header className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full mb-6">
            <MessageSquare size={16} />
            <span className="text-sm font-semibold tracking-wide">Get in Touch</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            <span className="heading-gradient">Contact Us</span>
          </h1>
          {/* ✏️ EDIT HERE: Replace the subtitle text below */}
          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Have a question about recycling, need support, or want to partner with us?
            We&apos;d love to hear from you.
          </p>
        </header>

        <div className="grid lg:grid-cols-5 gap-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* ── Left column – Contact Info Cards ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Email card */}
            <div className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center group-hover:bg-primary/25 transition-colors duration-300">
                  <Mail size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Email Us</h3>
                  {/* ✏️ EDIT HERE: Replace with your real email */}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    your-email@ecorecycle.com
                  </p>
                  {/* ✏️ EDIT HERE: Replace with your support email */}
                  <p className="text-muted-foreground text-sm">
                    support@ecorecycle.com
                  </p>
                </div>
              </div>
            </div>

            {/* Phone card */}
            <div className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/15 rounded-xl flex items-center justify-center group-hover:bg-accent/25 transition-colors duration-300">
                  <Phone size={22} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Call Us</h3>
                  {/* ✏️ EDIT HERE: Replace with your real phone number */}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    +1 (555) 123-4567
                  </p>
                  {/* ✏️ EDIT HERE: Replace with your secondary phone (or remove) */}
                  <p className="text-muted-foreground text-sm">
                    +1 (555) 987-6543
                  </p>
                </div>
              </div>
            </div>

            {/* Location card */}
            <div className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors duration-300">
                  <MapPin size={22} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Visit Us</h3>
                  {/* ✏️ EDIT HERE: Replace with your real address */}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    123 Green Street, Suite 400
                    <br />
                    Eco City, EC 10001
                  </p>
                </div>
              </div>
            </div>

            {/* Business hours card */}
            <div className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-500/15 rounded-xl flex items-center justify-center group-hover:bg-amber-500/25 transition-colors duration-300">
                  <Clock size={22} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Business Hours</h3>
                  {/* ✏️ EDIT HERE: Replace with your real business hours */}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Mon – Fri: 9:00 AM – 6:00 PM
                    <br />
                    Sat: 10:00 AM – 4:00 PM
                    <br />
                    Sun: Closed
                  </p>
                </div>
              </div>
            </div>

            {/* Support badge */}
            <div className="glass-card rounded-2xl p-5 flex items-center gap-4 border-primary/20">
              <Headphones size={24} className="text-primary flex-shrink-0" />
              {/* ✏️ EDIT HERE: Replace the support description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-white font-medium">24/7 Live Support</span> – Our
                dedicated team is always ready to help you with any recycling queries.
              </p>
            </div>
          </div>

          {/* ── Right column – Contact Form ── */}
          <div className="lg:col-span-3">
            <div className="glass-card rounded-3xl p-8 sm:p-10">
              {isSubmitted ? (
                /* ── Success state ── */
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                  <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} className="text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Message Sent!</h3>
                  {/* ✏️ EDIT HERE: Replace the success message */}
                  <p className="text-muted-foreground max-w-sm leading-relaxed">
                    Thank you for reaching out. Our team will get back to you within 24
                    hours.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="mt-8 px-6 py-3 bg-primary/15 text-primary rounded-xl font-medium hover:bg-primary/25 transition-colors duration-300"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                /* ── Form ── */
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <h2 className="text-2xl font-bold text-white mb-1">Send Us a Message</h2>
                  {/* ✏️ EDIT HERE: Replace the form subtitle */}
                  <p className="text-muted-foreground text-sm mb-3">
                    Fill out the form below and we&apos;ll respond as soon as possible.
                  </p>

                  {/* Name & Email row */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="contact-name" className="text-sm text-muted-foreground mb-1.5 block">
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        name="name"
                        placeholder="John Doe"
                        className="w-full bg-secondary/50 border border-border rounded-xl py-3.5 px-4 text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="text-sm text-muted-foreground mb-1.5 block">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        name="email"
                        placeholder="john@example.com"
                        className="w-full bg-secondary/50 border border-border rounded-xl py-3.5 px-4 text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Subject dropdown */}
                  <div>
                    <label htmlFor="contact-subject" className="text-sm text-muted-foreground mb-1.5 block">
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      className="w-full bg-secondary/50 border border-border rounded-xl py-3.5 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    >
                      {/* ✏️ EDIT HERE: Customize the subject options to match your needs */}
                      <option value="" disabled className="text-muted-foreground">
                        Select a subject
                      </option>
                      <option value="general" className="bg-secondary text-white">
                        General Inquiry
                      </option>
                      <option value="support" className="bg-secondary text-white">
                        Technical Support
                      </option>
                      <option value="recycling" className="bg-secondary text-white">
                        Recycling Pickup Request
                      </option>
                      <option value="partnership" className="bg-secondary text-white">
                        Partnership Opportunity
                      </option>
                      <option value="feedback" className="bg-secondary text-white">
                        Feedback &amp; Suggestions
                      </option>
                      <option value="other" className="bg-secondary text-white">
                        Other
                      </option>
                    </select>
                  </div>

                  {/* Message textarea */}
                  <div>
                    <label htmlFor="contact-message" className="text-sm text-muted-foreground mb-1.5 block">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      placeholder="Tell us how we can help..."
                      className="w-full bg-secondary/50 border border-border rounded-xl py-3.5 px-4 text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                      value={formData.message}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-4 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
