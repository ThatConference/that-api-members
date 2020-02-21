import debug from 'debug';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:query');

export const fieldResolvers = {
  MembersQuery: {
    member: (_, { slug }, { dataSources: { firestore, logger } }) => {
      dlog('member called');
      return memberStore(firestore, logger).findMember(slug);
    },

    me: (parent, args, { dataSources: { firestore, logger }, user }) => {
      dlog('MembersQuery:me called');
      return memberStore(firestore, logger).findMe(user.sub);
    },

    isProfileSlugTaken: (
      _,
      { slug },
      { dataSources: { firestore, logger } },
    ) => {
      dlog('isProfileSlugUnique called');
      return memberStore(firestore, logger).isProfileSlugTaken(slug);
    },
  },
};
