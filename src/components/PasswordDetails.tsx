import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { decryptPassword } from "@/utils/encryption";
import { Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Password {
  id: string;
  title: string;
  username: string;
  encrypted_password: string;
  category_id: string;
  user_id: string;
  created_at?: string;
  last_modified?: string;
}

interface PasswordDetailsProps {
  password: Password | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordDetails: React.FC<PasswordDetailsProps> = ({
  password,
  isOpen,
  onClose,
}) => {
  console.log("[PasswordDetails] received password:", password);
  console.log("[PasswordDetails] encrypted_password:", password?.encrypted_password);
  try {
    console.log("[PasswordDetails] decrypted_password:", password ? decryptPassword(password.encrypted_password) : null);
  } catch (e) {
    console.error("[PasswordDetails] decryption error:", e);
  }
  const { toast } = useToast();
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  React.useEffect(() => {
    setIsPasswordVisible(false);
  }, [password]);

  const handleCopyPassword = () => {
    if (!password) return;
    const decrypted = decryptPassword(password.encrypted_password);
    console.log("[Copy] encrypted:", password.encrypted_password);
    console.log("[Copy] decrypted:", decrypted);
    navigator.clipboard.writeText(decrypted).then(() => {
      toast({
        title: "Password copied",
        description: "Password has been copied to clipboard.",
      });
    });
  };

  if (!password) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{password.title}</DialogTitle>
          <DialogDescription>
            View and manage password details
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Username</label>
            <p className="mt-1 text-foreground">{password.username}</p>
          </div>
          {password.created_at && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Password Created At</label>
              <p className="mt-1 text-foreground">
                {new Date(password.created_at).toLocaleString()}
              </p>
            </div>
          )}
          {password.last_modified && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
              <p className="mt-1 text-foreground">
                {new Date(password.last_modified).toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                >
                  {isPasswordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPassword}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-1">
              {isPasswordVisible ? (
                <>
                  {console.log("[Reveal] encrypted:", password.encrypted_password)}
                  {console.log("[Reveal] decrypted:", decryptPassword(password.encrypted_password))}
                  <p className="font-mono text-foreground break-all">
                    {decryptPassword(password.encrypted_password)}
                  </p>
                </>
              ) : (
                <p className="font-mono text-muted-foreground">
                  {"•".repeat(12)}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
