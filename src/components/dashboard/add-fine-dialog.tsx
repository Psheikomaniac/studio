
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player, PredefinedFine } from "@/lib/types";
import { PlayerMultiSelect } from "./player-multi-select";

// Note: getFineSuggestion is now a mock function, as server actions with AI are removed.
const getFineSuggestion = async (description: string): Promise<any> => {
  console.log("Mock AI suggestion for:", description);
  // In a real scenario, you might have a client-side mock or disable this.
  // For now, it will just show a loading state and then resolve.
  return new Promise(resolve => setTimeout(() => resolve({
    suggestedReason: "Late for training",
    suggestedPlayers: [{ id: "1", name: "Alex" }]
  }), 1000));
}
import { getFineSuggestion } from "@/lib/actions";


const fineSchema = z.object({
  playerIds: z.array(z.string()).min(1, "Please select at least one player."),
  reason: z.string().min(3, "Reason must be at least 3 characters long."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  aiDescription: z.string().optional(),
});

type AddFineDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  players: Player[];
  predefinedFines: PredefinedFine[];
  onFineAdded: (fine: z.infer<typeof fineSchema>) => void;
};

export function AddFineDialog({ isOpen, setOpen, players, predefinedFines, onFineAdded }: AddFineDialogProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof fineSchema>>({
    resolver: zodResolver(fineSchema),
    defaultValues: {
      playerIds: [],
      reason: "",
      amount: 0,
      aiDescription: "",
    },
  });

  const onSubmit = (values: z.infer<typeof fineSchema>) => {
    console.log(values);
    onFineAdded(values);
    toast({
      title: "Fine Assigned!",
      description: `${values.reason} for €${values.amount.toFixed(2)} was assigned.`,
    });
    form.reset();
    setOpen(false);
  };

  const handleAiSuggest = async () => {
    const description = form.getValues("aiDescription");
    if (!description) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a description of the transgression first.",
      });
      return;
    }

    setIsAiLoading(true);
    const result = await getFineSuggestion(description);
    setIsAiLoading(false);

    if (result.error) {
      toast({ variant: "destructive", title: "AI Error", description: result.error });
    } else if (result.suggestedReason && result.suggestedPlayers) {
      form.setValue("reason", result.suggestedReason, { shouldValidate: true });
      const matchedPlayerIds = result.suggestedPlayers
        .map((suggestedPlayer: { id: string; name: string; }) => players.find(p => p.id === suggestedPlayer.id)?.id)
        .filter((id: string | undefined): id is string => !!id);
      
      form.setValue("playerIds", matchedPlayerIds, { shouldValidate: true });
      toast({
        title: "AI Suggestion Applied!",
        description: "Reason and players have been pre-filled.",
      });
    }
  };

  const handlePredefinedFineChange = (reason: string) => {
    const fine = predefinedFines.find(f => f.reason === reason);
    if (fine) {
      form.setValue("reason", fine.reason, { shouldValidate: true });
      form.setValue("amount", fine.amount, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Assign a New Fine</DialogTitle>
          <DialogDescription>
            Select players and a reason to assign a fine. Use the AI helper for quick suggestions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="aiDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transgression Description (for AI)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 'Alex and Ben were late for training again...'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" onClick={handleAiSuggest} disabled={isAiLoading} variant="outline" className="w-full">
              {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-accent" />}
              Suggest with AI
            </Button>

            <div className="my-2 flex items-center gap-2">
                <div className="flex-grow border-t border-border"></div>
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="flex-grow border-t border-border"></div>
            </div>

            <FormField
              control={form.control}
              name="playerIds"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Players</FormLabel>
                  <FormControl>
                    <PlayerMultiSelect
                      players={players}
                      value={field.value}
                      onChange={(ids) => form.setValue("playerIds", ids, { shouldValidate: true })}
                    />
                  </FormControl>
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
                  <Select onValueChange={(value) => handlePredefinedFineChange(value)} defaultValue="">
                    <FormControl>
                      <Input
                        placeholder="Select or type a custom reason..."
                        {...field}
                      />
                    </FormControl>
                    <SelectContent>
                      {predefinedFines.map((fine, i) => (
                        <SelectItem key={i} value={fine.reason}>
                          {fine.reason}
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
              <Button type="submit">Assign Fine</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
