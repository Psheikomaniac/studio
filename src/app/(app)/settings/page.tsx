
'use client';

// Force dynamic rendering since this page uses Firebase hooks
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, RotateCcw, AlertCircle, Check, X } from "lucide-react";
import { importCSVToFirestore, type SkippedItem } from "@/lib/csv-import-firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { collection, collectionGroup, getDocs, query, limit, writeBatch, where, addDoc } from "firebase/firestore";
import { useFirebaseOptional } from "@/firebase/use-firebase-optional";
import { Progress } from "@/components/ui/progress";
import { useAllFines, useAllPayments, useAllDuePayments, useAllBeverageConsumptions } from '@/hooks/use-all-transactions';
import { maxDateFromCollections } from '@/lib/stats';
// Use live Firestore data instead of static catalogs
import type { Due, Beverage } from '@/lib/types';
import { useMemoFirebase, useCollection } from '@/firebase';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';
import { generateId } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/components/i18n-provider";

export default function SettingsPage() {
  const { toast } = useToast();
  const { showLanguageName, setShowLanguageName } = useI18n();
  const firebase = useFirebaseOptional();
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Wait for client-side mount to check Firebase availability
  useEffect(() => {
    setIsMounted(true);
    setIsFirebaseAvailable(firebase?.firestore != null);
  }, [firebase]);

  const firestore = firebase?.firestore ?? null;

  // Collection-group data for data quality & freshness
  const { data: finesData } = useAllFines();
  const { data: paymentsData } = useAllPayments();
  const { data: duePaymentsData } = useAllDuePayments();
  const { data: consumptionsData } = useAllBeverageConsumptions();

  const fines = finesData || [];
  const payments = paymentsData || [];
  const duePayments = duePaymentsData || [];
  const beverageConsumptions = consumptionsData || [];

  // Live catalog data from Firestore (top-level collections)
  const duesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'dues');
  }, [firestore]);
  const beveragesCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'beverages');
  }, [firestore]);
  const { data: duesData } = useCollection<Due>(duesCollection);
  const { data: beveragesData } = useCollection<Beverage>(beveragesCollection);
  const liveDues = duesData || [];
  const liveBeverages = beveragesData || [];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [skippedItems, setSkippedItems] = useState<SkippedItem[]>([]);
  const [selectedSkippedItems, setSelectedSkippedItems] = useState<Set<number>>(new Set());
  const [isForceImporting, setIsForceImporting] = useState(false);

  // Dialog states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Loading states
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'text/csv' || file?.name.endsWith('.csv')) {
      setSelectedFile(file);
      setUploadResult(""); // Clear previous results
    } else if (file) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
      e.target.value = ""; // Reset input
    }
  };

  const handleImport = async () => {
    if (!firestore) {
      toast({
        title: "Firebase not available",
        description: "Firebase must be enabled to import data. Set NEXT_PUBLIC_USE_FIREBASE=true in .env.local",
        variant: "destructive"
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file first",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadResult("");
    setImportProgress(0);
    setImportTotal(0);
    setSkippedItems([]);
    setSelectedSkippedItems(new Set());

    try {
      // Detect CSV type by filename (robust: singular/plural)
      const filename = selectedFile.name.toLowerCase();
      let csvType: 'dues' | 'transactions' | 'punishments' | 'unknown';

      if (filename.includes('due')) {
        // matches both "due" and "dues"
        csvType = 'dues';
      } else if (filename.includes('transactions') || filename.includes('transaction')) {
        csvType = 'transactions';
      } else if (filename.includes('punishments') || filename.includes('punishment')) {
        csvType = 'punishments';
      } else {
        csvType = 'unknown';
      }

      // Read file content
      const text = await selectedFile.text();

      // Call appropriate import handler
      if (csvType === 'unknown') {
        throw new Error('Unknown CSV type. Filename must contain "dues", "transaction", or "punishment"');
      }

      // Import to Firestore with progress callback
      const result = await importCSVToFirestore(
        firestore,
        text,
        csvType,
        (progress, total) => {
          setImportProgress(progress);
          setImportTotal(total);
        }
      );

      const successMessage = `Successfully imported ${csvType} data to Firestore: ${result.rowsProcessed} rows, ${result.playersCreated} players created, ${result.recordsCreated} records created`;
      setUploadResult(successMessage);
      setSkippedItems(result.skippedItems || []);

      if (result.warnings.length > 0) {
        toast({
          title: `Import completed with ${result.warnings.length} warnings`,
          description: result.warnings.slice(0, 3).join(', '),
          variant: "default"
        });
      } else {
        toast({
          title: "Import successful",
          description: `${csvType} data imported to Firestore successfully`,
        });
      }

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }

      // Reset file input
      setSelectedFile(null);
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadResult(`Error: ${errorMessage}`);
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setImportProgress(0);
      setImportTotal(0);
    }
  };

  /**
   * Reset all balances - marks all transactions as paid
   * This clears all debts but keeps players and transaction history
   */
  const handleResetBalances = async () => {
    if (!firestore) {
      toast({
        title: "Firebase not available",
        description: "Firebase must be enabled for this action.",
        variant: "destructive"
      });
      return;
    }

    setIsResetting(true);
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const batch = writeBatch(firestore);
      let transactionCount = 0;

      // For each user, mark all their transactions as paid
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Mark all fines as paid
        const finesSnapshot = await getDocs(collection(firestore, `users/${userId}/fines`));
        finesSnapshot.docs.forEach((fineDoc) => {
          batch.update(fineDoc.ref, {
            paid: true,
            paidAt: new Date().toISOString(),
            amountPaid: fineDoc.data().amount
          });
          transactionCount++;
        });

        // Mark all dues as paid
        const duesSnapshot = await getDocs(collection(firestore, `users/${userId}/duePayments`));
        duesSnapshot.docs.forEach((dueDoc) => {
          batch.update(dueDoc.ref, {
            paid: true,
            paidAt: new Date().toISOString(),
            amountPaid: dueDoc.data().amountDue
          });
          transactionCount++;
        });

        // Mark all beverages as paid
        const beveragesSnapshot = await getDocs(collection(firestore, `users/${userId}/beverageConsumptions`));
        beveragesSnapshot.docs.forEach((bevDoc) => {
          batch.update(bevDoc.ref, {
            paid: true,
            paidAt: new Date().toISOString(),
            amountPaid: bevDoc.data().amount
          });
          transactionCount++;
        });
      }

      await batch.commit();

      toast({
        title: "Erfolgreich zurückgesetzt",
        description: `Alle ${transactionCount} Transaktionen wurden als bezahlt markiert. Alle Guthaben sind jetzt 0€.`,
      });

      setShowResetDialog(false);
    } catch (error) {
      console.error('Error resetting balances:', error);
      toast({
        title: "Fehler beim Zurücksetzen",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  /**
   * Delete all data - removes ALL players and ALL transactions
   * This is a complete reset and cannot be undone
   */
  // Helper: delete all docs from a collection group in safe batches
  const deleteCollectionGroupInBatches = async (groupName: string, batchSize = 450) => {
    if (!firestore) return 0;
    let deleted = 0;
    while (true) {
      const snap = await getDocs(query(collectionGroup(firestore, groupName), limit(batchSize)));
      if (snap.empty) break;
      const batch = writeBatch(firestore);
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += snap.size;
      // Yield to UI thread between batches
      await new Promise((r) => setTimeout(r, 0));
    }
    return deleted;
  };

  // Helper: delete all docs from a top-level collection in safe batches
  const deleteTopLevelCollectionInBatches = async (collectionName: string, batchSize = 450) => {
    if (!firestore) return 0;
    let deleted = 0;
    while (true) {
      const snap = await getDocs(query(collection(firestore, collectionName), limit(batchSize)));
      if (snap.empty) break;
      const batch = writeBatch(firestore);
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += snap.size;
      await new Promise((r) => setTimeout(r, 0));
    }
    return deleted;
  };

  const handleDeleteAllData = async () => {
    if (!firestore) {
      toast({
        title: "Firebase not available",
        description: "Firebase must be enabled for this action.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      let totalDeleted = 0;

      // 1) Delete ALL subcollection docs via collection groups
      const deletedFines = await deleteCollectionGroupInBatches('fines');
      const deletedPayments = await deleteCollectionGroupInBatches('payments');
      const deletedDuePayments = await deleteCollectionGroupInBatches('duePayments');
      const deletedConsumptions = await deleteCollectionGroupInBatches('beverageConsumptions');
      totalDeleted += deletedFines + deletedPayments + deletedDuePayments + deletedConsumptions;

      // 2) Delete top-level collections
      const deletedDues = await deleteTopLevelCollectionInBatches('dues');
      const deletedBeverages = await deleteTopLevelCollectionInBatches('beverages');
      const deletedUsers = await deleteTopLevelCollectionInBatches('users');
      totalDeleted += deletedDues + deletedBeverages + deletedUsers;

      toast({
        title: "Alle Daten gelöscht",
        description: `Insgesamt ${totalDeleted} Dokumente gelöscht. Details: Fines ${deletedFines}, Payments ${deletedPayments}, DuePayments ${deletedDuePayments}, BeverageConsumptions ${deletedConsumptions}, Dues ${deletedDues}, Beverages ${deletedBeverages}, Users ${deletedUsers}.`,
      });

      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting all data:', error);
      toast({
        title: "Fehler beim Löschen",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAllSkipped = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(skippedItems.map((_, i) => i));
      setSelectedSkippedItems(allIndices);
    } else {
      setSelectedSkippedItems(new Set());
    }
  };

  const handleSelectSkippedItem = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedSkippedItems);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedSkippedItems(newSelected);
  };

  const handleForceImport = async () => {
    if (!firestore || selectedSkippedItems.size === 0) return;

    setIsForceImporting(true);
    try {
      let importedCount = 0;
      const itemsToImport = skippedItems.filter((_, i) => selectedSkippedItems.has(i));

      // Get all players for name lookup
      const playersSnapshot = await getDocs(collection(firestore, 'users'));
      const players = playersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Helper to find player by name
      const findPlayerId = (name: string) => {
        const normalized = name.toLowerCase().trim();
        const player = players.find(p => p.name.toLowerCase().trim() === normalized);
        return player ? player.id : null;
      };

      for (const item of itemsToImport) {
        const userId = findPlayerId(item.user);
        if (!userId) {
          console.warn(`Could not force import item for unknown user: ${item.user}`);
          continue;
        }

        const date = new Date(item.date).toISOString();

        if (item.type === 'fine') {
          await addDoc(collection(firestore, `users/${userId}/fines`), {
            id: generateId('fine'),
            userId,
            amount: item.amount,
            reason: item.reason,
            date,
            paid: item.paid,
            paidAt: item.paid ? date : null,
            createdAt: date
          });
        } else if (item.type === 'payment' || item.type === 'transaction') {
          await addDoc(collection(firestore, `users/${userId}/payments`), {
            id: generateId('payment'),
            userId,
            amount: item.amount,
            reason: item.reason,
            date,
            paid: true,
            paidAt: date,
            createdAt: date
          });
        } else if (item.type === 'due') {
          // Try to find the due by name
          const duesSnapshot = await getDocs(query(collection(firestore, 'dues'), where('name', '==', item.reason)));
          let dueId = null;
          if (!duesSnapshot.empty) {
            dueId = duesSnapshot.docs[0].id;
          }

          if (dueId) {
            await addDoc(collection(firestore, `users/${userId}/duePayments`), {
              id: generateId('dp'),
              dueId,
              userId,
              userName: item.user,
              amountDue: item.amount,
              paid: item.paid,
              paidAt: item.paid ? date : null,
              exempt: false,
              createdAt: date
            });
          } else {
            // Fallback: create as generic payment if due definition not found
            await addDoc(collection(firestore, `users/${userId}/payments`), {
              id: generateId('payment'),
              userId,
              amount: item.amount,
              reason: `Force Import Due: ${item.reason}`,
              date,
              paid: item.paid,
              paidAt: item.paid ? date : null,
              createdAt: date
            });
          }
        }
        importedCount++;
      }

      toast({
        title: "Force Import Successful",
        description: `Successfully imported ${importedCount} items.`,
      });

      // Remove imported items from the list
      const remainingItems = skippedItems.filter((_, i) => !selectedSkippedItems.has(i));
      setSkippedItems(remainingItems);
      setSelectedSkippedItems(new Set());

    } catch (error) {
      console.error("Error force importing:", error);
      toast({
        title: "Force Import Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsForceImporting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4">
        <h1 className="font-headline text-3xl font-bold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>General team settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Team settings will be available here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Language Settings</CardTitle>
            <CardDescription>Customize your language preferences.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-language-name">Show Language Name</Label>
              <p className="text-sm text-muted-foreground">
                Display the language name next to the flag in the header.
              </p>
            </div>
            <Switch
              id="show-language-name"
              checked={showLanguageName}
              onCheckedChange={setShowLanguageName}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Import</CardTitle>
            <CardDescription>
              Upload existing data from a file. Please use a CSV file with the correct format.
              File name must contain "dues", "transaction", or "punishment" to detect the type.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="import-file">CSV File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <Button
              className="w-fit"
              onClick={handleImport}
              disabled={!selectedFile || uploading || !isMounted || !isFirebaseAvailable}
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Importing...' : 'Import Data'}
            </Button>
            {uploading && importTotal > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing rows...</span>
                  <span>{importProgress} / {importTotal}</span>
                </div>
                <Progress value={(importProgress / importTotal) * 100} />
              </div>
            )}
            {uploadResult && (
              <p className={`text-sm ${uploadResult.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                {uploadResult}
              </p>
            )}

            {skippedItems.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="rounded-md border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-amber-800 font-medium">
                      <AlertCircle className="h-5 w-5" />
                      <span>Skipped Items ({skippedItems.length})</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleForceImport}
                      disabled={selectedSkippedItems.size === 0 || isForceImporting}
                      className="border-amber-200 hover:bg-amber-100 text-amber-900"
                    >
                      {isForceImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Force Import Selected ({selectedSkippedItems.size})
                    </Button>
                  </div>

                  <div className="rounded-md border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={selectedSkippedItems.size === skippedItems.length && skippedItems.length > 0}
                              onCheckedChange={handleSelectAllSkipped}
                            />
                          </TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Skip Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {skippedItems.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Checkbox
                                checked={selectedSkippedItems.has(i)}
                                onCheckedChange={(checked) => handleSelectSkippedItem(i, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">{item.user}</TableCell>
                            <TableCell>{item.reason}</TableCell>
                            <TableCell>€{item.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={item.paid ? "default" : "destructive"} className="text-[10px]">
                                {item.paid ? 'Paid' : 'Unpaid'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-amber-600 text-xs">{item.skipReason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Quality & Freshness */}
        <Card>
          <CardHeader>
            <CardTitle>Data Quality & Freshness</CardTitle>
            <CardDescription>Run-time checks on imported legacy data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-xs text-muted-foreground">
              Last data update: {(() => {
                const d = maxDateFromCollections([payments, fines, duePayments, beverageConsumptions]);
                return d ? <SafeLocaleDate dateString={d} /> : 'Unknown';
              })()}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(() => {
                const negFines = fines.filter(f => !f || Number(f.amount) <= 0).length;
                const orphanPayments = payments.filter(p => !p?.userId).length;
                const missingBevId = beverageConsumptions.filter(c => !c?.beverageId).length;
                const item = (label: string, count: number, help: string) => (
                  <div className="rounded border p-3">
                    <div className="text-sm text-muted-foreground">{label}</div>
                    <div className={`text-2xl font-bold ${count > 0 ? 'text-destructive' : 'text-positive'}`}>{count}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{help}</div>
                  </div>
                );
                return (
                  <>
                    {item('Negative/Zero Fines', negFines, 'Fines with amount <= 0')}
                    {item('Orphan Payments', orphanPayments, 'Payments without userId')}
                    {item('Consumptions missing beverageId', missingBevId, 'Katalog-Verknüpfung fehlt')}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Catalog Overviews */}
        <Card>
          <CardHeader>
            <CardTitle>Catalogs</CardTitle>
            <CardDescription>Dues and Beverages overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium">Dues</div>
                {liveDues.length > 0 ? (
                  <ul className="space-y-2">
                    {liveDues.map(d => (
                      <li key={d.id} className="flex items-center justify-between rounded border p-2">
                        <span className="truncate">{d.name}</span>
                        <span className="font-mono">€{Number(d.amount).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No dues configured.</p>
                )}
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Beverages</div>
                {liveBeverages.length > 0 ? (
                  <ul className="space-y-2">
                    {liveBeverages.map(b => (
                      <li key={b.id} className="flex items-center justify-between rounded border p-2">
                        <span className="truncate">{b.name}</span>
                        <span className="font-mono">€{Number(b.price).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No beverages configured.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Consistency Check */}
        <Card>
          <CardHeader>
            <CardTitle>Price Consistency</CardTitle>
            <CardDescription>Average consumed price per beverage vs. catalog price</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Build averages from beverageConsumptions
              const sumById = new Map<string, { sum: number; count: number }>();
              for (const c of beverageConsumptions) {
                if (!c?.beverageId || typeof c.amount !== 'number') continue;
                const cur = sumById.get(c.beverageId) || { sum: 0, count: 0 };
                cur.sum += Number(c.amount) || 0;
                cur.count += 1;
                sumById.set(c.beverageId, cur);
              }
              const byIdAvg = new Map<string, number>();
              sumById.forEach((v, k) => {
                if (v.count > 0) byIdAvg.set(k, v.sum / v.count);
              });

              // Compare to catalog (live Firestore beverages)
              const catalogById = new Map(liveBeverages.map(b => [b.id, b] as const));
              type Dev = { id: string; name: string; avg: number; catalog: number; pct: number };
              const deviations: Dev[] = [];
              byIdAvg.forEach((avg, id) => {
                const cat = catalogById.get(id);
                if (!cat || typeof cat.price !== 'number') return;
                const catalogPrice = Number(cat.price) || 0;
                if (catalogPrice <= 0) return;
                const pct = (avg - catalogPrice) / catalogPrice;
                // flag if >5% difference and at least €0.05
                if (Math.abs(pct) >= 0.05 && Math.abs(avg - catalogPrice) >= 0.05) {
                  deviations.push({ id, name: cat.name, avg, catalog: catalogPrice, pct });
                }
              });

              deviations.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
              const top = deviations.slice(0, 5);

              return (
                <div className="space-y-3">
                  <div className={`text-2xl font-bold ${deviations.length > 0 ? 'text-amber-700' : 'text-positive'}`}>{deviations.length} mismatch{deviations.length === 1 ? '' : 'es'}</div>
                  {top.length > 0 && (
                    <ul className="space-y-2">
                      {top.map(d => (
                        <li key={d.id} className="flex items-center justify-between rounded border p-2 text-sm">
                          <span className="truncate mr-2">{d.name}</span>
                          <span className="font-mono">avg {d.avg.toFixed(2)} € vs. {d.catalog.toFixed(2)} € ({(d.pct * 100).toFixed(1)}%)</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {byIdAvg.size === 0 && (
                    <p className="text-sm text-muted-foreground">No beverage consumptions to analyze.</p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are irreversible.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <div className="space-y-4 w-full">
              <div className="flex items-start gap-4">
                <Button
                  variant="destructive"
                  onClick={() => setShowResetDialog(true)}
                  disabled={isResetting || isDeleting || !isMounted || !isFirebaseAvailable}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset All Balances
                    </>
                  )}
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium">Reset All Balances</p>
                  <p className="text-sm text-muted-foreground">
                    Marks all transactions as paid. Players remain but all debts are cleared to 0€.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isResetting || isDeleting || !isMounted || !isFirebaseAvailable}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Data
                    </>
                  )}
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium">Delete All Data</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently deletes ALL players and ALL transactions. Cannot be undone!
                  </p>
                </div>
              </div>

              {isMounted && !isFirebaseAvailable && (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  ⚠️ Firebase ist derzeit nicht verfügbar. Diese Funktionen benötigen eine aktive Datenbankverbindung.
                  Bitte setze NEXT_PUBLIC_USE_FIREBASE=true in .env.local und starte den Server neu.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset All Balances Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Guthaben zurücksetzen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Diese Aktion wird alle offenen Transaktionen (Strafen, Beiträge, Getränke) als bezahlt markieren.
                  Alle Spieler-Guthaben werden auf 0€ gesetzt.
                </p>
                <p>
                  <strong>Die Spieler und die Transaction-History bleiben erhalten.</strong>
                </p>
                <p>
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetBalances}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird zurückgesetzt...
                </>
              ) : (
                "Ja, alle Guthaben zurücksetzen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Data Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Alle Daten löschen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <strong className="text-destructive">ACHTUNG: Diese Aktion löscht PERMANENT:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Alle Spieler</li>
                  <li>Alle Strafen</li>
                  <li>Alle Zahlungen</li>
                  <li>Alle Beiträge</li>
                  <li>Alle Getränke-Konsumierungen</li>
                </ul>
                <div className="mt-2">
                  <strong className="text-destructive">Die Datenbank wird komplett geleert!</strong>
                </div>
                <div className="mt-2">
                  Diese Aktion kann <strong>NICHT</strong> rückgängig gemacht werden.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                "Ja, ALLES löschen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
