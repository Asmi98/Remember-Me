import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { Monitor, Smartphone, Laptop, Loader2, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useState, useEffect } from "react";

const ITEMS_PER_PAGE = 5;

interface LoginDevice {
  id: string;
  user_id: string;
  device_name: string;
  ip_address: string;
  last_login: string;
  user_agent: string;
  location: string;
  is_active: boolean;
}

export const LoginDevices = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  useEffect(() => {
    // Get the current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  const { data: loginActivity = [], isLoading } = useQuery<LoginDevice[]>({
    queryKey: ["loginActivity", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("login_devices")
        .select("*")
        .eq("user_id", userId)
        .gte("last_login", sevenDaysAgo)
        .order("last_login", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const getDeviceIcon = (deviceName: string) => {
    const iconClass = "w-4 h-4 text-vault-accent";
    switch (deviceName?.toLowerCase()) {
      case "mobile":
        return <Smartphone className={iconClass} />;
      case "tablet":
      case "laptop":
        return <Laptop className={iconClass} />;
      default:
        return <Monitor className={iconClass} />;
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(loginActivity.length / ITEMS_PER_PAGE);
  const paginatedActivity = loginActivity.slice(
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

  if (!loginActivity.length) {
    return (
      <Card className="p-6 shadow-md border-vault-accent/10">
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <AlertCircle className="w-6 h-6 text-vault-accent" />
          <p className="text-sm text-muted-foreground">No recent login activity</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-md border-vault-accent/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-vault-accent">
          Recent Login Activity
        </h2>
        <div className="text-sm text-muted-foreground">Last 7 days</div>
      </div>

      <div className="rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-vault-accent w-[40px]"></TableHead>
              <TableHead className="text-vault-accent">Device</TableHead>
              <TableHead className="text-vault-accent">Location</TableHead>
              <TableHead className="text-vault-accent text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActivity.map((login) => (
              <TableRow
                key={login.id}
                className="hover:bg-vault-accent/5 transition-colors"
              >
                <TableCell>{getDeviceIcon(login.device_name)}</TableCell>
                <TableCell className="font-medium">
                  {login.device_name.charAt(0).toUpperCase() + login.device_name.slice(1)}
                </TableCell>
                <TableCell>{login.location || "Unknown"}</TableCell>
                <TableCell className="text-right">
                  {format(new Date(login.last_login), "MMM d, h:mm a")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </Card>
  );
};
