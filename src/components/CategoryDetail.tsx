import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { decryptPassword } from "@/utils/encryption";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { DeletePasswordDialog } from "./DeletePasswordDialog";
import { Search, ArrowLeft, Copy, Eye, EyeOff, Info, Folder, Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "./ui/input";
import { PasswordDetails } from "./PasswordDetails";
import { EditPasswordDialog } from "./EditPasswordDialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Category {
  id: string;
  name: string;
  icon_url?: string;
  user_id: string;
}

interface Password {
  id: string;
  title: string;
  username: string;
  encrypted_password: string;
  category_id: string;
  user_id: string;
}

export const CategoryDetail = () => {
  // ...existing state
  const [deletingPassword, setDeletingPassword] = useState<Password | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeletePassword = async (password: Password) => {
    setDeletingPassword(password);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeletePassword = async () => {
    if (!deletingPassword) return;
    const { error } = await supabase
      .from("passwords")
      .delete()
      .eq("id", deletingPassword.id);
    setIsDeleteDialogOpen(false);
    setDeletingPassword(null);
    if (error) {
      toast({ title: "Error", description: "Failed to delete password." });
    } else {
      toast({ title: "Deleted", description: "Password deleted successfully." });
      // Optionally refetch passwords
      // If using react-query, invalidate query
      // window.location.reload(); // fallback
    }
  };
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [selectedPassword, setSelectedPassword] = useState<Password | null>(null);
  const [isPasswordDetailsOpen, setIsPasswordDetailsOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isAllPasswords = !categoryId || categoryId === "all";

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select();
      if (error) throw error;
      return (data || []) as unknown[] as Category[];
    },
  });

  const { data: category } = useQuery<Category | { name: string }>({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      if (isAllPasswords) {
        return { name: "All Passwords" };
      }
      const { data, error } = await supabase
        .from("categories")
        .select()
        .match({ id: categoryId || "" })
        .single();

      if (error) throw error;
      return data as unknown as Category;
    },
    enabled: !isAllPasswords,
  });

  const { data: passwords = [], isLoading: isPasswordsLoading } = useQuery<Password[]>({
    queryKey: ["passwords", categoryId],
    queryFn: async () => {
      let query = supabase.from("passwords").select();
      
      if (!isAllPasswords) {
        query = query.match({ category_id: categoryId || "" });
      }
      
      const { data, error } = await query.order("title");
      if (error) throw error;
      return (data || []) as unknown[] as Password[];
    },
  });

  // Filter passwords based on search term
  const filteredPasswords = passwords.filter(
    password =>
      password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      password.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredPasswords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPasswords = filteredPasswords.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyPassword = (password: Password) => {
    const decrypted = decryptPassword(password.encrypted_password);
    navigator.clipboard.writeText(decrypted).then(() => {
      toast({
        title: "Password copied",
        description: "Password has been copied to clipboard.",
      });
    });
  };

  const togglePasswordVisibility = (passwordId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [passwordId]: !prev[passwordId]
    }));
  };

  const handleInfoIconClick = (password: Password) => {
    setSelectedPassword(password);
    setIsPasswordDetailsOpen(true);
  };

  if (isPasswordsLoading) {
    return (
      <Card className="p-8 text-center bg-card border-border">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-muted rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-muted rounded mb-2"></div>
          <div className="h-3 w-32 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Categories
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{category?.name}</h1>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search passwords..."
            className="pl-10 bg-background/5 border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isPasswordsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse bg-card">
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </Card>
            ))}
          </div>
        ) : currentPasswords.length === 0 ? (
          <Card className="p-8 text-center bg-card">
            <p className="text-muted-foreground">
              {searchTerm
                ? "No passwords match your search"
                : "No passwords in this category yet"}
            </p>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {currentPasswords.map((password) => {
                const passwordCategory = categories.find(cat => cat.id === password.category_id);
                
                return (
                  <Card
                    key={password.id}
                    className="bg-card border-border hover:border-primary/40 transition-all duration-300"
                  >
                    <div className="flex justify-between items-center p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {passwordCategory?.icon_url ? (
                            <img
                              src={passwordCategory.icon_url}
                              alt={passwordCategory.name}
                              className="w-6 h-6"
                            />
                          ) : (
                            <Folder className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{password.title}</h3>
                          <p className="text-sm text-muted-foreground">{password.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleInfoIconClick(password);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="View password details"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePasswordVisibility(password.id);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={visiblePasswords[password.id] ? "Hide password" : "Show password"}
                        >
                          {visiblePasswords[password.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCopyPassword(password);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Copy password"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingPassword(password);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Edit password"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeletePassword(password);
                          }}
                          className="text-destructive hover:text-red-600"
                          aria-label="Delete password"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {visiblePasswords[password.id] && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="p-3 rounded-lg bg-muted">
                          <p className="text-sm font-mono text-muted-foreground">
                            {decryptPassword(password.encrypted_password)}
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => handlePageChange(i + 1)}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>

      <PasswordDetails
        password={selectedPassword}
        isOpen={isPasswordDetailsOpen}
        onClose={() => {
          setIsPasswordDetailsOpen(false);
          setSelectedPassword(null);
        }}
      />

      {editingPassword && (
        <EditPasswordDialog
          password={editingPassword}
          categories={categories}
          isOpen={!!editingPassword}
          onClose={() => setEditingPassword(null)}
        />
      )}
      <DeletePasswordDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingPassword(null);
        }}
        onConfirm={confirmDeletePassword}
        passwordTitle={deletingPassword?.title}
      />
    </div>
  );
};
