/* eslint-disable import/prefer-default-export */
import debug from 'debug';
import { ForbiddenError } from 'apollo-server';
import _ from 'lodash';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:mutation');

export const fieldResolvers = {
  MembersMutation: {
    create: async (
      parent,
      { profile },
      { dataSources: { firestore, logger, postmark }, user },
    ) => {
      dlog('MembersMutation:create %o', profile);

      const memberProfile = await memberStore(firestore, logger).create({
        user,
        profile,
      });

      // await postmark.sendEmail({
      //   From: 'hello@thatconference.com',
      //   To: memberProfile.email,
      //   Subject: 'You just created THAT account, welcome!',
      //   TextBody: 'TODO.. YOUR ACCOUNT',
      // });

      return memberProfile;
    },

    delete: async (parent, { id }, { dataSources: { firestore, logger } }) => {
      dlog('MembersMutation:delete called');
      throw new Error('not implemented yet');
    },

    member: async (parent, { id }, { user }) => {
      dlog('MembersMutation:session called');

      let memberId = user.sub;

      if (!_.isNil(id)) {
        if (user.permissions.includes('admin')) {
          memberId = id;
        } else {
          throw new ForbiddenError('Permissions Denied.');
        }
      }

      return { memberId };
    },
  },
};
