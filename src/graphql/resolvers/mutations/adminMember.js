/* eslint-disable import/prefer-default-export */
import debug from 'debug';

const dlog = debug('that:api:members:mutation:AdminMemberMutation');

export const fieldResolvers = {
  AdminMemberMutation: {
    update: ({ id }) => {
      dlog('update called', id);
      return { id };
    },
    disable: ({ id }, args, { dataSources: { firestore } }) => {
      dlog('cancel called');
      throw new Error('not implemented');
      // sessionStore(firestore, logger).get(id),
    },
    assignMeritBadge: (
      { id },
      { meritBadgeId },
      { dataSources: { firestore } },
    ) => {
      dlog('assignMeritBadge called. badgeId', meritBadgeId);

      throw new Error('not implemented');
    },
    delete: (parent, { id }, { dataSources: { firestore } }) => {
      dlog('delete called');
      throw new Error('not implemented yet');
    },
  },
};
