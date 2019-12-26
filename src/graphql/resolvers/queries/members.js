/* eslint-disable import/prefer-default-export */
import debug from 'debug';

// import sessionStore from '../../../dataSources/cloudFirestore/session';

const dlog = debug('that:api:members:query');

export const fieldResolvers = {
  MembersQuery: {
    me: async (parent, args, { dataSources: { firestore, logger } }) => {
      dlog('MembersQuery:XXX called');

      throw new Error('not implemented yet');
      // sessionStore(firestore, logger).get(id),
    },
  },
};
