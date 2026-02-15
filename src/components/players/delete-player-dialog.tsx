
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
import { useTranslation } from 'react-i18next';

type DeletePlayerDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: () => void;
  playerName?: string;
};

export function DeletePlayerDialog({ isOpen, setOpen, onConfirm, playerName }: DeletePlayerDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('playersPage.deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('playersPage.deleteDialog.desc', { name: playerName || '...' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('playersPage.deleteDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('playersPage.deleteDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
