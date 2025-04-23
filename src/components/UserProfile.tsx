import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ProfileDialog } from "./ProfileDialog";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";

export const UserProfile = () => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url, id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  const initials = profile ? 
    `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() 
    : "U";

  return (
    <ProfileDialog profile={profile}>
      <Button 
        variant="ghost" 
        className="h-auto p-1 pl-2 gap-2 hover:bg-accent/50"
      >
        <div className="flex items-center gap-3">
          <Avatar className={cn(
            "h-8 w-8 border-2 border-background",
            "bg-gradient-to-br from-primary/20 to-primary/30"
          )}>
            {profile?.avatar_url ? (
              <AvatarImage 
                src={profile.avatar_url} 
                alt="Profile Avatar" 
              />
            ) : (
              <AvatarImage 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${initials}`} 
                alt="User Avatar" 
              />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {profile?.first_name || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              Edit Profile
            </span>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>
    </ProfileDialog>
  );
};
