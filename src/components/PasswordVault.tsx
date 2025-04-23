import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { CategoryDialog } from "./CategoryDialog";
import { PasswordDialog } from "./PasswordDialog";
import { CategoryGrid } from "./CategoryGrid";
import { Card } from "./ui/card";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";


export const PasswordVault = () => {
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("name");

      if (error) {
        toast({
          variant: "destructive",
          title: "Error loading categories",
          description: error.message,
        });
        throw error;
      }

      return data;
    },
  });

  return (
    <Card className="p-6 shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Categories</h2>
        <div className="flex gap-3">
          <CategoryDialog mode="create">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </CategoryDialog>
          <PasswordDialog categories={categories}>
            <Button variant="default" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Password
            </Button>
          </PasswordDialog>

        </div>
      </div>
      
      <CategoryGrid />
    </Card>
  );
};
