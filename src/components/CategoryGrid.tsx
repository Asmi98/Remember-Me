import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryDialog } from "./CategoryDialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Plus, ChevronRight, Settings, Folder, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/types/supabase";


type Tables = Database['public']['Tables'];
type Category = Tables['categories']['Row'];

export const CategoryGrid = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null);

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .match({ user_id: userData.user.id })
        .order("name", { ascending: true })
        .returns<Category[]>();

      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }

      return data;
    },
  });

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .match({ id: categoryToDelete.id })
        .returns<Category>();

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Category deleted",
        description: `${categoryToDelete.name} has been deleted successfully.`,
      });
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category. Please try again.",
      });
    }
  };

  if (error) {
    console.error("Error in CategoryGrid:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load categories. Please try refreshing the page.",
    });
  }

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/category/${categoryId}`);
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
                  <div className="space-y-3 flex-1">
                    <div className="h-5 bg-muted rounded-md w-3/4 animate-pulse" />
                    <div className="h-4 bg-muted/50 rounded-md w-1/2 animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Card 
              key={category.id} 
              className={cn(
                "group relative overflow-hidden",
                "hover:shadow-lg transition-all duration-300",
                "hover:border-primary/30 hover:-translate-y-0.5",
                "bg-gradient-to-br from-card to-muted/20"
              )}
            >
              <div 
                className={cn(
                  "absolute top-3 right-3 opacity-0 group-hover:opacity-100",
                  "transition-all duration-200 transform group-hover:translate-y-0 translate-y-1",
                  "z-10 flex gap-1"
                )}
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    "text-destructive hover:text-destructive",
                    "hover:bg-destructive/10 hover:shadow-md",
                    "backdrop-blur-sm"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCategoryToDelete(category);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CategoryDialog mode="edit" category={category}>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full",
                      "text-muted-foreground hover:text-primary",
                      "hover:bg-background/80 hover:shadow-md",
                      "backdrop-blur-sm"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </CategoryDialog>
              </div>

              <CardContent 
                className={cn(
                  "p-6 cursor-pointer",
                  "transition-colors duration-200",
                  "hover:bg-muted/5"
                )}
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="flex items-center gap-4">
                  {category.icon_url ? (
                    <div className={cn(
                      "relative w-12 h-12 rounded-lg overflow-hidden",
                      "bg-gradient-to-br from-background to-secondary",
                      "shadow-sm",
                      "transition-all duration-200",
                      "flex-shrink-0"
                    )}>
                      <img
                        src={`${category.icon_url}?t=${category.updated_at}`}
                        alt={category.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className={cn(
                      "w-12 h-12 rounded-lg",
                      "bg-gradient-to-br from-background to-secondary",
                      "shadow-sm",
                      "transition-all duration-200",
                      "flex-shrink-0 flex items-center justify-center"
                    )}>
                      <Folder className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className={cn(
                      "font-medium truncate text-foreground/90",
                      "group-hover:text-foreground transition-colors"
                    )}>
                      {category.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        View Passwords
                      </span>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground/50",
                        "group-hover:text-primary group-hover:transform",
                        "group-hover:translate-x-0.5 transition-all"
                      )} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={cn(
          "p-12 flex flex-col items-center justify-center text-center",
          "border-dashed border-2",
          "bg-gradient-to-br from-card to-muted/20"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-full",
            "bg-primary/10 flex items-center justify-center mb-4",
            "ring-2 ring-primary/20"
          )}>
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">No categories yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Create your first category to start organizing your passwords
          </p>
          <CategoryDialog mode="create">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Category
            </Button>
          </CategoryDialog>
        </Card>
      )}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category "{categoryToDelete?.name}" and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCategory}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
