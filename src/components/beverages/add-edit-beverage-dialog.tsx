
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
import { Beverage } from '@/lib/types';

const beverageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  price: z.coerce.number().positive("Price must be a positive number."),
});

type AddEditBeverageDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onSave: (beverageData: Omit<Beverage, 'id'> & { id?: string }) => void;
  beverage: Beverage | null;
};

export function AddEditBeverageDialog({ isOpen, setOpen, onSave, beverage }: AddEditBeverageDialogProps) {
  const form = useForm<z.infer<typeof beverageSchema>>({
    resolver: zodResolver(beverageSchema),
    defaultValues: {
      name: '',
      price: 0,
    },
  });

  useEffect(() => {
    if (beverage) {
      form.reset({
        name: beverage.name,
        price: beverage.price,
      });
    } else {
      form.reset({
        name: '',
        price: 0,
      });
    }
  }, [beverage, form, isOpen]);

  const onSubmit = (values: z.infer<typeof beverageSchema>) => {
    onSave(values);
  };
  
  const dialogTitle = beverage ? 'Edit Beverage' : 'Add New Beverage';
  const dialogDescription = beverage ? `Update the details for ${beverage.name}.` : 'Enter the details for the new beverage.';

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
                  <FormLabel>Beverage Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Pilsner" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="1.50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Beverage</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
