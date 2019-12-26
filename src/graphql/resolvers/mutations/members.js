/* eslint-disable import/prefer-default-export */
import debug from 'debug';

// import sessionStore from '../../../dataSources/cloudFirestore/session';

const dlog = debug('that:api:members:mutation');

export const fieldResolvers = {
  MembersMutation: {
    create: async (
      parent,
      { profile },
      { dataSources: { firestore, logger } },
    ) => {
      dlog('MembersMutation:create called');
      dlog(profile);
      // throw new Error('not implemented yet');
      return {
        id: '1234',
        firstName: 'foo',
        lastName: 'bar',
      };
      // sessionStore(firestore, logger).get(id),
    },
    delete: async (parent, { id }, { dataSources: { firestore, logger } }) => {
      dlog('MembersMutation:delete called');
      throw new Error('not implemented yet');
      // sessionStore(firestore, logger).get(id),
    },
    member: async (parent, { id }) => {
      dlog('MembersMutation:session called');
      return { sessionId: id };
    },
  },
};
