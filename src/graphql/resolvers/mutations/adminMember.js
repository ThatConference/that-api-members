/* eslint-disable import/prefer-default-export */
import debug from 'debug';

import meritBadgeStore from '../../../dataSources/cloudFirestore/meritBadge';

const dlog = debug('that:api:members:mutation:AdminMemberMutation');

export const fieldResolvers = {
  AdminMemberMutation: {
    update: ({ id }) => {
      dlog('update called', id);
      throw new Error('not implemented');
    },
    deactivate: ({ id }, args, { dataSources: { firestore } }) => {
      dlog('cancel called');
      throw new Error('not implemented');
    },
    awardMeritBadge: (
      { id },
      { meritBadgeId },
      { dataSources: { firestore } },
    ) => {
      dlog('awardMeritBadge called. badgeId', meritBadgeId);

      return meritBadgeStore(firestore).awardMeritBadge(id, meritBadgeId);
    },
    delete: (parent, { id }, { dataSources: { firestore } }) => {
      dlog('delete called');
      throw new Error('not implemented yet');
    },
  },
};
