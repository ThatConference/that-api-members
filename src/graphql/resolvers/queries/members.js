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
      let result = {};
      if (!orderBy || orderBy === 'CREATEDAT') {
        result = memberStore(firestore).fetchPublicMembersByCreated(
          pageSize,
          after,
        );
      }
      if (orderBy === 'FIRSTNAME') {
        result = memberStore(firestore).fetchPublicMembersByFirstName(
          pageSize,
          after,
        );
      }
      return result;
    },
    member: (_, { slug }, { dataSources: { firestore } }) => {
      dlog('member called');
      return memberStore(firestore).findMember(slug);
    },

    me: (parent, args, { dataSources: { firestore }, user }) => {
      dlog('MembersQuery:me called');
      return memberStore(firestore).findMe(user.sub);
    },

    network: () => ({}),

    isProfileSlugTaken: (_, { slug }, { dataSources: { firestore } }) => {
      dlog('isProfileSlugUnique called');
      return memberStore(firestore).isProfileSlugTaken(slug);
    },

    profiles: (_, __, { user }) => {
      dlog('profiles path called for member %s', user.sub);
      return { memberId: user.sub };
    },

    admin: () => ({}),
  },
};
