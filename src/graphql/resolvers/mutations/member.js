import debug from 'debug';
import { dataSources } from '@thatconference/api';

import memberStore from '../../../dataSources/cloudFirestore/member';
import titoStore from '../../../dataSources/apis/tito';
import meritBadgeStore from '../../../dataSources/cloudFirestore/meritBadge';
import memberFindBy from '../../../lib/memberFindBy';

const dlog = debug('that:api:members:mutation');
const favoriteStore = dataSources.cloudFirestore.favorites;
const favoriteType = 'member';

export const fieldResolvers = {
  MemberMutation: {
    update: async (
      { memberId },
      { profile },
      {
        dataSources: {
          firestore,
          events: { userEvents },
        },
      },
    ) => {
      dlog(`MembersMutation:update for ${memberId}, %o`, profile);

      const updatedMember = await memberStore(firestore).update({
        memberId,
        profile,
      });

      userEvents.emit('accountUpdated', updatedMember);

      return updatedMember;
    },

    claimTicket: async (
      { memberId },
      { ticketRef },
      { dataSources: { firestore } },
    ) => {
      dlog('claimTicket called: %s', ticketRef);
      const result = await titoStore().checkInTicket(ticketRef);
      dlog('checkin result %O', result);

      const patronBadgeId = 'u6JVbl2TosO5OcWLak6k';
      const partnerBadgeId = 'U8pHyHpbivjsoSuvcfJI';
      const memberTicketName = result.ticket.release_title
        ? result.ticket.release_title.toUpperCase()
        : '';
      let awardedBadge = null;

      if (result.isGoodTicket) {
        if (memberTicketName === 'PATRON CAMPER') {
          awardedBadge = await meritBadgeStore(firestore).awardMeritBadge(
            memberId,
            patronBadgeId,
          );
        } else if (
          ['PARTNER', 'CORPORATE PARTNER'].includes(memberTicketName)
        ) {
          awardedBadge = await meritBadgeStore(firestore).awardMeritBadge(
            memberId,
            partnerBadgeId,
          );
        }
      }
      return awardedBadge;
    },

    followToggle: async (
      { memberId },
      { target },
      { dataSources: { firestore } },
    ) => {
      const { memberId: favoritedId, profileSlug } = await memberFindBy(
        target,
        firestore,
      );
      dlog(
        'follow toggle called on %s or %s, %o',
        memberId,
        profileSlug,
        target,
      );
      const fav = await favoriteStore(firestore).findFavoriteForMember({
        favoritedId,
        favoriteType,
        user: { sub: memberId },
      });

      let result = null;
      if (fav) {
        dlog('favorite exists, removing');
        await favoriteStore(firestore).removeFavorite({
          favoriteId: fav.id,
          user: { sub: memberId },
        });
      } else {
        dlog(`favorite doesn't exist, ensure public and add`);
        const publicMember = await memberStore(firestore).findPublicById(
          favoritedId,
        );
        if (publicMember) {
          const newFav = await favoriteStore(firestore).addFavoriteForMember({
            favoritedId,
            favoriteType,
            user: { sub: memberId },
          });
          if (!newFav)
            throw new Error(
              `new favoriting of a member by member ${memberId} failded to create`,
            );
          result = publicMember;
        } else {
          dlog(`member isn't public, not setting favorite`);
        }
      }

      return result;
    },
  },
};
