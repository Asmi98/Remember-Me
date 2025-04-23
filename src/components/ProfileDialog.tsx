import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";

const profileFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  avatar_url: z.string().optional(),
  current_password: z.string().transform(str => str === "" ? undefined : str).optional(),
  password: z.string().transform(str => str === "" ? undefined : str).optional(),
  confirm_password: z.string().transform(str => str === "" ? undefined : str).optional(),
}).refine((data) => {
  // If any password field is filled, all password fields must be filled
  if (data.password || data.confirm_password || data.current_password) {
    if (!data.current_password) {
      return false;
    }
    if (!data.password || data.password.length < 6) {
      return false;
    }
    return data.password === data.confirm_password;
  }
  return true;
}, {
  message: "All password fields are required and new password must be at least 6 characters",
  path: ["confirm_password"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileDialogProps {
  children: React.ReactNode;
  profile: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    id?: string;
  } | null;
}

export const ProfileDialog = ({ children, profile }: ProfileDialogProps) => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      avatar_url: profile?.avatar_url || "",
      current_password: "",
      password: "",
      confirm_password: "",
    },
  });

  // Reset form with new profile data when profile changes or dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        avatar_url: profile?.avatar_url || "",
        current_password: "",
        password: "",
        confirm_password: "",
      });
    }
  }, [profile, open, form]);

  const updateProfile = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user found");

        console.log("Updating profile for user:", user.id);

        // If password change is requested, verify current password first
        if (values.password && values.current_password) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password: values.current_password,
          });

          if (signInError) {
            throw new Error("Current password is incorrect");
          }
        }

        // First try to update
        const { data: updateData, error: updateError } = await supabase
          .from("profiles")
          .update({
            first_name: values.first_name,
            last_name: values.last_name,
            avatar_url: values.avatar_url,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id)
          .select()
          .single();

        // If update fails (no row exists), try to insert
        if (updateError) {
          console.log("Update failed, trying insert:", updateError);
          const { data: insertData, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              first_name: values.first_name,
              last_name: values.last_name,
              avatar_url: values.avatar_url,
              email: user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error("Insert failed:", insertError);
            throw insertError;
          }

          console.log("Profile created:", insertData);
          return { data: insertData, passwordChanged: !!values.password };
        }

        console.log("Profile updated:", updateData);

        // Update password if provided and current password was verified
        if (values.password) {
          const { error: passwordError } = await supabase.auth.updateUser({
            password: values.password,
          });
          
          if (passwordError) {
            console.error("Password update error:", passwordError);
            throw passwordError;
          }
        }

        return { data: updateData, passwordChanged: !!values.password };
      } catch (error) {
        console.error("Profile update/insert failed:", error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      console.log("Profile mutation succeeded:", result);
      
      if (result.passwordChanged) {
        toast({
          title: "Password updated",
          description: "Your password has been changed. You will be logged out for security.",
        });
        
        // Short delay to show the toast before logout
        setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = "/auth"; // Redirect to login page
        }, 2000);
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        setOpen(false);
      }
      
      form.reset();
    },
    onError: (error: any) => {
      console.error("Profile mutation error:", error);
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error.message || "Failed to update profile. Please try again.",
      });
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values);
  };

  const handleAvatarUpload = (url: string) => {
    form.setValue("avatar_url", url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <AvatarUpload
                  userId={profile?.id || ""}
                  url={form.watch("avatar_url") || null}
                  onUpload={handleAvatarUpload}
                  size="lg"
                />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Change Password</h3>
                <span className="text-xs text-muted-foreground">All fields required if changing password</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="current_password"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter current password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter new password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Confirm new password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
