
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Fine, Player } from '@/lib/types';

const fineSchema = z.object({
  userId: z.string().min(1, "Please select a player."),
  reason: z.string().min(3, 'Reason must be at least 3 characters long.'),
  amount: z.coerce.number().positive("Amount must be a positive number."),
});

type EditFineDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onSave: (fineData: Fine) => void;
  fine: Fine | null;
  players: Player[];
};

export function EditFineDialog({ isOpen, setOpen, onSave, fine, players }: EditFineDialogProps) {
  const form = useForm<z.infer<typeof fineSchema>>({
    resolver: zodResolver(fineSchema),
    defaultValues: {
      userId: '',
      reason: '',
      amount: 0,
    },
  });

  useEffect(() => {
    if (fine) {
      form.reset({
        userId: fine.userId,
        reason: fine.reason,
        amount: fine.amount,
      });
    }
  }, [fine, form, isOpen]);

  const onSubmit = (values: z.infer<typeof fineSchema>) => {
    if (fine) {
      onSave({
        ...fine,
        ...values,
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Fine</DialogTitle>
          <DialogDescription>
            Update the details for this fine.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
             <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Player</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a player" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Late for training" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (€)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
