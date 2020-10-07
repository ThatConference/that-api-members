import debug from 'debug';

const dlog = debug('that:api:members:datasources:sessions');
const collectionName = 'sessions';
const approvedSessionStatuses = ['ACCEPTED', 'SCHEDULED', 'CANCELLED'];

const session = dbInstance => {
  dlog('session db instance created');
  const sessionsCol = dbInstance.collection(collectionName);

  async function findMembersAcceptedSessions({ memberId }) {
    dlog('find active sessions for member %s', memberId);

    const { docs } = await sessionsCol
      .where('speakers', 'array-contains', memberId)
      .where('status', 'in', approvedSessionStatuses)
      .select()
      .get();

    return docs.map(s => ({ id: s.id }));
  }

  return { findMembersAcceptedSessions };
};

export default session;
