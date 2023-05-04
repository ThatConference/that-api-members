import debug from 'debug';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:query:admin');

export const fieldResolvers = {
  AdminMembersQuery: {
    members: (
      _,
      { pageSize = 200, cursor, orderBy },
      { dataSources: { firestore } },
    ) => {
      dlog(
        'resolver, AdminMembersQuery, members, orderBy: %s, pageSize: %d',
        orderBy,
        pageSize,
      );

      return memberStore(firestore).fetchAnyMembersPaged({
        orderBy,
        cursor,
        pageSize,
      });
    },
    patrons: (_, __, { dataSources: { firestore } }) => {
      dlog('getting any patrons');
      return memberStore(firestore).fetchAnyPatronMember();
    },
  },
};
