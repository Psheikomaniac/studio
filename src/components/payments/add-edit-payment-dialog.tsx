
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
import { Payment, Player, PaymentCategory } from '@/lib/types';
import { PlayerMultiSelect } from "@/components/dashboard/player-multi-select";
import { useTranslation } from 'react-i18next';

type AddEditPaymentDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  onSave: (paymentData: Omit<Payment, 'id' | 'paid' | 'paidAt' | 'date'> & { id?: string }) => void;
  payment: Payment | null;
  players: Player[];
};

export function AddEditPaymentDialog({ isOpen, setOpen, onSave, payment, players }: AddEditPaymentDialogProps) {
  const { t } = useTranslation();

  const paymentSchema = z.object({
    playerIds: z.array(z.string()).min(1, t('dialogs.validation.selectPlayer')),
    reason: z.string().min(3, t('dialogs.validation.reasonLength')),
    amount: z.coerce.number().positive(t('dialogs.validation.positiveAmount')),
    category: z.nativeEnum(PaymentCategory),
  });

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      playerIds: [],
      reason: '',
      amount: 0,
      category: PaymentCategory.PAYMENT,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (payment) {
        form.reset({
          playerIds: [payment.userId],
          reason: payment.reason,
          amount: payment.amount,
          category: payment.category || PaymentCategory.PAYMENT,
        });
      } else {
        form.reset({
          playerIds: [],
          reason: '',
          amount: 0,
          category: PaymentCategory.PAYMENT,
        });
      }
    }
  }, [payment, form, isOpen]);

  const onSubmit = (values: z.infer<typeof paymentSchema>) => {
    if (payment) {
      // Edit single payment: use the first selected player
      const userId = values.playerIds[0] ?? '';
      onSave({ userId, reason: values.reason, amount: values.amount, category: values.category });
    } else {
      // Create one payment per selected player
      values.playerIds.forEach((userId) => {
        onSave({ userId, reason: values.reason, amount: values.amount, category: values.category });
      });
    }
    setOpen(false);
    form.reset();
  };

  const dialogTitle = payment ? t('dialogs.editPaymentTitle') : t('dialogs.addPaymentTitle');
  const dialogDescription = payment ? t('dialogs.editPaymentDesc') : t('dialogs.addPaymentDesc');

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
              name="playerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.players')}</FormLabel>
                  <PlayerMultiSelect
                    players={players}
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.category')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialogs.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(PaymentCategory).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
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
                  <FormLabel>{t('dialogs.reason')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('dialogs.paymentReasonPlaceholder')} {...field} />
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
                  <FormLabel>{t('dialogs.amount')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="25.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{t('dialogs.savePayment')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
