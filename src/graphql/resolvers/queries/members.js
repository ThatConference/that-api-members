/* eslint-disable import/prefer-default-export */
import debug from 'debug';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:query');

export const fieldResolvers = {
  MembersQuery: {
    member: async (_, { slug }, { dataSources: { firestore, logger } }) => {
      dlog('member called');
      return memberStore(firestore, logger).findMember(slug);
    },

    me: async (parent, args, { dataSources: { firestore, logger }, user }) => {
      dlog('MembersQuery:me called');
      return memberStore(firestore, logger).findMe(user.sub);
    },

    isProfileSlugTaken: async (
      _,
      { slug },
      { dataSources: { firestore, logger } },
    ) => {
      dlog('isProfileSlugUnique called');
      return memberStore(firestore, logger).isProfileSlugTaken(slug);
    },
  },
};
