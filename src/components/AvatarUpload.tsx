import React from "react";
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  userId: string;
  url: string | null;
  onUpload: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

export function AvatarUpload({ userId, url, onUpload, size = "md" }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadAvatar = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        setUploading(true);

        if (!event.target.files || event.target.files.length === 0) {
          throw new Error("You must select an image to upload.");
        }

        if (!userId) {
          throw new Error("User ID is required for upload.");
        }

        const file = event.target.files[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `avatar-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        console.log("Starting avatar upload:", {
          userId,
          fileName,
          filePath,
          fileSize: file.size,
          fileType: file.type
        });

        // Delete old avatar if exists
        if (url) {
          const oldFilePath = url.split("/").pop();
          if (oldFilePath) {
            console.log("Deleting old avatar:", oldFilePath);
            const { error: deleteError } = await supabase.storage
              .from("avatars")
              .remove([`${userId}/${oldFilePath}`]);

            if (deleteError) {
              console.error("Error deleting old avatar:", deleteError);
            }
          }
        }

        // Upload new avatar
        const { error: uploadError, data } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { 
            upsert: true,
            cacheControl: "3600",
            contentType: file.type
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        console.log("Upload successful:", data);

        // Get public URL
        const { data: { publicUrl }, error: urlError } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        if (urlError) {
          console.error("Error getting public URL:", urlError);
          throw urlError;
        }

        console.log("Generated public URL:", publicUrl);

        onUpload(publicUrl);

        toast({
          title: "Avatar updated",
          description: "Your profile picture has been uploaded successfully.",
        });
      } catch (error: any) {
        console.error("Avatar upload failed:", error);
        toast({
          variant: "destructive",
          title: "Error uploading avatar",
          description: error.message || "Failed to upload avatar. Please try again.",
        });
      } finally {
        setUploading(false);
      }
    },
    [url, userId, onUpload, toast]
  );

  const removeAvatar = useCallback(async () => {
    try {
      setUploading(true);

      if (!url || !userId) {
        throw new Error("No avatar to remove or missing user ID");
      }

      const filePath = url.split("/").pop();
      if (!filePath) {
        throw new Error("Invalid avatar URL");
      }

      console.log("Removing avatar:", {
        userId,
        filePath
      });

      const { error: deleteError } = await supabase.storage
        .from("avatars")
        .remove([`${userId}/${filePath}`]);

      if (deleteError) {
        console.error("Error removing avatar:", deleteError);
        throw deleteError;
      }

      console.log("Avatar removed successfully");

      onUpload("");

      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed.",
      });
    } catch (error: any) {
      console.error("Avatar removal failed:", error);
      toast({
        variant: "destructive",
        title: "Error removing avatar",
        description: error.message || "Failed to remove avatar. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  }, [url, userId, onUpload, toast]);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-20 w-20",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className={cn(
        sizeClasses[size],
        "group relative cursor-pointer",
        "ring-2 ring-background",
        "bg-gradient-to-br from-primary/20 to-primary/30"
      )}>
        {url && <AvatarImage src={url} alt="Avatar" className="object-cover" />}
        <AvatarFallback>
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </AvatarFallback>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </Avatar>
      {url && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
          onClick={removeAvatar}
          disabled={uploading}
          type="button"
          tabIndex={-1}
        >
          <X className="h-4 w-4 mr-2" />
          Remove Photo
        </Button>
      )}
    </div>
  );
}
