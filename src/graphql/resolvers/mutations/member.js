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
      { dataSources: { firestore, logger, postmark } },
    ) => {
      dlog(`MembersMutation:update for ${memberId}, %o`, profile);

      const updatedMember = await memberStore(firestore, logger).update({
        memberId,
        profile,
      });

      await postmark.sendEmailWithTemplate({
        // TemplateId: 15579922,
        TemplateAlias: 'MemberUpdated',
        From: 'hello@thatconference.com',
        To: updatedMember.email,
        TemplateModel: {
          member: {
            firstName: updatedMember.firstName,
            lastName: updatedMember.lastName,
            email: updatedMember.email,
            lastUpdatedAt: moment(updatedMember.lastUpdatedAt).format(
              'M/D/YYYY h:mm:ss A',
            ),
          },
        },
      });

      return updatedMember;
    },
  },
};
