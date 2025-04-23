import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const processResetToken = async () => {
      try {
        // First check if we already have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // We already have a session, so we can proceed with password reset
          console.log("Session already exists, ready for password reset");
          setIsReady(true);
          return;
        }
        
        // If we don't have a session, check for tokens in the URL
        const hash = window.location.hash;
        
        if (!hash) {
          setTokenError("No reset token found. Please use the link from your email.");
          return;
        }
        
        console.log("Hash detected, processing auth...");
        
        // Let Supabase process the hash
        // This will automatically set up the session if the hash contains valid tokens
        const { data, error } = await supabase.auth.getSession();
        
        // Wait a bit for Supabase to process the hash
        setTimeout(async () => {
          const { data: { session: newSession } } = await supabase.auth.getSession();
          
          if (newSession) {
            console.log("Session established after processing hash");
            setIsReady(true);
          } else {
            console.error("Failed to establish session from hash");
            setTokenError("Invalid or expired reset token. Please request a new password reset link.");
          }
        }, 1000);
      } catch (error: any) {
        console.error("Error processing reset token:", error);
        setTokenError(error.message || "An error occurred while processing your request.");
      }
    };
    
    processResetToken();
  }, [navigate]);

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onResetPassword = async (values: ResetPasswordFormValues) => {
    try {
      setIsLoading(true);
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated successfully",
        description: "Your password has been reset. You can now log in with your new password.",
      });
      
      // Sign out the user to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to login page
      navigate("/auth");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        variant: "destructive",
        title: "Password reset failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="PassGuardia Logo" className="h-12 w-12" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 ml-2">Password Manager</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Reset your password</p>
        </div>

        <Card className="w-full shadow-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl text-center dark:text-gray-100">Create New Password</CardTitle>
            <CardDescription className="text-center dark:text-gray-300">
              Please enter your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tokenError ? (
              <div className="text-center space-y-4">
                <p className="text-red-500 dark:text-red-400">{tokenError}</p>
                <Button 
                  onClick={() => navigate("/auth")}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600/90 dark:hover:bg-blue-700/90"
                >
                  Return to Login
                </Button>
              </div>
            ) : isReady ? (
              <Form {...resetPasswordForm}>
                <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                  <FormField
                    control={resetPasswordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="dark:text-gray-200">New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter new password"
                            {...field}
                            className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetPasswordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="dark:text-gray-200">Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm new password"
                            {...field}
                            className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600/90 dark:hover:bg-blue-700/90"
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Reset Password
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="flex flex-col justify-center items-center py-8 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-600 dark:text-gray-300">Verifying your reset link...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
