import debug from 'debug';

const dlog = debug('that:api:members:datasources:firebase');

const collectionName = 'meritBadges';
const earnedCollectionName = 'earnedMeritBadges';

const meritBadge = dbInstance => {
  dlog('meritBadge instance created');

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

    const docRef = await dbInstance.doc(`${collectionName}/${badgeId}`).get();

    let result = null;
    if (docRef.exists) {
      result = {
        id: docRef.id,
        ...docRef.data(),
      };
    }

    return result;
  }

  async function findAllEarnedBadgesReference(memberId) {
    dlog('finding all earned merit badges reference for %s', memberId);

    // Find badges for use and return newest first
    const { docs } = await earnedBadgeCollection
      .where('memberId', '==', memberId)
      .orderBy('earnedAt', 'desc')
      .get();

    return docs.map(eb => ({ id: eb.id, ...eb.data() }));
  }

  async function findAllEarnedBadges(memberId) {
    dlog('findAllEarnedBadges for', memberId);

    const earned = await findAllEarnedBadgesReference(memberId);
    let meritBadges = [];
    if (earned.length > 0) {
      const badgeIds = [...new Set(earned.map(b => b.meritBadgeId))];
      meritBadges = await batchFindMeritBadges(badgeIds);
    }

    return earned.map(e => {
      const fb = meritBadges.find(b => b.id === e.meritBadgeId);
      return {
        ...fb,
        earnedAt: e.earnedAt,
        earnedRefId: e.id,
        isFeatured: e.isFeatured,
      };
    });
  }

  // function only useful to determine if a badge is already awarded
  async function findEarnedMeritBadge(memberId, meritBadgeId) {
    dlog('findEarnedMeritBadge (id: %s) for member %s', meritBadgeId, memberId);

    const allEarnedBadges = await findAllEarnedBadgesReference(memberId);
    // TODO:throw something if more than one badge awarded to a member

    // id is earnedMeritBadge collection id
    let result = allEarnedBadges.find(b => b.meritBadgeId === meritBadgeId);
    if (!result) result = null;
    return result;
  }

  async function awardMeritBadge(memberId, meritBadgeId) {
    dlog('Award meritBadge (%s) to member (%s)', meritBadgeId, memberId);

    // verify merit badge exists
    const badge = await findMeritBadge(meritBadgeId);
    dlog('returned badge: %O', badge);
    if (!badge)
      throw new Error(
        `Attempt to award a merit badge which doesn't exist (meritBadgeId: ${meritBadgeId})`,
      );

    let result = null;
    // verify merit badge not already awarded
    const awardedBadgeRef = await findEarnedMeritBadge(memberId, meritBadgeId);
    if (awardedBadgeRef) {
      dlog('merit badge already awarded to user');
      result = {
        ...badge,
        earnedAt: awardedBadgeRef.earnedAt,
        earnedRefId: awardedBadgeRef.id,
      };
    }

    // award merit badge
    if (!result) {
      const earnedAt = new Date();
      const newDocument = await earnedBadgeCollection.add({
        memberId,
        meritBadgeId,
        earnedAt,
      });
      dlog(`awarded new merit badge (earnedMeritBadge key: ${newDocument.id})`);
      result = {
        ...badge,
        earnedAt,
        earnedRefId: newDocument.id,
      };
    }
    return result;
  }

  async function setFeaturedMeritBadge({ memberId, earnedRefId }) {
    dlog('setFeaturedMeritBadge %s -> %s', memberId, earnedRefId);
    const result = {
      result: true,
      message: 'ok',
      meritBadge: null,
    };
    // get all earned badges
    const earnedBadgeRef = await findAllEarnedBadgesReference(memberId);
    const thisBadge = earnedBadgeRef.find(e => e.id === earnedRefId);
    // see if referenced passed in exists
    if (!thisBadge) {
      result.message = `Earned Merit Badge for member not found`;
      result.result = false;
      return result;
    }

    const rawBadge = await findMeritBadge(thisBadge.meritBadgeId);
    if (!rawBadge) {
      result.message = `Unknown Merit Badge id encountered, ${thisBadge.meritBadgeId}`;
      result.result = false;
      return result;
    }
    result.meritBadge = {
      ...rawBadge,
      earnedAt: thisBadge.earnedAt,
      earnedRefId: thisBadge.id,
      isFeatured: true,
    };

    // update all references
    const writeBatch = dbInstance.batch();
    earnedBadgeRef.forEach(eb => {
      const isFeatured = eb.id === earnedRefId;
      writeBatch.set(
        earnedBadgeCollection.doc(eb.id),
        { isFeatured },
        { merge: true },
      );
    });

    return writeBatch.commit().then(() => result);
  }

  return {
    findAllEarnedBadges,
    findMeritBadge,
    awardMeritBadge,
    setFeaturedMeritBadge,
  };
};

export default meritBadge;
