import debug from 'debug';

import memberStore from '../../../dataSources/cloudFirestore/member';
import meritBadgeStore from '../../../dataSources/cloudFirestore/meritBadge';

const dlog = debug('that:api:members:mutation:AdminMemberMutation');

export const fieldResolvers = {
  AdminMemberMutation: {
    update: (
      { id: memberId },
      { member: upProfile },
      { dataSources: { firestore } },
    ) => {
      dlog('update called on %s with %o', memberId, upProfile);

      return memberStore(firestore).update({ memberId, profile: upProfile });
    },
    deactivate: ({ id: memberId }, __, { dataSources: { firestore } }) => {
      dlog('deactivate member called on %s', memberId);

      return memberStore(firestore).deactivate(memberId);
    },
    awardMeritBadge: (
      { id },
      { meritBadgeId },
      { dataSources: { firestore } },
    ) => {
      dlog('awardMeritBadge called. badgeId', meritBadgeId);

      return meritBadgeStore(firestore).awardMeritBadge(id, meritBadgeId);
    },
    delete: () => {
      dlog('delete called');
      throw new Error('not implemented');
    },
  },
};
