import debug from 'debug';
import { GraphQLError } from 'graphql';
import { isNil } from 'lodash';

import memberStore from '../../../dataSources/cloudFirestore/member';
import constants from '../../../constants';

const dlog = debug('that:api:members:mutation');

export const fieldResolvers = {
  MembersMutation: {
    create: async (
      parent,
      { profile },
      {
        dataSources: {
          firestore,
          events: { userEvents, graphCdnEvents },
        },
        user,
      },
    ) => {
      dlog('MembersMutation:create %o', profile);
      const modifiedProfile = profile;
      const userContext = user;
      userContext.email = profile.email;
      userContext.firstName = profile.firstName;
      userContext.lastName = profile.lastName;
      // set some default profile values.
      modifiedProfile.isDeactivated = false;

      const memberProfile = await memberStore(firestore).create({
        user,
        profile: modifiedProfile,
      });

      userEvents.emit('accountCreated', memberProfile, firestore);
      graphCdnEvents.emit(
        constants.GRAPHCDN.EVENT_NAME.PURGE,
        constants.GRAPHCDN.PURGE.MEMBER,
        user.sub,
      );

      return memberProfile;
    },

    member: (parent, { id }, { user }) => {
      dlog('member called');

      let memberId = user.sub;

      if (!isNil(id)) {
        if (user.permissions.includes('admin')) {
          memberId = id;
        } else {
          throw new GraphQLError('Permission Denied.', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
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
