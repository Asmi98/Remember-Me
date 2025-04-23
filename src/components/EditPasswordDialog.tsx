import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { encryptPassword, decryptPassword } from "@/utils/encryption";
import { useToast } from "@/components/ui/use-toast";
import { ensureUncategorizedCategory } from "@/utils/uncategorized";
import { Database } from "@/types/supabase";

type Password = Database["public"]["Tables"]["passwords"]["Row"];
type PasswordUpdate = Database["public"]["Tables"]["passwords"]["Update"];

interface Category {
  id: string;
  name: string;
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  category_id: z.string().optional(),
  website_url: z.string().optional(),
  notes: z.string().optional(),
});

interface EditPasswordDialogProps {
  password: Password;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export const EditPasswordDialog = ({
  password,
  isOpen,
  onClose,
  categories,
}: EditPasswordDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      username: "",
      password: "",
      category_id: "",
      website_url: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (password) {
      form.reset({
        title: password.title,
        username: password.username,
        password: password.encrypted_password ? decryptPassword(password.encrypted_password) : "",
        category_id: password.category_id || "",
        website_url: password.website_url || "",
        notes: password.notes || "",
      });
    }
  }, [password, form]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      let categoryId = values.category_id;
      if (!categoryId) {
        const uncategorized = await ensureUncategorizedCategory();
        categoryId = uncategorized?.id || null;
      }
      // Fetch the current password and its history
      const { data: existingRows, error: fetchError } = await supabase
        .from("passwords")
        .select("encrypted_password, password_history")
        .eq("id", password.id)
        .single();
      if (fetchError) throw fetchError;

      // Prepare new history entry if password is changing
      let updatedHistory = Array.isArray(existingRows?.password_history)
        ? [...existingRows.password_history]
        : [];
      const oldEncryptedPassword = existingRows?.encrypted_password;
      const newEncryptedPassword = encryptPassword(values.password);
      if (
        oldEncryptedPassword &&
        oldEncryptedPassword !== newEncryptedPassword
      ) {
        updatedHistory.unshift({
          encrypted_password: oldEncryptedPassword,
          changed_at: new Date().toISOString(), // Always now (UTC)
        });
      }

      const updateData: PasswordUpdate = {
        title: values.title,
        username: values.username,
        encrypted_password: encryptPassword(values.password),
        category_id: categoryId,
        website_url: values.website_url || null,
        notes: values.notes || null,
        password_history: updatedHistory,
        last_modified_date: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("passwords")
        .update(updateData)
        .eq("id", password.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update password. Please try again.",
      });
      console.error("Error updating password:", error);
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Password</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Gmail Account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., john.doe@gmail.com" {...field} />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        type={showPassword ? "text" : "password"}
                        className="flex-1"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <FormControl>
                    <select
                      className="w-full bg-background border border-input rounded-md px-3 py-2"
                      {...field}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., https://gmail.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes here..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-vault-accent hover:bg-vault-accent/90"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
