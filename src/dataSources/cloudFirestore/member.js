import debug from 'debug';
import moment from 'moment';
import { isDate } from 'lodash';

const dlog = debug('that:api:members:datasources:members');

function scrubProfile(profile, isNew) {
  const scrubbedProfile = profile;

  const modifiedAtDate = new Date();

  if (isNew) {
    scrubbedProfile.createdAt = modifiedAtDate;
  }
  scrubbedProfile.lastUpdatedAt = modifiedAtDate;

  if (!scrubbedProfile.interests) scrubbedProfile.interests = [];

  return scrubbedProfile;
}

const member = dbInstance => {
  const collectionName = 'members';
  const membersCol = dbInstance.collection(collectionName);

  async function isProfileSlugTaken(slug) {
    dlog('db isProfileSlugUnique %o', slug);

    const requestedSlug = slug.toLowerCase();

    const docSnapshot = await membersCol
      .where('profileSlug', '==', requestedSlug)
      .get();

    return docSnapshot.size !== 0;
  }

  async function create({ user, profile }) {
    dlog('created called for user %o, with profile %o', user, profile);
    const docRef = membersCol.doc(user.sub);

    const modifiedProfile = scrubProfile(profile, true);
    dlog('modified profile %o', modifiedProfile);

    const isSlugTaken = await isProfileSlugTaken(modifiedProfile.profileSlug);
    if (isSlugTaken) throw new Error('profile slug is taken');

    await docRef.set(modifiedProfile, { merge: true });
    const updatedDoc = await docRef.get();

    return {
      id: docRef.id,
      ...updatedDoc.data(),
    };
  }

  async function findPublicById(id) {
    dlog('findPublicById %s', id);
    const docRef = await membersCol.doc(id).get();
    let result = null;
    if (docRef.exists) {
      if (docRef.get('canFeature')) {
        const pl = docRef.get('profileLinks');
        result = {
          id: docRef.id,
          ...docRef.data(),
          profileLinks: pl ? pl.filter(p => p.isPublic) : [],
        };
      }
    }

    return result;
  }

  async function findMember(slug) {
    const docSnapshot = await membersCol
      .where('profileSlug', '==', slug.toLowerCase())
      .where('canFeature', '==', true)
      .where('isDeactivated', '==', false)
      .get();

    let results = null;

    if (docSnapshot.size === 1) {
      const profile = docSnapshot.docs[0].data();
      profile.id = docSnapshot.docs[0].id;
      profile.profileLinks = profile.profileLinks.filter(
        pl => pl.isPublic === true,
      );

      results = profile;
    }

    return results;
  }

  async function findMe(memberId) {
    const docRef = await dbInstance.doc(`${collectionName}/${memberId}`).get();

    const result = null;

    if (docRef.exists) {
      return {
        id: docRef.id,
        ...docRef.data(),
      };
    }

    return result;
  }

  // async function findMeBySlug(slug) {
  //   const { size, docs } = await membersCol
  //     .where('profileSlug', '==', slug)
  //     .get();

  //   let result = null;
  //   if (size === 1) {
  //     const [doc] = docs;
  //     result = {
  //       id: doc.id,
  //       ...doc.data(),
  //     };
  //   } else if (size > 1)
  //     throw new Error('Slug associated with mupliple members. %s', slug);

  //   return result;
  // }

  async function findIdFromSlug(slug) {
    dlog('findIdFromSlug %s', slug);
    const { size, docs } = await membersCol
      .where('profileSlug', '==', slug)
      .select()
      .get();

    let result = null;
    if (size === 1) {
      const [doc] = docs;
      result = {
        id: doc.id,
        profileSlug: slug,
      };
    } else if (size > 1)
      throw new Error('Slug associated with mupliple members. %s', slug);

    return result;
  }

  async function getSlug(id) {
    dlog('getSlug from id %s', id);
    const docRef = await membersCol.doc(id).get();
    let result = null;
    if (docRef.exists) {
      if (docRef.get('canFeature')) {
        result = {
          id: docRef.id,
          profileSlug: docRef.get('profileSlug'),
        };
      }
    }

    return result;
  }

  async function batchFindMembers(memberIds) {
    dlog('batchFindMembers %o', memberIds);

    const docRefs = memberIds.map(id =>
      dbInstance.doc(`${collectionName}/${id}`),
    );

    return Promise.all(docRefs.map(d => d.get())).then(res =>
      res.map(r => ({
        id: r.id,
        ...r.data(),
      })),
    );
  }

  async function fetchPublicMembersByCreated(limit, startAfter) {
    dlog('fetchPublicMember: limit: %d start after: %s', limit, startAfter);
    const truelimit = Math.min(limit || 20, 100);
    let query = membersCol
      .where('canFeature', '==', true)
      .where('isDeactivated', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(truelimit);

    if (startAfter) {
      const validCursor = moment(startAfter, 'YYYY-MM-DDTHH:mm:ss').isValid();
      dlog('cursor is valid date?', validCursor);
      if (!validCursor) return null; // invalid cursor, return no records

      query = query.startAfter(new Date(startAfter));
    }
    const qrySnapshot = await query.get();

    dlog('fetchPublicMembersByCreated query size? %s', qrySnapshot.size);
    if (!qrySnapshot.size || qrySnapshot.size === 0) return null;

    const memberSet = qrySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    let cursor = '';
    const lastCreatedAt = memberSet[memberSet.length - 1].createdAt;
    if (lastCreatedAt.toDate) {
      dlog('converting Timestamp', lastCreatedAt);
      cursor = lastCreatedAt.toDate().toISOString();
    } else if (isDate(lastCreatedAt)) {
      cursor = lastCreatedAt;
    }

    return {
      cursor,
      members: memberSet,
    };
  }

  async function fetchPublicMembersByFirstName(limit, startAfter) {
    dlog(
      'fetchPublicMembersByLastName: limit: %d, startAfter: %s',
      limit,
      startAfter,
    );
    const truelimit = Math.min(limit || 20, 100);
    let query = membersCol
      .where('canFeature', '==', true)
      .where('isDeactivated', '==', false)
      .orderBy('firstName', 'asc')
      .orderBy('createdAt', 'asc')
      .limit(truelimit);

    if (startAfter) {
      // decode base64, split on separator ||
      const scursor = Buffer.from(startAfter, 'base64')
        .toString('utf8')
        .split('||');
      dlog('decoded cursor: %s, %s', scursor[0], scursor[1]);
      if (!scursor[1]) return null; // invalid cursor, return no records

      query = query.startAfter(scursor[0], scursor[1] || '');
    }
    const qrySnapshot = await query.get();
    dlog('fetchPublicMembersByFirstName query size? %s', qrySnapshot.size);
    if (!qrySnapshot.size || qrySnapshot.size === 0) return null;

    const memberSet = qrySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    // base64 encode new composite cursor
    const cpieces = `${memberSet[memberSet.length - 1].firstName}||${
      memberSet[memberSet.length - 1].createdAt
    }`;
    const cursor = Buffer.from(cpieces, 'utf8').toString('base64');
    dlog('encoded cursor %s', cursor);

    return {
      cursor,
      members: memberSet,
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

  function remove(memberId) {
    dlog('remove');
    const documentRef = dbInstance.doc(`${collectionName}/${memberId}`);

    return documentRef.delete().then(res => memberId);
  }

  return {
    isProfileSlugTaken,
    create,
    findMember,
    findPublicById,
    findMe,
    findIdFromSlug,
    getSlug,
    batchFindMembers,
    fetchPublicMembersByCreated,
    fetchPublicMembersByFirstName,
    update,
    remove,
  };
};

export default member;
