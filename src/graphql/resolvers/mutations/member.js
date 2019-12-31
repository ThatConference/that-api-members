/* eslint-disable import/prefer-default-export */
import debug from 'debug';
import moment from 'moment';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:mutation');

export const fieldResolvers = {
  MemberMutation: {
    update: async (
      { memberId },
      { profile },
      {
        dataSources: {
          firestore,
          logger,
          events: { userEvents },
        },
      },
    ) => {
      dlog(`MembersMutation:update for ${memberId}, %o`, profile);

      const updatedMember = await memberStore(firestore, logger).update({
        memberId,
        profile,
      });

      userEvents.emit('accountUpdated', updatedMember);

      return updatedMember;
    },
  },
};
