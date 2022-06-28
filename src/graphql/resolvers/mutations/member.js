import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';

import memberStore from '../../../dataSources/cloudFirestore/member';
import titoStore from '../../../dataSources/apis/tito';
import meritBadgeStore from '../../../dataSources/cloudFirestore/meritBadge';
import memberFindBy from '../../../lib/memberFindBy';
import acActions from '../../../lib/activeCampaignActions';
import slackRequestInvite from '../../../lib/slackRequestInvite';
import envConfig from '../../../envConfig';
import constants from '../../../constants';

const dlog = debug('that:api:members:mutation');
const favoriteStore = dataSources.cloudFirestore.favorites;
const favoriteType = 'member';

export const fieldResolvers = {
  MemberMutation: {
    update: async (
      { memberId },
      { profile },
      {
        dataSources: {
          firestore,
          events: { userEvents, graphCdnEvents },
        },
      },
    ) => {
      dlog(`MembersMutation:update for ${memberId}, %o`, profile);
      const modifiedProfile = profile;
      const listId = envConfig.activeCampaign.newsLetterListId;
      const hasNewsletterField = 'isSubscribedNewsletter' in modifiedProfile;
      const isSubscribedNewsletter =
        modifiedProfile?.isSubscribedNewsletter ?? false;
      // We don't want to write this to the database
      delete modifiedProfile.isSubscribedNewsletter;

      const updatedMember = await memberStore(firestore).update({
        memberId,
        profile: modifiedProfile,
      });
      const user = {
        email: updatedMember.email,
        firstName: updatedMember.firstName,
        lastName: updatedMember.lastName,
      };
      if (hasNewsletterField === true) {
        let acResult;
        try {
          if (isSubscribedNewsletter === true) {
            acResult = await acActions.addContactToList({
              user,
              listId,
            });
          } else {
            acResult = await acActions.removeContactFromList({
              user,
              listId,
            });
          }
        } catch (err) {
          Sentry.addContext('ac user', user);
          Sentry.addContext('ac list id', listId);
          Sentry.captureException(err);
        }

        if (acResult !== null && acResult !== undefined) {
          updatedMember.isSubscribedNewsletter = isSubscribedNewsletter;
        }
      }

      userEvents.emit('accountUpdated', updatedMember, firestore);
      graphCdnEvents.emit(
        constants.GRAPHCDN.EVENT_NAME.PURGE,
        constants.GRAPHCDN.PURGE.MEMBER,
        memberId,
      );

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

      const patronBadgeId = 'u6JVbl2TosO5OcWLak6k';
      const partnerBadgeId = 'U8pHyHpbivjsoSuvcfJI';
      const memberTicketName = result.ticket.release_title
        ? result.ticket.release_title.toUpperCase()
        : '';
      let awardedBadge = null;

      if (result.isGoodTicket) {
        if (memberTicketName === 'PATRON CAMPER') {
          awardedBadge = await meritBadgeStore(firestore).awardMeritBadge(
            memberId,
            patronBadgeId,
          );
        } else if (
          ['PARTNER', 'CORPORATE PARTNER'].includes(memberTicketName)
        ) {
          awardedBadge = await meritBadgeStore(firestore).awardMeritBadge(
            memberId,
            partnerBadgeId,
          );
        }
      }
      return awardedBadge;
    },
    setFeaturedMeritBadge: (
      { memberId },
      { earnedRefId },
      { dataSources: { firestore } },
    ) => {
      dlog('setFaturedMeritBadge called');
      return meritBadgeStore(firestore).setFeaturedMeritBadge({
        memberId,
        earnedRefId,
      });
    },
    followToggle: async (
      { memberId },
      { target },
      { dataSources: { firestore } },
    ) => {
      const { memberId: favoritedId, profileSlug } = await memberFindBy(
        target,
        firestore,
      );
      dlog(
        'follow toggle called on %s or %s, %o',
        memberId,
        profileSlug,
        target,
      );
      const fav = await favoriteStore(firestore).findFavoriteForMember({
        favoritedId,
        favoriteType,
        user: { sub: memberId },
      });

      let result = null;
      if (fav) {
        dlog('favorite exists, removing');
        await favoriteStore(firestore).removeFavorite({
          favoriteId: fav.id,
          user: { sub: memberId },
        });
      } else {
        dlog(`favorite doesn't exist, ensure public and add`);
        const publicMember = await memberStore(firestore).findPublicById(
          favoritedId,
        );
        if (publicMember) {
          const newFav = await favoriteStore(firestore).addFavoriteForMember({
            favoritedId,
            favoriteType,
            user: { sub: memberId },
          });
          if (!newFav)
            throw new Error(
              `new favoriting of a member by member ${memberId} failded to create`,
            );
          result = publicMember;
        } else {
          dlog(`member isn't public, not setting favorite`);
        }
      }

      return result;
    },
    requestSlackInvite: async (
      { memberId },
      __,
      { dataSources: { firestore } },
    ) => {
      dlog('requestSlackInvite called');

      const profile = { requestSlackInviteAt: new Date() };
      const member = await memberStore(firestore).update({ memberId, profile });
      dlog('member first name: %s', member.firstName);
      Sentry.setTags({ memberId, email: member.email });

      const r = await slackRequestInvite({ email: member.email });
      Sentry.setContext('Slack Invite return', JSON.stringify(r));
      dlog('slack invite return: %O', r);
      let returnText = '';
      if (r?.result?.ok === undefined) {
        Sentry.captureMessage(
          'Unknown return from Slack Invite',
          Sentry.Severity.Error,
        );
        returnText = `Error while sending invite. Please contact us for your THAT Slack invite.`;
      } else if (r.result.ok === false) {
        if (r.toSentry)
          Sentry.captureMessage(r.toSentry, Sentry.Severity.Warning);
        returnText = r.toUser;
      } else {
        if (r.toSentry) Sentry.captureMessage(r.toSentry, Sentry.Severity.Info);
        returnText = r.toUser;
      }

      return returnText;
    },
    profiles: ({ memberId }) => ({ memberId }),
  },
};
