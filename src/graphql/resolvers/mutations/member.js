/* eslint-disable import/prefer-default-export */
import debug from 'debug';

// import sessionStore from '../../../dataSources/cloudFirestore/session';

const dlog = debug('that:api:members:mutation');

export const fieldResolvers = {
  MemberMutation: {
    update: async (
      { sessionId },
      { session },
      { dataSources: { firestore, logger } },
    ) => {
      dlog('MembersMutation:update called');
      throw new Error('not implemented yet');
      // sessionStore(firestore, logger).get(id),
    },
  },
};
