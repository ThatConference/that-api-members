/* eslint-disable import/prefer-default-export */
import debug from 'debug';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:mutation');

export const fieldResolvers = {
  MemberMutation: {
    update: async (
      { memberId },
      { profile },
      { dataSources: { firestore, logger, postmark } },
    ) => {
      dlog(`MembersMutation:update for ${memberId}, %o`, profile);

      const updatedMember = await memberStore(firestore, logger).update({
        memberId,
        profile,
      });

      await postmark.sendEmail({
        From: 'hello@thatconference.com',
        To: updatedMember.email,
        Subject: 'Your THAT account was just updated.',
        TextBody:
          'todo: this is just an email to let you know your account was just updated',
      });

      return updatedMember;
    },
  },
};
