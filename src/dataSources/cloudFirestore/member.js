import debug from 'debug';

const dlog = debug('that:api:members:datasources:members');

function scrubProfile(profile, isNew) {
  const scrubbedProfile = profile;

  const modifiedAtDate = new Date().toISOString();

  if (isNew) {
    scrubbedProfile.createdAt = modifiedAtDate;
  }

  scrubbedProfile.lastUpdatedAt = modifiedAtDate;

  return scrubbedProfile;
}

const event = (dbInstance, logger) => {
  const collectionName = 'members';
  const membersCol = dbInstance.collection(collectionName);

  async function create({ user, profile }) {
    const docRef = membersCol.doc(user.sub);

    const modifiedProfile = scrubProfile(profile, true);

    await docRef.set(modifiedProfile, { merge: true });
    const updatedDoc = await docRef.get();

    return {
      id: docRef.id,
      ...updatedDoc.data(),
    };
  }

  async function findMe(memberId) {
    const docRef = dbInstance.doc(`${collectionName}/${memberId}`);
    const doc = await await docRef.get();
    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  async function update({ memberId, profile }) {
    dlog('db update called');

    const docRef = dbInstance.doc(`${collectionName}/${memberId}`);

    const modifiedProfile = scrubProfile(profile);
    await docRef.update(modifiedProfile);

    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };
  }

  return { create, findMe, update };
};

export default event;
