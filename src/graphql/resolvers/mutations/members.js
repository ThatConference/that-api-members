/* eslint-disable import/prefer-default-export */
import debug from 'debug';
import { ForbiddenError } from 'apollo-server';
import _ from 'lodash';
import moment from 'moment';

import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:mutation');

export const fieldResolvers = {
  MembersMutation: {
    create: async (
      parent,
      { profile },
      { dataSources: { firestore, logger, postmark }, user },
    ) => {
      const modifiedProfile = profile;
      dlog('MembersMutation:create %o', profile);

      // set some default values.
      modifiedProfile.isDeactivated = false;

      const memberProfile = await memberStore(firestore, logger).create({
        user,
        modifiedProfile,
      });

      await postmark.sendEmailWithTemplate({
        // TemplateId: 15580573,
        TemplateAlias: 'MemberCreated',
        From: 'hello@thatconference.com',
        To: memberProfile.email,
        TemplateModel: {
          member: {
            firstName: memberProfile.firstName,
            lastName: memberProfile.lastName,
            email: memberProfile.email,
            createdAt: moment(memberProfile.createdAt).format(
              'M/D/YYYY h:mm:ss A',
            ),
          },
        },
      });

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
