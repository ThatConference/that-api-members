import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:members:datasources:sharing-with');
const collectionName = 'members';
const subCollectionName = 'sharingWith';
const collectionGroupName = 'sharingWith';
const { entityDateForge } = utility.firestoreDateForge;
const fields = ['createdAt', 'lastUpdatedAt'];
const sharingDataDateForge = entityDateForge({ fields });

const scrubSharingData = (sharingData, isNew = false) => {
  dlog('scrubing sharing data');
  const scrubbedSharingData = sharingData;
  const now = new Date();
  if (isNew) {
    scrubbedSharingData.createdAt = now;
  }
  scrubbedSharingData.lastUpdatedAt = now;
  return scrubbedSharingData;
};

const sharingWith = dbInstance => {
  dlog('sharingWith db instance created');

  const memberCollection = dbInstance.collection(collectionName);

  function get({ sharedById, sharedWithId }) {
    dlog('get sharing record by %s for %s', sharedById, sharedWithId);
    return memberCollection
      .doc(sharedById)
      .collection(subCollectionName)
      .doc(sharedWithId)
      .get()
      .then(docSnap => {
        let doc = null;
        if (docSnap.exists) {
          doc = {
            id: docSnap.id,
            ...docSnap.data(),
          };
        }
        return sharingDataDateForge(doc);
      });
  }

  function findSharedById(memberId) {
    dlog('findShaedById for %s', memberId);
    return memberCollection
      .doc(memberId)
      .collection(subCollectionName)
      .get()
      .then(querySnap =>
        querySnap.docs.map(docs => {
          const doc = {
            id: docs.id,
            ...docs.data(),
          };
          return sharingDataDateForge(doc);
        }),
      );
  }

  function findSharedWithId(memberId) {
    dlog('findsharedwithId for %s', memberId);
    return dbInstance
      .collectionGroup(collectionGroupName)
      .where('sharedWithId', '==', memberId)
      .get()
      .then(querySnap =>
        querySnap.docs.map(docs => {
          const doc = {
            id: docs.id,
            ...docs.data(),
          };
          return sharingDataDateForge(doc);
        }),
      );
  }

  function add({ sharedById, sharedWithId, sharingData = {} }) {
    dlog('add new member sharing for %s with %s', sharedById, sharedWithId);
    if (!sharedById || !sharedWithId)
      throw new Error(
        'SharedById and SharedWidthId are both required to add a sharing',
      );
    const newSharingData = {
      ...sharingData,
      sharedById,
      sharedWithId,
    };
    scrubSharingData(newSharingData, true);

    return memberCollection
      .doc(sharedById)
      .collection(subCollectionName)
      .doc(sharedWithId)
      .create(newSharingData)
      .then(() => get({ sharedById, sharedWithId }));
  }

  function update({ sharedById, sharedWithId, sharingData = {} }) {
    dlog(
      'update member sharing for %s with %s: %o',
      sharedById,
      sharedWithId,
      sharingData,
    );
    if (!sharedById || !sharedWithId)
      throw new Error(
        'SharedById and SharedWidthId are both required to update a sharing',
      );
    // Ensure share by and shared with don't change, they can't be updated
    const updateSharingData = {
      ...sharingData,
      sharedById,
      sharedWithId,
    };
    scrubSharingData(updateSharingData, false);

    return memberCollection
      .doc(sharedById)
      .collection(subCollectionName)
      .doc(sharedWithId)
      .update(updateSharingData)
      .then(() => get(sharedById, sharedWithId));
  }

  function remove({ sharedById, sharedWithId }) {
    dlog('remove sharing by %s for %s', sharedById, sharedWithId);
    if (!sharedById || !sharedWithId)
      throw new Error(
        'SharedById and SharedWidthId are both required to remove a sharing',
      );
    return memberCollection
      .doc(sharedById)
      .collection(subCollectionName)
      .doc(sharedWithId)
      .delete()
      .then(() => ({ sharedById, sharedWithId }));
  }

  return { get, findSharedById, findSharedWithId, add, update, remove };
};

export default sharingWith;
