import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // This component handles all auth callbacks from Supabase
    const handleAuthCallback = async () => {
      // Get the URL hash (contains the access token)
      const hash = window.location.hash;
      
      if (hash) {
        try {
          // Extract parameters from the URL hash
          const hashParams = new URLSearchParams(hash.substring(1));
          const type = hashParams.get("type");
          
          // If this is a recovery (password reset) flow
          if (type === "recovery") {
            // Redirect to the reset password page with the hash intact
            navigate(`/reset-password${hash}`);
          } else {
            // For other auth flows, redirect to home
            navigate("/");
          }
        } catch (error) {
          console.error("Error processing auth callback:", error);
          navigate("/auth");
        }
      } else {
        // No hash means no auth data, redirect to login
        navigate("/auth");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">Processing your request</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Please wait while we redirect you...</p>
      </div>
    </div>
  );
}
