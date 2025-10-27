
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Due } from '@/lib/types';

const dueSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  archived: z.boolean().default(false),
});

type AddEditDueDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onSave: (dueData: Omit<Due, 'id' | 'createdAt' | 'active'> & { id?: string }) => void;
  due: Due | null;
};

export function AddEditDueDialog({ isOpen, setOpen, onSave, due }: AddEditDueDialogProps) {
  const form = useForm<z.infer<typeof dueSchema>>({
    resolver: zodResolver(dueSchema),
    defaultValues: {
      name: '',
      amount: 0,
      archived: false,
    },
  });

  useEffect(() => {
    if (due) {
      form.reset({
        name: due.name,
        amount: due.amount,
        archived: due.archived,
      });
    } else {
      form.reset({
        name: '',
        amount: 0,
        archived: false,
      });
    }
  }, [due, form, isOpen]);

  const onSubmit = (values: z.infer<typeof dueSchema>) => {
    onSave(values);
  };

  const dialogTitle = due ? 'Edit Due' : 'Add New Due';
  const dialogDescription = due ? `Update the details for ${due.name}.` : 'Enter the details for the new recurring due.';

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
                  <FormLabel>Due Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Season 2024/25" {...field} />
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
                    <Input type="number" step="0.01" placeholder="120.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="archived"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Archived
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Due</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
