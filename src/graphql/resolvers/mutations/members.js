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

      userEvents.emit('newAccountCreated', memberProfile);

      return memberProfile;
    },

    delete: (parent, { id }, { dataSources: { firestore } }) => {
      dlog('MembersMutation:delete called');

      return memberStore(firestore).remove(id);
    },

    member: (parent, { id }, { user }) => {
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
