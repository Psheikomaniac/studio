
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
        photoUrl: values.photoUrl || `https://picsum.photos/seed/${values.name}/400/400`,
    });
  };
  
  const dialogTitle = player ? 'Edit Player' : 'Add New Player';
  const dialogDescription = player ? `Update the details for ${player.name}.` : 'Enter the details for the new player.';

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
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Max Mustermann" {...field} />
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
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Maxi" {...field} />
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
                  <FormLabel>Photo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/photo.jpg" {...field} />
                  </FormControl>
                   <FormDescription>
                    Leave blank to use a random placeholder image.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Player</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
