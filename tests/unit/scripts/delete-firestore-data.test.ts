import { describe, it, expect, vi } from 'vitest';

import { deleteAuthUsersInBatches } from '../../../scripts/delete-firestore-data';

function createAuthMock(pages: Array<{ uids: string[]; nextPageToken?: string }>) {
  const listUsers = vi.fn(async (_max?: number, pageToken?: string) => {
    const idx = pageToken ? Number(pageToken) : 0;
    const page = pages[idx] ?? { uids: [], nextPageToken: undefined };
    return {
      users: page.uids.map((uid) => ({ uid })),
      pageToken: page.nextPageToken,
    };
  });

  const deleteUser = vi.fn(async (_uid: string) => {});

  return { listUsers, deleteUser };
}

describe('delete-firestore-data (script helpers)', () => {
  it('deleteAuthUsersInBatches should delete all users in a single page', async () => {
    const auth = createAuthMock([{ uids: ['u1', 'u2'] }]);

    const deleted = await deleteAuthUsersInBatches(auth);

    expect(deleted).toBe(2);
    expect(auth.deleteUser).toHaveBeenCalledTimes(2);
    expect(auth.deleteUser).toHaveBeenCalledWith('u1');
    expect(auth.deleteUser).toHaveBeenCalledWith('u2');
  });

  it('deleteAuthUsersInBatches should handle pagination via pageToken', async () => {
    const auth = createAuthMock([
      { uids: ['u1'], nextPageToken: '1' },
      { uids: ['u2', 'u3'] },
    ]);

    const deleted = await deleteAuthUsersInBatches(auth);

    expect(deleted).toBe(3);
    expect(auth.listUsers).toHaveBeenCalledTimes(2);
    expect(auth.deleteUser).toHaveBeenCalledTimes(3);
  });

  it('deleteAuthUsersInBatches should return 0 when no users exist', async () => {
    const auth = createAuthMock([{ uids: [] }]);

    const deleted = await deleteAuthUsersInBatches(auth);

    expect(deleted).toBe(0);
    expect(auth.deleteUser).not.toHaveBeenCalled();
  });
});
