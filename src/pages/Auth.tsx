import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const otpSchema = z.object({
  otp: z.string().min(6, "Please enter the 6-digit code").max(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type OTPFormValues = z.infer<typeof otpSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const otpForm = useForm<OTPFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const onLogin = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
   
      // First verify the password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
   
      if (signInError) throw signInError;
   
      // If password is correct, send OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          shouldCreateUser: false,
        },
      });
   
      if (otpError) throw otpError;
   
      setVerifiedEmail(values.email);
      setShowOTP(true);
      
      toast({
        title: "Verification code sent",
        description: "Please check your email for the verification code.",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPassword = async (values: ForgotPasswordFormValues) => {
    try {
      setIsLoading(true);
      
      // Get the current site URL
      const baseUrl = window.location.origin;
      
      // Create a fully qualified URL for the reset password page
      const resetUrl = `${baseUrl}/reset-password`;
      
      // Send the password reset email with the correct redirect URL
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: resetUrl,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Please check your email for the password reset link. If you don't see the email, please check your spam folder.",
      });
      
      // Return to login screen after sending reset email
      setShowForgotPassword(false);
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

  const onVerifyOTP = async (values: OTPFormValues) => {
    try {
      setIsLoading(true);
   
      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: verifiedEmail,
        token: values.otp,
        type: 'email',
      });
   
      if (error) throw error;
   
      // After successful OTP verification, record the login device
      const userAgent = window.navigator.userAgent;
      const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
      const deviceType = isMobile ? "mobile" : /Tablet/i.test(userAgent) ? "tablet" : "desktop";
   
      try {
        // Get IP and location info
        const locationResponse = await fetch('https://ipapi.co/json/');
        const locationData = await locationResponse.json();
        
        // Record login device
        const { error: deviceError } = await supabase
          .from('login_devices')
          .insert({
            user_id: authData.user?.id,
            device_name: deviceType,
            ip_address: locationData.ip,
            user_agent: userAgent,
            location: `${locationData.city}, ${locationData.country_name}`,
            is_active: true,
            last_login: new Date().toISOString(),
          });
   
        if (deviceError) {
          console.error('Error recording login device:', deviceError);
        }
      } catch (locationError) {
        console.error('Error getting location:', locationError);
      }
   
      navigate("/");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignup = async (values: SignupFormValues) => {
    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
          },
          emailRedirectTo: `${import.meta.env.VITE_APP_URL}/verify-success`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account created",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 ml-2">Remember Me</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300">Secure your digital life with confidence</p>
        </div>

        <Card className="w-full shadow-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800/50 backdrop-blur-sm">
          {showOTP ? (
            <>
              <CardHeader>
                <CardTitle className="text-xl text-center dark:text-gray-100">Enter Verification Code</CardTitle>
                <CardDescription className="text-center dark:text-gray-300">
                  Please enter the 6-digit code sent to your email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onVerifyOTP)} className="space-y-4">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-gray-200">Verification Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter 6-digit code"
                              {...field}
                              maxLength={6}
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
                      Verify Code
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          ) : showForgotPassword ? (
            <>
              <CardHeader>
                <CardTitle className="text-xl text-center dark:text-gray-100">Reset Password</CardTitle>
                <CardDescription className="text-center dark:text-gray-300">
                  Enter your email to receive a password reset link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...forgotPasswordForm}>
                  <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                    <FormField
                      control={forgotPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="dark:text-gray-200">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email"
                              {...field}
                              className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col space-y-2">
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600/90 dark:hover:bg-blue-700/90"
                        disabled={isLoading}
                      >
                        {isLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Send Reset Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForgotPassword(false)}
                        className="w-full border-gray-200 dark:border-gray-600 dark:text-gray-200"
                      >
                        Back to Login
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 dark:bg-gray-700/50">
                <TabsTrigger value="login" className="dark:data-[state=active]:bg-gray-600 dark:text-gray-200 dark:data-[state=active]:text-white">Login</TabsTrigger>
                <TabsTrigger value="signup" className="dark:data-[state=active]:bg-gray-600 dark:text-gray-200 dark:data-[state=active]:text-white">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <CardHeader>
                  <CardTitle className="text-xl text-center dark:text-gray-100">Welcome Back</CardTitle>
                  <CardDescription className="text-center dark:text-gray-300">
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-gray-200">Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter your email"
                                {...field}
                                className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-gray-200">Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your password"
                                {...field}
                                className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                              />
                            </FormControl>
                            <FormMessage />
                            <div className="text-right">
                              <Button 
                                variant="link" 
                                className="p-0 h-auto text-sm text-blue-600 dark:text-blue-400"
                                onClick={() => setShowForgotPassword(true)}
                                type="button"
                              >
                                Forgot password?
                              </Button>
                            </div>
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
                        Sign In
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </TabsContent>
              <TabsContent value="signup">
                <CardHeader>
                  <CardTitle className="text-xl text-center dark:text-gray-100">Create Account</CardTitle>
                  <CardDescription className="text-center dark:text-gray-300">
                    Enter your details to create a new account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={signupForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-gray-200">First Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="John" 
                                  {...field}
                                  className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="dark:text-gray-200">Last Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Doe" 
                                  {...field}
                                  className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-gray-200">Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter your email"
                                {...field}
                                className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-gray-200">Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Create a password"
                                {...field}
                                className="border-gray-200 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="dark:text-gray-200">Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm your password"
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
                        Create Account
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </TabsContent>
            </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
}
