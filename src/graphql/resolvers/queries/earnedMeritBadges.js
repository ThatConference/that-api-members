import debug from 'debug';
import meritBadgeStore from '../../../dataSources/cloudFirestore/meritBadge';

const dlog = debug('that:api:events:query');

const resolvers = {
  earnedMeritBadges: (parent, { memberId }, { dataSources: { firestore } }) => {
    dlog('meritBadges');

    const id = memberId || parent.id;
    return meritBadgeStore(firestore).findAllEarnedBadges(id);
  },
};

export default resolvers;
