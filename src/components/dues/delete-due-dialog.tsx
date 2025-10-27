
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteDueDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: () => void;
  dueName?: string;
  hasPayments?: boolean;
};

export function DeleteDueDialog({ isOpen, setOpen, onConfirm, dueName, hasPayments }: DeleteDueDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            due for <span className="font-semibold">"{dueName || '...'}"</span>.
            {hasPayments && (
              <span className="block mt-2 text-amber-600 dark:text-amber-500 font-medium">
                Warning: This due has associated payments. Deleting it will also remove all payment records.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, delete due
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
