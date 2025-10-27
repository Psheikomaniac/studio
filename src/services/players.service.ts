/**
 * PlayersService - Manages player data in Firestore
 * Handles CRUD operations for players with real-time hooks
 */

'use client';

import {
  collection,
  doc,
  query,
  orderBy,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { useMemo } from 'react';
import { BaseFirebaseService } from './base.service';
import type { ServiceResult, CreateOptions, UpdateOptions, DeleteOptions } from './types';
import type { Player } from '@/lib/types';
import { useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Service class for managing players
 * Extends BaseFirebaseService to provide player-specific operations
 */
export class PlayersService extends BaseFirebaseService<Player> {
  constructor(firestore: Firestore) {
    super(firestore, 'users');
  }

  /**
   * Create a new player
   * @param playerData Player data without id, createdAt, updatedAt
   * @param options Create options (userId, customId)
   * @returns Service result with created player
   */
  async createPlayer(
    playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
    options: CreateOptions = {}
  ): Promise<ServiceResult<Player>> {
    return this.create(playerData as any, options);
  }

  /**
   * Create a new player (non-blocking)
   * @param playerData Player data without id
   * @param options Create options (userId, customId)
   * @returns Player ID
   */
  createPlayerNonBlocking(
    playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>,
    options: CreateOptions = {}
  ): string {
    const id = options.customId || this.generateId();
    const now = this.timestamp();

    const fullData = {
      ...playerData,
      id,
      createdAt: now,
      updatedAt: now,
      ...(options.userId && { createdBy: options.userId, updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(id);
    setDocumentNonBlocking(docRef, fullData, {});

    return id;
  }

  /**
   * Update an existing player
   * @param playerId Player ID
   * @param playerData Partial player data to update
   * @param options Update options (userId)
   * @returns Service result with updated player
   */
  async updatePlayer(
    playerId: string,
    playerData: Partial<Omit<Player, 'id'>>,
    options: UpdateOptions = {}
  ): Promise<ServiceResult<Player>> {
    return this.update(playerId, playerData as any, options);
  }

  /**
   * Update an existing player (non-blocking)
   * @param playerId Player ID
   * @param playerData Partial player data to update
   * @param options Update options (userId)
   */
  updatePlayerNonBlocking(
    playerId: string,
    playerData: Partial<Omit<Player, 'id'>>,
    options: UpdateOptions = {}
  ): void {
    const now = this.timestamp();
    const updateData = {
      ...playerData,
      updatedAt: now,
      ...(options.userId && { updatedBy: options.userId }),
    };

    const docRef = this.getDocRef(playerId);
    updateDocumentNonBlocking(docRef, updateData);
  }

  /**
   * Delete a player
   * @param playerId Player ID
   * @param options Delete options (soft delete, userId)
   * @returns Service result indicating success or failure
   */
  async deletePlayer(
    playerId: string,
    options: DeleteOptions = {}
  ): Promise<ServiceResult<void>> {
    return this.delete(playerId, options);
  }

  /**
   * Delete a player (non-blocking)
   * @param playerId Player ID
   * @param options Delete options (soft delete, userId)
   */
  deletePlayerNonBlocking(
    playerId: string,
    options: DeleteOptions = {}
  ): void {
    if (options.soft) {
      // Soft delete: mark as deleted
      this.updatePlayerNonBlocking(playerId, {
        deleted: true,
        deletedAt: this.timestamp(),
        ...(options.userId && { deletedBy: options.userId }),
      } as any);
    } else {
      // Hard delete: remove from Firestore
      const docRef = this.getDocRef(playerId);
      deleteDocumentNonBlocking(docRef);
    }
  }

  /**
   * Get reference to a player document
   * @param playerId Player ID
   * @returns DocumentReference for the player
   */
  getPlayerRef(playerId: string): DocumentReference {
    return doc(this.firestore, 'users', playerId);
  }

  /**
   * Get reference to the players collection
   * @returns CollectionReference for players
   */
  getPlayersCollectionRef(): CollectionReference {
    return collection(this.firestore, 'users');
  }
}

/**
 * Hook to get the PlayersService instance
 * @returns PlayersService instance
 * @example
 * const playersService = usePlayersService();
 * await playersService.createPlayer({ name: 'John Doe', ... });
 */
export function usePlayersService(): PlayersService {
  const firestore = useFirestore();
  return useMemo(() => new PlayersService(firestore), [firestore]);
}

/**
 * Hook to subscribe to all players in real-time
 * @returns Hook result with players array, loading state, and error
 * @example
 * const { data: players, isLoading, error } = usePlayers();
 */
export function usePlayers() {
  const firestore = useFirestore();

  const playersQuery = useMemoFirebase(() => {
    const playersCol = collection(firestore, 'users');
    return query(playersCol, orderBy('name', 'asc'));
  }, [firestore]);

  return useCollection<Player>(playersQuery);
}

/**
 * Hook to subscribe to a single player in real-time
 * @param playerId Player ID to fetch
 * @returns Hook result with player data, loading state, and error
 * @example
 * const { data: player, isLoading, error } = usePlayer(playerId);
 */
export function usePlayer(playerId: string | null | undefined) {
  const firestore = useFirestore();

  const playerRef = useMemoFirebase(() => {
    if (!playerId) return null;
    return doc(firestore, 'users', playerId);
  }, [firestore, playerId]);

  return useDoc<Player>(playerRef);
}
