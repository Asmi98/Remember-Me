import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function VerifySuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Check if the URL contains a verification token
    const handleVerification = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        setVerificationStatus('success');
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationStatus('error');
        return;
      }
    };

    handleVerification();
  }, []);

  useEffect(() => {
    if (verificationStatus === 'success') {
      // Start countdown only after successful verification
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/auth");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [navigate, verificationStatus]);

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="w-full shadow-lg border border-gray-200">
            <CardHeader className="space-y-6">
              <CardTitle className="text-2xl text-center">Verifying Email...</CardTitle>
              <CardDescription className="text-center text-base">
                Please wait while we verify your email address.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="w-full shadow-lg border border-gray-200">
            <CardHeader className="space-y-6">
              <CardTitle className="text-2xl text-center text-red-600">Verification Failed</CardTitle>
              <CardDescription className="text-center text-base">
                There was an error verifying your email. Please try again or contact support.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/auth")}
                className="w-full"
                variant="outline"
              >
                Return to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="w-full shadow-lg border border-gray-200">
          <CardHeader className="space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl text-center">Email Verified!</CardTitle>
              <CardDescription className="text-center text-base">
                Your email has been successfully verified.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-gray-500">
              Redirecting to login in {countdown} seconds...
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="w-full"
              variant="outline"
            >
              Go to Login Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
