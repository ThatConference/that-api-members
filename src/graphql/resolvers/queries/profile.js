import debug from 'debug';

import meritBadgesResolver from './earnedMeritBadges';

const dlog = debug('that:api:members:query:Profile');

export const fieldResolvers = {
  Profile: {
    __resolveReference({ id }, { dataSources: { profileLoader } }) {
      dlog('resolveReference');
      return profileLoader.load(id);
    },
    earnedMeritBadges: meritBadgesResolver.earnedMeritBadges,

    following: ({ id, profileSlug }) => {
      dlog('following called');
      return { id, profileSlug };
    },
  },
};
