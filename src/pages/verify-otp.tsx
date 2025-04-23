import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyOTP, createOTPForUser } from "@/lib/otp";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get email and user ID from URL params
    const emailParam = searchParams.get("email");
    const uidParam = searchParams.get("uid");
    if (emailParam && uidParam) {
      setEmail(emailParam);
      setUserId(uidParam);
    } else {
      navigate("/auth");
    }
  }, [searchParams, navigate]);

  // Handle OTP input change
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    if (value.length <= 6) { // Limit to 6 digits
      setOtp(value);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !userId || otp.length !== 6) return;

    try {
      setLoading(true);

      // Verify the OTP
      const isValid = await verifyOTP(userId, otp);

      if (!isValid) {
        throw new Error("Invalid or expired verification code");
      }

      toast({
        title: "Verification successful",
        description: "Welcome back!",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message,
      });
      setOtp(""); // Clear the input on error
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!email || !userId) return;

    try {
      setLoading(true);
      await createOTPForUser(userId, email);

      toast({
        title: "New code sent",
        description: "Please check your email for the new verification code.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send code",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Enter Verification Code</CardTitle>
          <CardDescription className="text-center">
            We sent a 6-digit code to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={handleOtpChange}
                maxLength={6}
                className="text-center text-2xl tracking-[1em] font-mono"
                style={{ letterSpacing: "1em" }}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || otp.length !== 6}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={resendOTP}
                disabled={loading}
                className="text-sm"
              >
                Resend Code
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
