import debug from 'debug';

import memberStore from '../../../dataSources/cloudFirestore/member';
import titoStore from '../../../dataSources/apis/tito';
import meritBadgeStore from '../../../dataSources/cloudFirestore/meritBadge';

const dlog = debug('that:api:members:mutation');

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
  },
};
