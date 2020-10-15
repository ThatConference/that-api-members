import debug from 'debug';
import { dataSources } from '@thatconference/api';
import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:query:memberFollowing');
const favoriteStore = dataSources.cloudFirestore.favorites;
const favoriteType = 'member';

export const fieldResolvers = {
  MemberFollowingQuery: {
    ids: ({ id: memberId }, __, { dataSources: { firestore } }) => {
      dlog('ids called');
      // Note this query may return ID's which are now private or deactivated
      return favoriteStore(firestore)
        .getFavoritedIdsForMember({
          memberId,
          favoriteType,
        })
        .then(m => m.map(r => r.favoritedId));
    },
    profiles: async (
      { id: memberId, profileSlug },
      { pageSize, cursor },
      { dataSources: { firestore } },
    ) => {
      dlog('profiles called for member %s', profileSlug);
      const favorites = await favoriteStore(
        firestore,
      ).getFavoritedIdsForMemberPaged({
        memberId,
        favoriteType,
        pageSize,
        cursor,
      });
      const ids = favorites.favorites.map(f => f.favoritedId);
      const allProfiles = await memberStore(firestore).batchFindMembers(ids);
      const profiles = allProfiles.filter(
        p => p.canFeature && !p.isDeactivated,
      );

      return {
        cursor: favorites.cursor,
        count: favorites.count,
        profiles,
      };
    },
  },
};
