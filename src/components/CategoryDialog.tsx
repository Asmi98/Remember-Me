import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryIconUpload } from "./CategoryIconUpload";
import { Plus } from "lucide-react";

interface CategoryDialogProps {
  mode?: "create" | "edit";
  category?: {
    id: string;
    name: string;
    icon_url?: string | null;
  };
  children?: React.ReactNode;
}

const formSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon_url: z.string().optional().nullable(),
});

export const CategoryDialog = ({ mode = "create", category, children }: CategoryDialogProps) => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      icon_url: null,
    },
  });

  React.useEffect(() => {
    if (open && mode === "edit" && category) {
      form.reset({
        name: category.name,
        icon_url: category.icon_url || null,
      });
    } else if (!open) {
      form.reset({
        name: "",
        icon_url: null,
      });
    }
  }, [open, category, mode, form]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (mode === "create") {
        const { data, error } = await supabase
          .from("categories")
          .insert([
            {
              name: values.name,
              icon_url: values.icon_url,
              user_id: userData.user.id,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Create error:", error);
          throw error;
        }
        return data;
      } else {
        if (!category?.id) throw new Error("Category ID is required for update");

        const { data, error } = await supabase
          .from("categories")
          .update({
            name: values.name,
            icon_url: values.icon_url,
            updated_at: new Date().toISOString(),
          })
          .eq("id", category.id)
          .eq("user_id", userData.user.id)
          .select()
          .single();

        if (error) {
          console.error("Update error:", error);
          throw error;
        }

        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: mode === "create" ? "Category Created" : "Category Updated",
        description: mode === "create" 
          ? "New category has been created successfully." 
          : "Category has been updated successfully.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${mode} category. Please try again.`,
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Category" : "Edit Category"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter category name"
                      className="focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Icon</FormLabel>
                  <FormControl>
                    <CategoryIconUpload
                      existingIconUrl={field.value || undefined}
                      onIconChange={(url) => {
                        form.setValue("icon_url", url);
                      }}
                      onIconRemove={() => {
                        form.setValue("icon_url", null);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? "Saving..."
                  : mode === "create"
                  ? "Create Category"
                  : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
