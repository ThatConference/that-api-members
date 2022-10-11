import debug from 'debug';
import { dataSources } from '@thatconference/api';

import meritBadgesResolver from './earnedMeritBadges';
import dcStore from '../../../dataSources/cloudFirestore/discountCode';
import hubSpotActions from '../../../lib/hubSpotActions';

const dlog = debug('that:api:members:query:Profile');
const assetStore = dataSources.cloudFirestore.assets;
const entityType = 'MEMBER';

export const fieldResolvers = {
  Profile: {
    __resolveReference({ id }, { dataSources: { profileLoader } }) {
      dlog('resolveReference');
      return profileLoader.load(id);
    },
    earnedMeritBadges: meritBadgesResolver.earnedMeritBadges,
    assets: ({ id: entityId }, __, { dataSources: { firestore } }) => {
      dlog('assets for event called');
      return assetStore(firestore).findEntityAssets({
        entityId,
        entityType,
      });
    },
    following: ({ id, profileSlug }) => {
      dlog('following called');
      return { id, profileSlug };
    },

    discountCodes: ({ id: memberId }, __, { dataSources: { firestore } }) => {
      dlog('discountCodes called');
      return dcStore(firestore).findCodesForMember(memberId);
    },
    activePartnerId: ({ activePartnerId: id }) => id,
    newsletterSubscriptionStatus: ({ email }) => {
      // Only a lookup for now

      dlog('isSubscribedNewsletter called');
      return hubSpotActions.findContactNewletterSubscription(email);
    },
  },
};
