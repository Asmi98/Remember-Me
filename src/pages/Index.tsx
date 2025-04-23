import { PasswordVault } from "@/components/PasswordVault";
import { LoginDevices } from "@/components/LoginDevices";
import { ActivityReport } from "@/components/ActivityReport";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { UserProfile } from "@/components/UserProfile";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";

const Index = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <h1 className="text-xl font-semibold text-vault-accent">Remember Me</h1>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-vault-accent" />
              ) : (
                <Moon className="h-4 w-4 text-vault-accent" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <UserProfile />
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="outline"
              className="text-vault-accent hover:text-vault-accent/90 hover:bg-vault-accent/5 border-vault-accent/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-screen-2xl py-6">
        <div className="grid gap-8">
          <PasswordVault />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <LoginDevices />
            <ActivityReport />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
