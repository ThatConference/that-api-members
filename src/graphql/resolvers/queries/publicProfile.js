import debug from 'debug';

import meritBadgesResolver from './earnedMeritBadges';
import sessionStore from '../../../dataSources/cloudFirestore/session';

const dlog = debug('that:api:members:query:PublicProfile');

export const fieldResolvers = {
  PublicProfile: {
    async __resolveReference({ id }, { dataSources: { profileLoader } }) {
      dlog('resolveReference');
      const user = await profileLoader.load(id);

      if (!user.canFeature) return null;

      return user;
    },
    earnedMeritBadges: meritBadgesResolver.earnedMeritBadges,
    sessions: ({ id }, __, { dataSources: { firestore } }) => {
      dlog('sessions for %s', id);
      return sessionStore(firestore).findMembersAcceptedSessions({
        memberId: id,
      });
    },
  },
};
