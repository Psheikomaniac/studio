/**
 * PredefinedFinesService - Manages team-scoped predefined fines catalog in Firestore
 * Handles CRUD operations and default seeding for predefined fines
 */

'use client';

import {
  collection,
  query,
  orderBy,
  type Firestore,
} from 'firebase/firestore';
import { BaseFirebaseService } from './base.service';
import type { ServiceResult } from './types';
import type { PredefinedFine } from '@/lib/types';
import { useMemoFirebase, useCollection } from '@/firebase';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';

/**
 * Default predefined fines seeded for new teams
 */
const DEFAULT_PREDEFINED_FINES: Omit<PredefinedFine, 'id' | 'teamId' | 'createdAt' | 'updatedAt'>[] = [
  { reason: 'Late for training', amount: 5.00 },
  { reason: 'Late for game', amount: 10.00 },
  { reason: 'Yellow card (foul)', amount: 5.00 },
  { reason: 'Yellow card (dissent)', amount: 7.50 },
  { reason: 'Red card', amount: 20.00 },
  { reason: 'Forgot equipment', amount: 2.50 },
  { reason: 'Phone in locker room', amount: 1.00 },
];

/**
 * Service class for managing predefined fines (Strafkatalog) per team
 * Stored at: teams/{teamId}/predefinedFines/{id}
 */
export class PredefinedFinesService extends BaseFirebaseService<PredefinedFine> {
  private teamId: string;

  static collectionPath(teamId: string): string {
    return `teams/${teamId}/predefinedFines`;
  }

  constructor(firestore: Firestore, teamId: string) {
    super(firestore, PredefinedFinesService.collectionPath(teamId));
    this.teamId = teamId;
  }

  /**
   * Seed the default predefined fines for a team
   * Creates 7 standard fines commonly used in sports teams
   *
   * @returns Service result with array of created predefined fines
   */
  async seedDefaults(): Promise<ServiceResult<PredefinedFine[]>> {
    try {
      const result = await this.batchCreate(
        DEFAULT_PREDEFINED_FINES.map(fine => ({
          ...fine,
          teamId: this.teamId,
        }))
      );

      if (result.failed > 0) {
        return {
          success: false,
          error: new Error(`Failed to seed ${result.failed} predefined fines`),
        };
      }

      // Fetch all created fines
      const allResult = await this.getAll();
      return allResult as ServiceResult<PredefinedFine[]>;
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }
}

/**
 * Hook to subscribe to a team's predefined fines in real-time
 *
 * @param teamId Team ID
 * @returns Hook result with predefined fines array, loading state, and error
 */
export function useTeamPredefinedFines(teamId: string | null | undefined) {
  const firebase = useFirebaseOptional();

  const predefinedFinesQuery = useMemoFirebase(() => {
    if (!teamId || !firebase?.firestore) return null;
    const col = collection(firebase.firestore, PredefinedFinesService.collectionPath(teamId));
    return query(col, orderBy('reason', 'asc'));
  }, [firebase?.firestore, teamId]);

  return useCollection<PredefinedFine>(predefinedFinesQuery);
}
