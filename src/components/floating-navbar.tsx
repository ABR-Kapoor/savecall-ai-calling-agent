import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Mic, ArrowRight, Menu, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingNavbarProps {
  onOpenAuth: () => void;
}

export function FloatingNavbar({ onOpenAuth }: FloatingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 pointer-events-none transition-all duration-300 ${
        scrolled ? "pt-3.5 sm:pt-4" : "pt-5 sm:pt-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
        {/* Left: Brand Identity with Clean Logo */}
        <div
          className={`pointer-events-auto transition-all duration-300 ${
            scrolled
              ? "rounded-full bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-xl px-3.5 py-1.5"
              : "px-1 py-1"
          }`}
        >
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/01_logo_only_transparent.png"
              alt="InsurCall Emblem"
              className="h-7 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-display text-base font-extrabold tracking-tight text-[#111827]">
              Insur<span className="text-[#087F8C]">Call</span>
            </span>
          </Link>
        </div>

        {/* Right: Floating Pill Island (IntegratedBio Editorial Style) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Desktop Capsule */}
          <div
            className={`hidden md:flex items-center rounded-full border transition-all duration-300 p-1.5 ${
              scrolled
                ? "bg-white/90 border-slate-200/90 shadow-md shadow-slate-900/5 backdrop-blur-2xl"
                : "bg-white/70 border-slate-200/70 shadow-xs backdrop-blur-xl hover:bg-white/90"
            }`}
          >
            {/* Nav Links in Monospace Uppercase Tracking */}
            <div className="flex items-center px-1 font-mono text-[11px] tracking-widest text-[#344054]">
              <a
                href="#use-cases"
                className="px-3.5 py-1.5 rounded-full hover:text-[#087F8C] hover:bg-slate-100/70 transition-all font-medium"
              >
                SOLUTIONS
              </a>
              <a
                href="#how-it-works"
                className="px-3.5 py-1.5 rounded-full hover:text-[#087F8C] hover:bg-slate-100/70 transition-all font-medium"
              >
                HOW IT WORKS
              </a>
              <a
                href="#pricing"
                className="px-3.5 py-1.5 rounded-full hover:text-[#087F8C] hover:bg-slate-100/70 transition-all font-medium"
              >
                PRICING
              </a>
            </div>

            {/* Solid Dark Action Pill (matching WORK WITH US button) */}
            <div className="flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={onOpenAuth}
                className="font-mono text-[11px] tracking-wider uppercase text-slate-700 hover:text-black px-3 py-1.5 transition-colors cursor-pointer"
              >
                SIGN IN
              </button>

              <Link
                to="/voice"
                className="group flex items-center gap-1.5 bg-[#111827] hover:bg-[#1F2937] text-white font-mono text-[11px] tracking-wider uppercase px-4 py-2 rounded-full transition-all shadow-xs active:scale-95"
              >
                <Mic className="size-3 text-[#10A6AE]" />
                <span>TRY DEMO</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5 text-slate-400 group-hover:text-white" />
              </Link>
            </div>
          </div>

          {/* Mobile Menu Trigger Pill */}
          <div className="md:hidden flex items-center gap-2 rounded-full bg-white/90 border border-slate-200/90 shadow-sm backdrop-blur-xl p-1.5">
            <Link
              to="/voice"
              className="bg-[#087F8C] text-white font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full font-semibold"
            >
              DEMO
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-full text-slate-700 hover:text-black hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto md:hidden mx-4 mt-2 p-4 rounded-3xl bg-white/95 border border-slate-200 shadow-xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col gap-2 font-mono text-xs tracking-wider text-slate-800">
            <a
              href="#use-cases"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              SOLUTIONS
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              HOW IT WORKS
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              PRICING
            </a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full text-xs font-mono justify-center"
              >
                <Lock className="size-3.5 mr-1.5" />
                SIGN IN
              </Button>
              <Button
                asChild
                size="sm"
                className="w-full bg-[#111827] text-white text-xs font-mono justify-center"
              >
                <Link to="/voice" onClick={() => setMobileMenuOpen(false)}>
                  <Mic className="size-3.5 mr-1.5 text-[#10A6AE]" />
                  LAUNCH TEST CALL
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
