/*
 * finds shared profile for a member. Meaning if there is no SharedProfile
 * defined, then profile data is returned for those fields.
 */
import debug from 'debug';
import sharedProfileStore from '../dataSources/cloudFirestore/sharedProfile';
import memberStore from '../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:find-shared-profile');

export const findSharedProfile = async ({ memberId, firestore }) => {
  dlog('finding shared profile for %s', memberId);
  let sharedProfile;
  sharedProfile = await sharedProfileStore(firestore).get(memberId);
  if (sharedProfile === null) {
    const memberRecord = await memberStore(firestore).get(memberId);
    if (memberRecord) {
      sharedProfile = {
        id: memberRecord.id,
        firstName: memberRecord.firstName,
        lastName: memberRecord.lastName,
        email: memberRecord.email,
        company: memberRecord.company,
      };
    }
  }

  return sharedProfile;
};

export const findSharedProfileProfileLoader = async ({
  memberId,
  firestore,
  profileLoader,
}) => {
  dlog('finding shared profile for %s (pl)', memberId);
  let sharedProfile;
  sharedProfile = await sharedProfileStore(firestore).get(memberId);
  if (sharedProfile === null) {
    const memberRecord = await profileLoader.load(memberId);
    if (memberRecord) {
      sharedProfile = {
        id: memberRecord.id,
        firstName: memberRecord.firstName,
        lastName: memberRecord.lastName,
        email: memberRecord.email,
        company: memberRecord.company,
      };
    }
  }

  return sharedProfile;
};
