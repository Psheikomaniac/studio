export function extractTeamIdFromTeamMemberPath(path: string): string | null {
  // Expected: teams/{teamId}/teamMembers/{uid}
  const parts = path.split('/').filter(Boolean);
  const teamsIndex = parts.indexOf('teams');
  if (teamsIndex < 0) return null;

  const teamId = parts[teamsIndex + 1];
  const maybeTeamMembers = parts[teamsIndex + 2];
  if (!teamId || maybeTeamMembers !== 'teamMembers') return null;

  return teamId;
}

export function chooseInitialTeamId(params: {
  persistedTeamId: string | null;
  availableTeamIds: string[];
}): string | null {
  const { persistedTeamId, availableTeamIds } = params;

  if (persistedTeamId && availableTeamIds.includes(persistedTeamId)) {
    return persistedTeamId;
  }

  if (availableTeamIds.length === 1) {
    return availableTeamIds[0] ?? null;
  }

  return null;
}
