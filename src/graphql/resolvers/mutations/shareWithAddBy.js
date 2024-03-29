import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources } from '@thatconference/api';
import memberStore from '../../../dataSources/cloudFirestore/member';
import sharingWithStore from '../../../dataSources/cloudFirestore/sharingWith';
import { findSharedProfileProfileLoader } from '../../../lib/findSharedProfile';

const dlog = debug('that:api:members:mutation:share-with-add-by');
const orderStore = dataSources.cloudFirestore.order;
const eventStore = dataSources.cloudFirestore.event;

export const fieldResolvers = {
  ShareWithAddByMutation: {
    pin: async (
      _,
      { shareWith },
      {
        dataSources: {
          firestore,
          profileLoader,
          events: { userEvents },
        },
        user,
      },
    ) => {
      dlog('resolving for pin');
      const { pin, eventId, messageToShareWith, notes } = shareWith;
      const addResult = {
        isSuccess: false,
        message: null,
        sharedWith: null,
      };
      const [[allocation], event] = await Promise.all([
        orderStore(firestore).findPin({
          partnerPin: pin,
          eventId,
        }),
        eventStore(firestore).get(eventId),
      ]);
      if (!event) {
        addResult.message = 'Invalid event id';
      } else if (!allocation) {
        addResult.message = 'PIN provided is not found';
      } else if (!allocation.allocatedTo) {
        addResult.message = 'PIN found but not set to a member.';
      }

      if (addResult.message === null) {
        const shareWithMemberRecord = await memberStore(firestore).get(
          allocation.allocatedTo,
        );
        const {
          id: memberId,
          firstName,
          lastName,
          email,
        } = shareWithMemberRecord ?? {};
        if (memberId) {
          const sharingWith = {
            firstName,
            lastName,
            email,
          };
          let storeResult;
          try {
            storeResult = await sharingWithStore(firestore).add({
              sharedById: user.sub,
              sharedWithId: memberId,
              sharingData: {
                notes: notes ?? '',
              },
            });
          } catch (err) {
            if (err.code === 6)
              addResult.message = `A share is already estabished for that member`;
            else {
              const issueId = Sentry.captureException(err);
              addResult.message = `Exception occured creating new share (ref. ${issueId})`;
            }
          }
          if (addResult.message === null) {
            dlog('storeResult %o', storeResult);
            const sharedProfile = await findSharedProfileProfileLoader({
              memberId: user.sub,
              firestore,
              profileLoader,
            });
            userEvents.emit('addNewSharingWith', {
              sharingWith,
              sharingSharedProfile: sharedProfile ?? {},
              messageToShareWith,
            });
            addResult.isSuccess = true;
            addResult.sharedWith = {
              ...storeResult,
              sharingWithProfile: shareWithMemberRecord,
            };
          }
        } else {
          addResult.message =
            'Invalid PIN reference, no member found. Unable to share information';
        }
      }

      return addResult;
    },

    profile: async (
      _,
      { shareWith },
      {
        dataSources: {
          firestore,
          profileLoader,
          events: { userEvents },
        },
        user,
      },
    ) => {
      dlog('resolving for profile');
      const { shareWithMember, notes } = shareWith;
      const { id, slug } = shareWithMember;
      let shareWithMemberRecord;
      if (id) {
        shareWithMemberRecord = await memberStore(firestore).findMe(id);
      } else {
        shareWithMemberRecord = await memberStore(firestore).findMember(slug);
      }
      const {
        id: memberId,
        profileSlug,
        firstName,
        lastName,
        email,
      } = shareWithMemberRecord ?? {};

      dlog('add new share with %s, %s', memberId, profileSlug);
      const addResult = {
        isSuccess: false,
        message: null,
        sharedWith: null,
      };

      if (memberId) {
        const sharingWith = {
          firstName,
          lastName,
          email,
        };
        const storeResult = await sharingWithStore(firestore).add({
          sharedById: user.sub,
          sharedWithId: memberId,
          sharingData: {
            notes: notes ?? '',
          },
        });
        dlog('storeResult %o', storeResult);
        const sharedProfile = await findSharedProfileProfileLoader({
          memberId: user.sub,
          firestore,
          profileLoader,
        });

        userEvents.emit('addNewSharingWith', {
          sharingWith,
          sharingSharedProfile: sharedProfile ?? {},
          // messageToShareWith,
        });

        addResult.isSuccess = true;
        addResult.sharedWith = {
          ...storeResult,
          sharingWithProfile: shareWithMemberRecord,
        };
      } else {
        addResult.message =
          'Invalid member reference provided. Unable to share information';
      }

      return addResult;
    },
  },
};
