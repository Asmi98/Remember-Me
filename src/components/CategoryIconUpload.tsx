import React from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface CategoryIconUploadProps {
  existingIconUrl?: string;
  onIconChange: (url: string) => void;
  onIconRemove: () => void;
}

export const CategoryIconUpload = ({
  existingIconUrl,
  onIconChange,
  onIconRemove,
}: CategoryIconUploadProps) => {
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(existingIconUrl || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    setPreviewUrl(existingIconUrl || null);
  }, [existingIconUrl]);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);

      // Validate file
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      
      if (!allowedExtensions.includes(fileExt)) {
        throw new Error('Invalid file type. Allowed types: ' + allowedExtensions.join(', '));
      }

      // Generate new file name
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      // Check auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to upload files');
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('category-icons')
        .upload(fileName, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('category-icons')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Delete old file if exists
      if (existingIconUrl) {
        const oldPath = existingIconUrl.split('/category-icons/').pop();
        if (oldPath) {
          await supabase.storage
            .from('category-icons')
            .remove([oldPath.replace(/^\/+/, '')]);
        }
      }

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onIconChange(publicUrl);

      toast({
        title: "Success",
        description: "Icon uploaded successfully",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload icon",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveIcon = async () => {
    try {
      setUploading(true);

      if (existingIconUrl) {
        const iconPath = existingIconUrl.split('/category-icons/').pop();
        if (iconPath) {
          const { error } = await supabase.storage
            .from('category-icons')
            .remove([iconPath.replace(/^\/+/, '')]);

          if (error) throw error;
        }
      }

      setPreviewUrl(null);
      onIconRemove();

      toast({
        title: "Success",
        description: "Icon removed successfully",
      });
    } catch (error: any) {
      console.error('Remove error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove icon",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : previewUrl ? "Change Icon" : "Upload Icon"}
        </Button>
        
        {previewUrl && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleRemoveIcon}
            disabled={uploading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {previewUrl && (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-secondary">
          <img
            src={previewUrl}
            alt="Category icon"
            className="w-full h-full object-cover"
            loading="eager"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              setPreviewUrl(null);
              onIconRemove();
              toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load image",
              });
            }}
          />
        </div>
      )}
    </div>
  );
};
