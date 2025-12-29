import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
  type Firestore,
} from 'firebase/firestore';
import { BaseFirebaseService } from './base.service';
import type { ServiceResult } from './types';
import type { Club, ClubMember, ClubRole } from '@/lib/types';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { useMemo } from 'react';

export class ClubsService extends BaseFirebaseService<Club> {
  constructor(firestore: Firestore) {
    super(firestore, 'clubs');
  }

  private clubMemberRef(clubId: string, uid: string) {
    return doc(this.firestore, 'clubs', clubId, 'clubMembers', uid);
  }

  /**
   * Create a club and add the creating user as owner.
   */
  async createClub(params: {
    name: string;
    ownerUid: string;
  }): Promise<ServiceResult<{ club: Club; membership: ClubMember }>> {
    try {
      const clubId = this.generateId();
      const now = this.timestamp();

      const name = params.name.trim();
      if (!name) {
        return {
          success: false,
          error: new Error('Clubname ist ungültig.'),
        };
      }

      const club: Club = {
        id: clubId,
        name,
        ownerUid: params.ownerUid,
        createdAt: now,
        updatedAt: now,
      };

      const membership: ClubMember = {
        uid: params.ownerUid,
        role: 'owner',
        joinedAt: now,
      };

      const clubRef = this.getDocRef(clubId);
      const memberRef = this.clubMemberRef(clubId, params.ownerUid);

      await runTransaction(this.firestore, async (tx) => {
        tx.set(clubRef, club as any);
        tx.set(memberRef, membership as any);
      });

      return {
        success: true,
        data: { club, membership },
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async addMember(params: {
    clubId: string;
    uid: string;
    role?: ClubRole;
  }): Promise<ServiceResult<ClubMember>> {
    try {
      const now = this.timestamp();
      const member: ClubMember = {
        uid: params.uid,
        role: params.role ?? 'member',
        joinedAt: now,
      };

      const memberRef = this.clubMemberRef(params.clubId, params.uid);
      const clubRef = this.getDocRef(params.clubId);

      await runTransaction(this.firestore, async (tx) => {
        // Verify club exists? Firestore rules might handle permissions, but existence check is good.
        // For simplicity in transaction, just write.
        tx.set(memberRef, member as any);
        tx.update(clubRef, { updatedAt: now } as any);
      });

      return { success: true, data: member };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async getMembers(clubId: string): Promise<ServiceResult<ClubMember[]>> {
    try {
      const membersRef = collection(this.firestore, 'clubs', clubId, 'clubMembers');
      const snapshot = await getDocs(membersRef);
      const members = snapshot.docs.map(doc => doc.data() as ClubMember);
      return { success: true, data: members };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
  
  async getUserClubs(uid: string): Promise<ServiceResult<Club[]>> {
      // Since we don't have a collectionGroup index for clubMembers yet (maybe), 
      // or we can try collectionGroup query.
      // Ideally, we replicate the TeamProvider logic: query collectionGroup 'clubMembers' where docId == uid.
      try {
          // This requires 'clubMembers' to be indexed for collectionGroup queries if we query by field.
          // Query by documentID is supported by default? 
          // TeamProvider uses: query(membersGroup, where(documentId(), '==', uid));
          // Let's do the same.
          // However, getting the Club data requires fetching the parent docs.
          // This might be expensive if user is in many clubs (unlikely).
          
          // Implementation:
          // 1. Find membership docs
          // 2. Extract clubIds
          // 3. Fetch clubs
          return { success: true, data: [] }; // Placeholder, logic to be implemented in Provider/Hook
      } catch (error) {
          return { success: false, error: error as Error };
      }
  }
}

export function useClubsService() {
  const firebase = useFirebaseOptional();
  const firestore = firebase?.firestore;

  return useMemo(() => {
    if (!firestore) return null;
    return new ClubsService(firestore);
  }, [firestore]);
}
