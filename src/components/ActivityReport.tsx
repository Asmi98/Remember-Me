import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Shield, Key, AlertCircle } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useState } from "react";

const ITEMS_PER_PAGE = 10;

export const ActivityReport = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const oneMonthAgo = subMonths(new Date(), 1).toISOString();

  // Fetch password history
  const { data: passwordHistory = [], isLoading } = useQuery({
    queryKey: ["passwordHistory"],
    queryFn: async () => {
      const { data: passwords, error } = await supabase
        .from("passwords")
        .select("title, password_history, last_modified_date")
        .gte("last_modified_date", oneMonthAgo)
        .order("last_modified_date", { ascending: false });

      if (error) throw error;

      const history = passwords?.flatMap((password) => {

        const baseEntry = password.last_modified_date
          ? [
              {
                title: password.title,
                changed_at: password.last_modified_date,
                type: "Current Password",
              },
            ]
          : [];

        const historyEntries =
          password.password_history?.map((entry: any) => ({
            title: password.title,
            changed_at: entry.changed_at,
            type: "Previous Password",
          })) || [];

        return [...baseEntry, ...historyEntries];
      });

      return history
        .filter((entry) => new Date(entry.changed_at) >= new Date(oneMonthAgo))
        .sort(
          (a, b) =>
            new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
        );
    },
  });

  // Pagination calculations
  const totalPages = Math.ceil((passwordHistory?.length || 0) / ITEMS_PER_PAGE);
  const paginatedHistory = passwordHistory?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <Card className="p-6 shadow-md border-vault-accent/10">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-vault-accent animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-md border-vault-accent/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-vault-accent">
          Password Change History
        </h2>
        <div className="text-sm text-muted-foreground">
          Last 30 days
        </div>
      </div>

      <div className="rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-vault-accent">Password</TableHead>
              <TableHead className="text-vault-accent">Status</TableHead>
              <TableHead className="text-vault-accent text-right">Changed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHistory.map((entry, index) => (
              <TableRow
                key={`${entry.title}-${entry.changed_at}-${index}`}
                className="hover:bg-vault-accent/5 transition-colors"
              >
                <TableCell className="font-medium">{entry.title}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.type === "Current Password"
                        ? "bg-vault-success/10 text-vault-success"
                        : "bg-vault-warning/10 text-vault-warning"
                    }`}
                  >
                    {entry.type === "Current Password" ? (
                      <Key className="w-3 h-3 mr-1" />
                    ) : (
                      <Shield className="w-3 h-3 mr-1" />
                    )}
                    {entry.type}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {/* Ensure UTC parsing by appending 'Z' to ISO string */}
                  {(() => {

                    let date = entry.changed_at ? new Date(entry.changed_at) : null;
                    if (!date || isNaN(date.getTime())) {
                      return 'Invalid date';
                    }
                    return format(date, "MMM d, yyyy 'at' h:mm a");
                  })()}

                </TableCell>
              </TableRow>
            ))}
            {passwordHistory.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-5 w-5" />
                    <p>No password changes in the last 30 days</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {passwordHistory.length > 0 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </Card>
  );
};
