import debug from 'debug';
import { ForbiddenError } from 'apollo-server-express';
import { isNil } from 'lodash';

import memberStore from '../../../dataSources/cloudFirestore/member';
import constants from '../../../constants';
import acActions from '../../../lib/activeCampaignActions';
import envConfig from '../../../envConfig';

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
      const listId = envConfig.activeCampaign.newsLetterListId;
      const hasNewsletterField = 'isSubscribedNewsletter' in modifiedProfile;
      const isSubscribedNewsletter =
        modifiedProfile?.isSubscribedNewsletter ?? false;
      // We don't want to write this to the database
      delete modifiedProfile.isSubscribedNewsletter;
      let acFunc = false;
      if (hasNewsletterField === true) {
        if (isSubscribedNewsletter === true) {
          acFunc = acActions.addContactToList({
            user: userContext,
            listId,
          });
        } else {
          acFunc = acActions.removeContactFromList({
            user: userContext,
            listId,
          });
        }
      }
      // set some default profile values.
      modifiedProfile.isDeactivated = false;

      const [memberProfile, acResult] = await Promise.all([
        memberStore(firestore).create({
          user,
          profile: modifiedProfile,
        }),
        acFunc,
      ]);

      if (acResult !== null && acResult !== undefined) {
        memberProfile.isSubscribedNewsletter = isSubscribedNewsletter;
      }

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
