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
      {
        dataSources: {
          firestore,
          events: { userEvents },
        },
        user,
      },
    ) => {
      dlog('MembersMutation:create %o', profile);
      const modifiedProfile = profile;

      // set some default values.
      modifiedProfile.isDeactivated = false;

      const memberProfile = await memberStore(firestore).create({
        user,
        profile: modifiedProfile,
      });

      userEvents.emit('accountCreated', memberProfile);

      return memberProfile;
    },

    member: (parent, { id }, { user }) => {
      dlog('member called');

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

    admin: () => {
      dlog('admin called');
      return {};
    },
  },
};
