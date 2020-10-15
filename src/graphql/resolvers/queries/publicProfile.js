import debug from 'debug';
import { dataSources } from '@thatconference/api';

import meritBadgesResolver from './earnedMeritBadges';
import sessionStore from '../../../dataSources/cloudFirestore/session';
import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:query:PublicProfile');
const favoriteStore = dataSources.cloudFirestore.favorites;
const favoriteType = 'member';

export const fieldResolvers = {
  PublicProfile: {
    async __resolveReference({ id }, { dataSources: { profileLoader } }) {
      dlog('resolveReference');
      const user = await profileLoader.load(id);

      if (!user.canFeature) return null;

      return user;
    },
    earnedMeritBadges: meritBadgesResolver.earnedMeritBadges,
    sessions: (
      { id },
      { filter, asOfDate },
      { dataSources: { firestore } },
    ) => {
      dlog('sessions for %s with filter %s', id, filter);

      // today at 00:00:00.000 (in epoch number format)
      let parsableTime = new Date().setHours(0, 0, 0, 0);
      if (asOfDate) {
        // dates from json are string formatted hopefully iso format
        parsableTime = asOfDate;
      }
      const targetDate = new Date(parsableTime);
      dlog('as of date: %s', targetDate);
      let result;
      switch (filter) {
        case 'ALL':
          result = sessionStore(firestore).findMembersAcceptedSessions({
            memberId: id,
          });
          break;

        case 'PAST':
          result = sessionStore(
            firestore,
          ).findMembersAcceptedSessionsBeforeDate({
            memberId: id,
            beforeDate: targetDate,
          });
          break;

        default:
          // UPCOMING
          result = sessionStore(firestore).findMembersAcceptedSessionsFromDate({
            memberId: id,
            fromDate: targetDate,
          });
      }

      return result;
    }, // sessions
    followCount: ({ id }, __, { dataSources: { firestore } }) => {
      dlog('followCount called');
      return favoriteStore(firestore).getFavoriteCount({
        favoritedId: id,
        favoriteType,
      });
    },
    followers: async (
      { id },
      { pageSize, cursor },
      { dataSources: { firestore } },
    ) => {
      dlog('followers called');
      const pagedFollowers = await favoriteStore(firestore).getFollowersPaged({
        favoritedId: id,
        favoriteType,
        pageSize,
        cursor,
      });
      // getFollowersPaged verifies returned members have canFeature and not
      // isDeactivitated so that check isn't needed again
      const profiles = await memberStore(firestore).batchFindMembers(
        pagedFollowers.members.map(m => m.id),
      );

      return {
        cursor: pagedFollowers.cursor,
        count: profiles.length,
        profiles,
      };
    },
  },
};
