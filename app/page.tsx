"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Database, Zap, Shield, Check } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

declare global {
  interface Window {
    gsap: any;
  }
}

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          router.push("/dashboard");
        }
      } catch (error) {
        // User not logged in, stay on landing page
      }
    };

    checkAuth();

    // Landing page animations
    if (typeof window !== "undefined" && window.gsap) {
      window.gsap.from(".hero-title", {
        duration: 0.8,
        opacity: 0,
        y: 20,
        ease: "power3.out",
      });
      window.gsap.from(".hero-subtitle", {
        duration: 0.8,
        opacity: 0,
        y: 20,
        ease: "power3.out",
        delay: 0.2,
      });
      window.gsap.from(".hero-cta", {
        duration: 0.8,
        opacity: 0,
        y: 20,
        ease: "power3.out",
        delay: 0.4,
      });
      window.gsap.from(".feature-card", {
        duration: 0.6,
        opacity: 0,
        y: 20,
        stagger: 0.1,
        ease: "power2.out",
        delay: 0.6,
      });
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Tadam Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-lg font-bold tracking-tight">Tadam</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-black transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-semibold bg-black text-white rounded-sm hover:bg-neutral-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="hero-title text-5xl font-bold tracking-tight mb-6">
            Sync Your Data
            <br />
            <span className="text-neutral-600">Without the Complexity</span>
          </h1>
          <p className="hero-subtitle text-xl text-neutral-600 mb-8">
            Automate data synchronization between databases, warehouses, and
            APIs. Set it up in minutes, not weeks.
          </p>
          <div className="hero-cta flex items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="px-6 py-3 bg-black text-white font-semibold rounded-sm hover:bg-neutral-800 transition-colors flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="px-6 py-3 border border-neutral-200 font-medium rounded-sm hover:bg-neutral-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="feature-card p-6 border border-neutral-100 rounded-sm">
            <div className="w-12 h-12 bg-neutral-100 rounded-sm flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Any Source</h3>
            <p className="text-sm text-neutral-600">
              Postgres, MySQL, MongoDB, Snowflake, and more. Connect to any
              database or API in seconds.
            </p>
          </div>

          <div className="feature-card p-6 border border-neutral-100 rounded-sm">
            <div className="w-12 h-12 bg-neutral-100 rounded-sm flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Automated Syncs</h3>
            <p className="text-sm text-neutral-600">
              Schedule syncs hourly, daily, or in real-time. Set it and forget
              it with reliable error handling.
            </p>
          </div>

          <div className="feature-card p-6 border border-neutral-100 rounded-sm">
            <div className="w-12 h-12 bg-neutral-100 rounded-sm flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
            <p className="text-sm text-neutral-600">
              End-to-end encryption, role-based access, and compliance with
              SOC 2, GDPR, and more.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-neutral-600 mb-8">
            Join thousands of teams syncing their data with Tadam.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white font-semibold rounded-sm hover:bg-neutral-800 transition-colors"
          >
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-neutral-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Tadam Logo"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-sm font-medium text-neutral-600">
                © 2024 Tadam. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <Link href="#" className="hover:text-black transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-black transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-black transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
