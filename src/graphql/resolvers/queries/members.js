import debug from 'debug';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:query');

export const fieldResolvers = {
  MembersQuery: {
    members: (
      _,
      { pageSize = 20, after, orderBy },
      { dataSources: { firestore } },
    ) => {
      dlog('resolver, MembersQuery, members, orderBy: %s', orderBy);
      if (!orderBy || orderBy === 'CREATEDBY') {
        return memberStore(firestore).fetchPublicMembersByCreated(
          pageSize,
          after,
        );
      }
      if (orderBy === 'FIRSTNAME') {
        return memberStore(firestore).fetchPublicMembersByFirstName(
          pageSize,
          after,
        );
      }
      return {};
    },
    member: (_, { slug }, { dataSources: { firestore } }) => {
      dlog('member called');
      return memberStore(firestore).findMember(slug);
    },

    me: (parent, args, { dataSources: { firestore }, user }) => {
      dlog('MembersQuery:me called');
      return memberStore(firestore).findMe(user.sub);
    },

    isProfileSlugTaken: (_, { slug }, { dataSources: { firestore } }) => {
      dlog('isProfileSlugUnique called');
      return memberStore(firestore).isProfileSlugTaken(slug);
    },
  },
};
