/* eslint-disable import/prefer-default-export */
import debug from 'debug';

const dlog = debug('that:api:members:mutation:AdminMembersMutation');

export const fieldResolvers = {
  AdminMembersMutation: {
    create: () => {
      dlog('create called');
      return new Error('not implemented');
    },

    member: (_, { id }) => {
      dlog('session called');
      return { id };
    },
  },
};
