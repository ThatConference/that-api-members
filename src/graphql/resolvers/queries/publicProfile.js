import debug from 'debug';

import meritBadgesResolver from './earnedMeritBadges';

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
  },
};
