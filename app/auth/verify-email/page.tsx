"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if there's a token in the URL (from email confirmation link)
    const token = searchParams.get("token");
    const type = searchParams.get("type");

    if (token && type === "signup") {
      // Verify the email
      supabase.auth
        .verifyOtp({
          token_hash: token,
          type: "signup",
        })
        .then(({ data, error }) => {
          if (error) {
            setError(error.message);
            setLoading(false);
          } else {
            setVerified(true);
            setLoading(false);
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              router.push("/dashboard");
            }, 2000);
          }
        });
    } else {
      // No token, just show the verification message
      setLoading(false);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="Tadam Logo"
              width={48}
              height={48}
              className="w-12 h-12"
            />
          </div>
        </div>

        {/* Verification Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-8 shadow-sm">
          {loading ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-neutral-400 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Verifying...</h1>
              <p className="text-sm text-neutral-500">
                Please wait while we verify your email.
              </p>
            </div>
          ) : verified ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
              <p className="text-sm text-neutral-500 mb-6">
                Your email has been successfully verified. Redirecting to your
                dashboard...
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-sm hover:bg-neutral-800 transition-colors"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
              <p className="text-sm text-red-600 mb-6">{error}</p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-sm hover:bg-neutral-800 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-neutral-400" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
              <p className="text-sm text-neutral-600 mb-4">
                We've sent a verification link to your email address. Please
                click the link in the email to verify your account.
              </p>
              <p className="text-xs text-neutral-500 mb-6">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={async () => {
                    // Resend verification email
                    const { error } = await supabase.auth.resend({
                      type: "signup",
                      email: searchParams.get("email") || "",
                    });
                    if (error) {
                      setError(error.message);
                    } else {
                      alert("Verification email resent!");
                    }
                  }}
                  className="text-black font-medium hover:underline"
                >
                  resend it
                </button>
                .
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 border border-neutral-200 font-medium rounded-sm hover:bg-neutral-50 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
