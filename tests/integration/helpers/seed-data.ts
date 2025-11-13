/**
 * Seed Data Helpers for Integration Tests
 * Provides utilities for creating test data in Firestore emulator
 */

import {
  collection,
  doc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type {
  Player,
  Fine,
  Payment,
  Due,
  DuePayment,
  Beverage,
  BeverageConsumption,
} from '@/lib/types';

/**
 * Seed a player into Firestore
 * @param firestore Firestore instance
 * @param player Player data
 * @returns Player ID
 */
export async function seedPlayer(firestore: Firestore, player: Player): Promise<string> {
  const playerRef = doc(firestore, 'users', player.id);
  const batch = writeBatch(firestore);
  batch.set(playerRef, player);
  await batch.commit();
  return player.id;
}

/**
 * Seed multiple players into Firestore
 * @param firestore Firestore instance
 * @param players Array of players
 * @returns Array of player IDs
 */
export async function seedPlayers(firestore: Firestore, players: Player[]): Promise<string[]> {
  const batch = writeBatch(firestore);

  players.forEach(player => {
    const playerRef = doc(firestore, 'users', player.id);
    batch.set(playerRef, player);
  });

  await batch.commit();
  return players.map(p => p.id);
}

/**
 * Seed a fine into Firestore (in user subcollection)
 * @param firestore Firestore instance
 * @param userId User ID
 * @param fine Fine data
 * @returns Fine ID
 */
export async function seedFine(
  firestore: Firestore,
  userId: string,
  fine: Fine
): Promise<string> {
  const fineRef = doc(firestore, `users/${userId}/fines`, fine.id);
  const batch = writeBatch(firestore);
  batch.set(fineRef, fine);
  await batch.commit();
  return fine.id;
}

/**
 * Seed multiple fines into Firestore
 * @param firestore Firestore instance
 * @param userId User ID
 * @param fines Array of fines
 * @returns Array of fine IDs
 */
export async function seedFines(
  firestore: Firestore,
  userId: string,
  fines: Fine[]
): Promise<string[]> {
  const batch = writeBatch(firestore);

  fines.forEach(fine => {
    const fineRef = doc(firestore, `users/${userId}/fines`, fine.id);
    batch.set(fineRef, fine);
  });

  await batch.commit();
  return fines.map(f => f.id);
}

/**
 * Seed a payment into Firestore (in user subcollection)
 * @param firestore Firestore instance
 * @param userId User ID
 * @param payment Payment data
 * @returns Payment ID
 */
export async function seedPayment(
  firestore: Firestore,
  userId: string,
  payment: Payment
): Promise<string> {
  const paymentRef = doc(firestore, `users/${userId}/payments`, payment.id);
  const batch = writeBatch(firestore);
  batch.set(paymentRef, payment);
  await batch.commit();
  return payment.id;
}

/**
 * Seed multiple payments into Firestore
 * @param firestore Firestore instance
 * @param userId User ID
 * @param payments Array of payments
 * @returns Array of payment IDs
 */
export async function seedPayments(
  firestore: Firestore,
  userId: string,
  payments: Payment[]
): Promise<string[]> {
  const batch = writeBatch(firestore);

  payments.forEach(payment => {
    const paymentRef = doc(firestore, `users/${userId}/payments`, payment.id);
    batch.set(paymentRef, payment);
  });

  await batch.commit();
  return payments.map(p => p.id);
}

/**
 * Seed a due into Firestore
 * @param firestore Firestore instance
 * @param due Due data
 * @returns Due ID
 */
export async function seedDue(firestore: Firestore, due: Due): Promise<string> {
  const dueRef = doc(firestore, 'dues', due.id);
  const batch = writeBatch(firestore);
  batch.set(dueRef, due);
  await batch.commit();
  return due.id;
}

/**
 * Seed a due payment into Firestore (in user subcollection)
 * @param firestore Firestore instance
 * @param userId User ID
 * @param duePayment Due payment data
 * @returns Due payment ID
 */
export async function seedDuePayment(
  firestore: Firestore,
  userId: string,
  duePayment: DuePayment
): Promise<string> {
  const duePaymentRef = doc(firestore, `users/${userId}/duePayments`, duePayment.id);
  const batch = writeBatch(firestore);
  batch.set(duePaymentRef, duePayment);
  await batch.commit();
  return duePayment.id;
}

/**
 * Seed a beverage into Firestore
 * @param firestore Firestore instance
 * @param beverage Beverage data
 * @returns Beverage ID
 */
export async function seedBeverage(firestore: Firestore, beverage: Beverage): Promise<string> {
  const beverageRef = doc(firestore, 'beverages', beverage.id);
  const batch = writeBatch(firestore);
  batch.set(beverageRef, beverage);
  await batch.commit();
  return beverage.id;
}

/**
 * Seed a beverage consumption into Firestore (in user subcollection)
 * @param firestore Firestore instance
 * @param userId User ID
 * @param consumption Beverage consumption data
 * @returns Consumption ID
 */
export async function seedBeverageConsumption(
  firestore: Firestore,
  userId: string,
  consumption: BeverageConsumption
): Promise<string> {
  const consumptionRef = doc(firestore, `users/${userId}/beverageConsumptions`, consumption.id);
  const batch = writeBatch(firestore);
  batch.set(consumptionRef, consumption);
  await batch.commit();
  return consumption.id;
}

/**
 * Clear all data from a collection
 * @param firestore Firestore instance
 * @param collectionPath Collection path
 */
export async function clearCollection(firestore: Firestore, collectionPath: string): Promise<void> {
  const { getDocs, collection, writeBatch } = await import('firebase/firestore');
  const collectionRef = collection(firestore, collectionPath);
  const snapshot = await getDocs(collectionRef);

  if (snapshot.empty) return;

  const batch = writeBatch(firestore);
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

/**
 * Clear all test data from Firestore
 * @param firestore Firestore instance
 */
export async function clearAllTestData(firestore: Firestore): Promise<void> {
  await Promise.all([
    clearCollection(firestore, 'users'),
    clearCollection(firestore, 'dues'),
    clearCollection(firestore, 'beverages'),
  ]);
}
