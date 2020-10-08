import debug from 'debug';

const dlog = debug('that:api:members:datasources:sessions');
const collectionName = 'sessions';
const activeSessionStatuses = ['ACCEPTED', 'SCHEDULED'];

const session = dbInstance => {
  dlog('session db instance created');
  const sessionsCol = dbInstance.collection(collectionName);

  async function findMembersAcceptedSessions({ memberId }) {
    dlog('find active sessions for member %s', memberId);

    const { docs } = await sessionsCol
      .where('speakers', 'array-contains', memberId)
      .where('status', 'in', activeSessionStatuses)
      .select()
      .orderBy('startTime')
      .get();

    return docs.map(s => ({ id: s.id }));
  }

  async function findMembersAcceptedSessionsFromDate({ memberId, fromDate }) {
    dlog('find active sessions for member %s from date %s', memberId, fromDate);

    const { docs } = await sessionsCol
      .where('speakers', 'array-contains', memberId)
      .where('status', 'in', activeSessionStatuses)
      .where('startTime', '>=', fromDate)
      .select()
      .orderBy('startTime')
      .get();

    return docs.map(s => ({ id: s.id }));
  }

  async function findMembersAcceptedSessionsBeforeDate({
    memberId,
    beforeDate,
  }) {
    dlog(
      'find active session for member %s before date %s',
      memberId,
      beforeDate,
    );

    const { docs } = await sessionsCol
      .where('speakers', 'array-contains', memberId)
      .where('status', 'in', activeSessionStatuses)
      .where('startTime', '<', beforeDate)
      .select()
      .orderBy('startTime', 'desc')
      .get();

    return docs.map(s => ({ id: s.id }));
  }

  return {
    findMembersAcceptedSessions,
    findMembersAcceptedSessionsFromDate,
    findMembersAcceptedSessionsBeforeDate,
  };
};

export default session;
