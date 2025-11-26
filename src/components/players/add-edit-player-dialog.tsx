
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Player } from '@/lib/types';
import { useTranslation } from 'react-i18next';

const playerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  nickname: z.string().min(2, 'Nickname must be at least 2 characters long.'),
  photoUrl: z.string().url('Please enter a valid URL for the photo.').optional().or(z.literal('')),
});

type AddEditPlayerDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onSave: (playerData: Omit<Player, 'id' | 'balance' | 'totalPaidPenalties' | 'totalUnpaidPenalties'> & { id?: string }) => void;
  player: Player | null;
};

export function AddEditPlayerDialog({ isOpen, setOpen, onSave, player }: AddEditPlayerDialogProps) {
  const { t } = useTranslation();
  const form = useForm<z.infer<typeof playerSchema>>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: '',
      nickname: '',
      photoUrl: '',
    },
  });

  useEffect(() => {
    if (player) {
      form.reset({
        name: player.name,
        nickname: player.nickname,
        photoUrl: player.photoUrl,
      });
    } else {
      form.reset({
        name: '',
        nickname: '',
        photoUrl: '',
      });
    }
  }, [player, form, isOpen]);

  const onSubmit = (values: z.infer<typeof playerSchema>) => {
    onSave({
        ...values,
        photoUrl: values.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(values.name)}&size=400&background=0ea5e9&color=fff`,
    });
  };
  
  const dialogTitle = player
    ? t('playersPage.addEditDialog.titleEdit')
    : t('playersPage.addEditDialog.titleAdd');
  const dialogDescription = player
    ? t('playersPage.addEditDialog.descEdit', { name: player.name })
    : t('playersPage.addEditDialog.descAdd');

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('playersPage.form.fullNameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('playersPage.form.fullNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('playersPage.form.nicknameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('playersPage.form.nicknamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('playersPage.form.photoUrlLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('playersPage.form.photoUrlPlaceholder')} {...field} />
                  </FormControl>
                   <FormDescription>
                    {t('playersPage.form.photoUrlDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{t('playersPage.form.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
