import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const UncategorizedPasswordsCard = () => {
  const navigate = useNavigate();
  const { data: passwords = [], isLoading, error } = useQuery({
    queryKey: ["uncategorized-passwords"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("passwords")
        .select("id, title, username, encrypted_password, created_at, updated_at")
        .eq("user_id", userData.user.id)
        .is("category_id", null);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-3 flex-1">
            <div className="h-5 bg-muted rounded-md w-3/4 animate-pulse" />
            <div className="h-4 bg-muted/50 rounded-md w-1/2 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-muted/20">
      <CardContent
        className="p-6 cursor-pointer transition-colors duration-200 hover:bg-muted/5"
        onClick={() => navigate("/uncategorized")}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-background to-secondary shadow-sm flex items-center justify-center">
            <Folder className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-medium truncate text-foreground/90 group-hover:text-foreground transition-colors">
              Uncategorized
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {passwords.length} Password{passwords.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
