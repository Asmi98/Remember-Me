import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeletePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  passwordTitle?: string;
}

export const DeletePasswordDialog: React.FC<DeletePasswordDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  passwordTitle,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Password?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete
            {passwordTitle ? ` "${passwordTitle}"` : " this password"}?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
