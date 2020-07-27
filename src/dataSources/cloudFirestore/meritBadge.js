import debug from 'debug';

const dlog = debug('that:api:events:datasources:firebase:meritBadge');

const collectionName = 'meritBadges';
const earnedCollectionName = 'earnedMeritBadges';

const meritBadge = dbInstance => {
  dlog('instance created');

  const meritBadgeCollection = dbInstance.collection(collectionName);
  const earnedBadgeCollection = dbInstance.collection(earnedCollectionName);

  async function batchFindMeritBadges(badgeIds) {
    dlog('batchFindMeritBadges', badgeIds);

    const docRefs = badgeIds.map(id =>
      dbInstance.doc(`${collectionName}/${id}`),
    );

    return Promise.all(docRefs.map(d => d.get())).then(result =>
      result.map(r => ({
        id: r.id,
        ...r.data(),
      })),
    );
  }

  async function findMeritBadge(badgeId) {
    dlog('findMeritBadge ', badgeId);

    const docRef = dbInstance.doc(`${collectionName}/${badgeId}`);

    if (docRef.exists) {
      return {
        id: docRef.id,
        ...docRef.data(),
      };
    }

    return null;
  }

  async function findAllEarnedBadges(memberId) {
    dlog('findAllEarnedBadges for', memberId);

    // Find badges for use and return newest first
    const { docs } = await earnedBadgeCollection
      .where('memberId', '==', memberId)
      .orderBy('earnedAt', 'desc')
      .get();

    const earned = docs.map(eb => ({ id: eb.id, ...eb.data() }));
    const badgeIds = [...new Set(earned.map(b => b.meritBadgeId))];
    const badges = await batchFindMeritBadges(badgeIds);

    return earned.map(e => {
      let badge = {};
      const fb = badges.find(b => b.id === e.meritBadgeId);
      if (fb) {
        delete fb.id;
        badge = {
          ...fb,
        };
      }
      return {
        ...e,
        ...badge,
      };
    });
  }

  return { findAllEarnedBadges, findMeritBadge };
};

export default meritBadge;
