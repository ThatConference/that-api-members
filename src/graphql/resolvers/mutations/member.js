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

      if (
        result.isGoodTicket &&
        result.ticket.release_title === 'Patron Camper'
      ) {
        meritBadgeStore(firestore).awardMeritBadge(
          memberId,
          'u6JVbl2TosO5OcWLak6k',
        );
      }

      return result.isGoodTicket;
    },
  },
};
