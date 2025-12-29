export function extractClubIdFromClubMemberPath(path: string): string | null {
  // Expected: clubs/{clubId}/clubMembers/{uid}
  const parts = path.split('/').filter(Boolean);
  const clubsIndex = parts.indexOf('clubs');
  if (clubsIndex < 0) return null;

  const clubId = parts[clubsIndex + 1];
  const maybeMembers = parts[clubsIndex + 2];
  if (!clubId || maybeMembers !== 'clubMembers') return null;

  return clubId;
}

export function chooseInitialClubId(params: {
  persistedClubId: string | null;
  availableClubIds: string[];
}): string | null {
  const { persistedClubId, availableClubIds } = params;

  // Optimized for creation flow:
  // Trust the persisted ID if it exists, even if it's not yet in availableClubIds.
  if (persistedClubId) {
    return persistedClubId;
  }

  if (availableClubIds.length === 1) {
    return availableClubIds[0] ?? null;
  }

  return null;
}
