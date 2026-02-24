"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function HubspotInstallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const handleInstall = async () => {
      try {
        // For private apps, Hubspot redirects with a token in the URL
        const token = searchParams.get("token");
        const appId = searchParams.get("appId");
        const error = searchParams.get("error");

        if (error) {
          throw new Error(error);
        }

        if (!token) {
          throw new Error("No access token received from Hubspot");
        }

        const user = await getCurrentUser();
        if (!user) throw new Error("Not authenticated");

        // Verify the token works by making a test API call
        let tokenInfo;
        try {
          const testResponse = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + token, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!testResponse.ok) {
            // Try alternative endpoint for private apps
            const altResponse = await fetch("https://api.hubapi.com/integrations/v1/me", {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (!altResponse.ok) {
              throw new Error("Invalid access token");
            }
            
            tokenInfo = {
              hub_domain: await altResponse.json().then(d => d.portalId || 'unknown'),
              scopes: [],
            };
          } else {
            tokenInfo = await testResponse.json();
          }
        } catch (err) {
          // If token validation fails, still try to store it (might be a private app token)
          tokenInfo = {
            hub_domain: 'unknown',
            scopes: [],
          };
        }

        // Store connection in database
        const { data, error: dbError } = await supabase
          .from("connections")
          .insert({
            user_id: user.id,
            name: `Hubspot ${tokenInfo.hub_domain || "Production"}`,
            type: "hubspot",
            status: "active",
            host: "api.hubapi.com",
            metadata: {
              access_token: token, // Private app token (doesn't expire)
              hub_domain: tokenInfo.hub_domain,
              app_id: appId,
              scopes: tokenInfo.scopes || [],
              connected_at: new Date().toISOString(),
              is_private_app: true,
            },
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard/integrations");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setError(err.message || "Failed to install Hubspot");
      }
    };

    handleInstall();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-neutral-200 rounded-lg p-8 shadow-sm text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-neutral-400 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Installing Hubspot...</h1>
              <p className="text-sm text-neutral-500">
                Please wait while we set up your integration
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Installed!</h1>
              <p className="text-sm text-neutral-500">
                Your Hubspot integration has been successfully installed.
                Redirecting...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Installation Failed</h1>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={() => router.push("/dashboard/integrations")}
                className="px-4 py-2 text-sm font-medium border border-neutral-200 rounded-sm hover:bg-neutral-50 transition-colors"
              >
                Go Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
