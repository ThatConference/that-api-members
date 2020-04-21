import debug from 'debug';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:query');

export const fieldResolvers = {
  MembersQuery: {
    all: (_, __, { dataSources: { firestore } }) => {
      dlog('all members (public)');
      return memberStore(firestore).getPublicMembers();
    },
    members: (_, { pageSize = 5, after }, { dataSources: { firestore } }) => {
      dlog('resolver, MembersQuery, members');
      return memberStore(firestore).fetchPublicMember(pageSize, after);
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
