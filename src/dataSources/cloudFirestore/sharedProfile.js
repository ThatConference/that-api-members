import debug from 'debug';

const dlog = debug('that:api:members:datasources:sharedprofile');
const collectionName = 'members';
const subCollectionName = 'profiles';
const sharedProfileDocName = 'shared';

const sharedProfile = dbInstance => {
  dlog('shared profile db instance created');

  const memberCollection = dbInstance.collection(collectionName);

  function get(memberId) {
    dlog('get called on %s', memberId);
    return memberCollection
      .doc(memberId)
      .collection(subCollectionName)
      .doc(sharedProfileDocName)
      .get()
      .then(docRef => {
        let d = null;
        if (docRef.exists) {
          d = {
            id: memberId,
            ...docRef.data(),
          };
        }

        return d;
      });
  }

  function create({ memberId, profile }) {
    dlog('create shared profile for %s :: %o', memberId, profile);
    const docRef = memberCollection
      .doc(memberId)
      .collection(subCollectionName)
      .doc(sharedProfileDocName);

    return docRef.set(profile, { merge: true }).then(() => get(memberId));
  }

  function update({ memberId, profile }) {
    dlog('update shared profile for %s :: %o', memberId, profile);
    return create({ memberId, profile });
  }

  function remove({ memberId }) {
    dlog('delete shared profile for %s', memberId);
    return memberCollection
      .doc(memberId)
      .collection(subCollectionName)
      .doc(sharedProfileDocName)
      .delete()
      .then(() => memberId);
  }

  return { get, create, update, remove };
};

export default sharedProfile;
