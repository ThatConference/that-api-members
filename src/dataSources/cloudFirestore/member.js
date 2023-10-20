import debug from 'debug';
import * as Sentry from '@sentry/node';
import { dataSources, utility } from '@thatconference/api';

const dlog = debug('that:api:members:datasources:members');
const slugStore = dataSources.cloudFirestore.slug;
const { entityDateForge, dateForge } = utility.firestoreDateForge;
const forgeFields = [
  'createdAt',
  'lastUpdatedAt',
  'membershipExpirationDate',
  'requestSlackInviteAt',
];
const memberDateForge = entityDateForge({ fields: forgeFields });

function scrubProfile(profile, isNew) {
  const scrubbedProfile = profile;

  const modifiedAtDate = new Date();

  if (isNew) {
    scrubbedProfile.createdAt = modifiedAtDate;
    if (!scrubbedProfile.interests) scrubbedProfile.interests = [];
  }
  scrubbedProfile.lastUpdatedAt = modifiedAtDate;
  if (scrubbedProfile.email)
    scrubbedProfile.email = scrubbedProfile.email.toLowerCase();

  return scrubbedProfile;
}

function isValidDate(d) {
  // eslint-disable-next-line no-restricted-globals
  return d instanceof Date && !isNaN(d);
}

const member = dbInstance => {
  const collectionName = 'members';
  const membersCol = dbInstance.collection(collectionName);

  function isProfileSlugTaken(slug) {
    dlog('isProfileSlugUnique', slug);
    return slugStore(dbInstance).isSlugTaken(slug);
  }

  async function create({ user, profile }) {
    dlog('create called, user %o with profile %o', user, profile);
    const docRef = membersCol.doc(user.sub);
    const modifiedProfile = scrubProfile(profile, true);
    dlog('modified profile %o', modifiedProfile);

    const isSlugTaken = await isProfileSlugTaken(modifiedProfile.profileSlug);
    if (isSlugTaken)
      throw new Error(
        'profile slug is taken it cannot be used to create a new profile',
      );

    const slugDoc = slugStore(dbInstance).makeSlugDoc({
      slugName: modifiedProfile.profileSlug,
      type: 'member',
      referenceId: user.sub,
    });
    slugDoc.createdAt = modifiedProfile.createdAt;
    const slugDocRef = slugStore(dbInstance).getSlugDocRef(
      modifiedProfile.profileSlug,
    );

    const writeBatch = dbInstance.batch();
    writeBatch.create(docRef, modifiedProfile);
    writeBatch.create(slugDocRef, slugDoc);
    let writeResult;
    try {
      writeResult = await writeBatch.commit();
    } catch (err) {
      dlog('failed batch write member profile and slug');
      Sentry.withScope(scope => {
        scope.setLevel('error');
        scope.setTag('memberId', user.sub);
        scope.setTag('profileSlug', modifiedProfile?.profileSlug);
        scope.setContext('batch write of member profile and slug failed', {
          modifiedProfile,
          slugDoc,
        });
        Sentry.captureException(err);
      });
      throw new Error('failed batch write member profile and slug');
    }
    dlog('writeResult @O', writeResult);
    const out = {
      id: docRef.id,
      ...modifiedProfile,
    };

    return memberDateForge(out);
  }

  async function findPublicById(id) {
    dlog('findPublicById %s', id);
    const docRef = await membersCol.doc(id).get();
    let result = null;
    if (docRef.exists) {
      if (docRef.get('canFeature') && !docRef.get('isDeactivated')) {
        const pl = docRef.get('profileLinks');
        result = {
          id: docRef.id,
          ...docRef.data(),
          profileLinks: pl ? pl.filter(p => p.isPublic) : [],
        };
        result = memberDateForge(result);
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
      profile.profileLinks =
        profile.profileLinks?.filter(pl => pl.isPublic === true) ?? [];

      results = memberDateForge(profile);
    }

    return results;
  }

  async function findMe(memberId) {
    const docRef = await dbInstance.doc(`${collectionName}/${memberId}`).get();

    let result = null;

    if (docRef.exists) {
      result = {
        id: docRef.id,
        ...docRef.data(),
      };
      result = memberDateForge(result);
    }

    return result;
  }

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
      result = {
        id: docRef.id,
        profileSlug: docRef.get('profileSlug'),
      };
    }

    return result;
  }

  async function batchFindMembers(memberIds) {
    dlog('batchFindMembers called on %d ids', memberIds?.length);
    if (!Array.isArray(memberIds))
      throw new Error('batchFindMembers parameter must be an array');

    const docRefs = memberIds.map(id =>
      dbInstance.doc(`${collectionName}/${id}`),
    );
    if (docRefs.length < 1) return [];

    return dbInstance.getAll(...docRefs).then(docSnaps =>
      docSnaps.map(r => {
        const result = {
          id: r.id,
          ...r.data(),
        };

        return memberDateForge(result);
      }),
    );
  }

  async function fetchPublicMembersByCreated(limit, startAfter) {
    // Start after is poorly named, it is the cursor for the paged request
    dlog('fetchPublicMember: limit: %d start after: %s', limit, startAfter);
    const truelimit = Math.min(limit || 20, 100);
    let query = membersCol
      .where('canFeature', '==', true)
      .where('isDeactivated', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(truelimit);

    if (startAfter) {
      const scursor = Buffer.from(startAfter, 'base64').toString('utf8');
      const { curStartAfter } = JSON.parse(scursor);
      if (!curStartAfter)
        throw new Error('Invlid cursor value provied for startAfter');

      const curCreatedDate = new Date(curStartAfter);
      if (!isValidDate(curCreatedDate)) return null; // invalid cursor, return no records

      query = query.startAfter(curCreatedDate);
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
    if (lastCreatedAt) {
      const cpieces = JSON.stringify({
        curStartAfter: dateForge(lastCreatedAt),
      });
      cursor = Buffer.from(cpieces, 'utf8').toString('base64');
    }

    return {
      cursor,
      members: memberSet.map(m => memberDateForge(m)),
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

      const createdAt = new Date(scursor[1]);
      if (!isValidDate) return null; // invalid cursor, return no records

      query = query.startAfter(scursor[0], createdAt || '');
    }

    const qrySnapshot = await query.get();
    dlog('fetchPublicMembersByFirstName query size? %s', qrySnapshot.size);
    if (!qrySnapshot.size || qrySnapshot.size === 0) return null;

    const memberSet = qrySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    // base64 encode new composite cursor
    const curFirstName = memberSet[memberSet.length - 1].firstName;
    const curCreatedDate = memberSet[memberSet.length - 1].createdAt
      .toDate()
      .toISOString();
    const cpieces = `${curFirstName}||${curCreatedDate}`;
    const cursor = Buffer.from(cpieces, 'utf8').toString('base64');
    dlog('encoded cursor %s', cursor);

    return {
      cursor,
      members: memberSet.map(m => memberDateForge(m)),
    };
  }

  async function fetchAnyMembersPaged({ orderBy, cursor, pageSize = 20 }) {
    dlog(
      'fetchAnyMembersPaged:: orderBy: %s, pageSize: %d, cursor: %s',
      orderBy,
      pageSize,
      cursor,
    );
    let query = membersCol;
    if (orderBy === 'FIRSTNAME') {
      query = query.orderBy('firstName', 'asc');
    }
    query = query.orderBy('createdAt', 'asc').limit(pageSize);

    if (cursor) {
      const scursor = Buffer.from(cursor, 'base64').toString('utf8');
      dlog('scursor: %o', scursor);
      let curCreatedAt;
      let curFirstName;
      try {
        ({ curCreatedAt, curFirstName } = JSON.parse(scursor));
      } catch (err) {
        Sentry.setTags({
          rawCursor: cursor,
          cursor: scursor,
        });
        throw new Error('Invalid cursor provided');
      }
      if (orderBy === 'FIRSTNAME' && !curFirstName)
        throw new Error('Invalid cursor provided (fn)');
      const startAfterDate = new Date(curCreatedAt);
      if (!isValidDate(startAfterDate)) {
        Sentry.setTags({
          rawCursor: cursor,
          cursor: scursor,
        });
        throw new Error('Invalid cursor provided (date)');
      }
      if (orderBy === 'FIRSTNAME') {
        query = query.startAfter(curFirstName, startAfterDate);
      } else {
        query = query.startAfter(startAfterDate);
      }
    }
    const { size, docs } = await query.get();
    dlog('found %d members', size);

    const memberPage = docs.map(doc => {
      const r = {
        id: doc.id,
        ...doc.data(),
      };

      return memberDateForge(r);
    });

    const lastMember = memberPage[memberPage.length - 1];
    let newCursor = '';
    if (lastMember && memberPage.length >= pageSize) {
      dlog('lastMember:: %o', lastMember);
      const curCreatedAt = new Date(lastMember.createdAt);
      const curFirstName = lastMember.firstname;
      const curObj = { curCreatedAt };
      if (orderBy === 'FIRSTNAME') {
        curObj.curFirstName = curFirstName;
      }
      const cpieces = JSON.stringify(curObj);
      newCursor = Buffer.from(cpieces, 'utf8').toString('base64');
    }

    return {
      profiles: memberPage,
      cursor: newCursor,
      count: memberPage.length,
    };
  }

  function fetchAnyPatronMember() {
    dlog('fetchAnyPatronMember called');
    return membersCol
      .where('membershipExpirationDate', '>', new Date('01/01/2020'))
      .get()
      .then(querySnap =>
        querySnap.docs.map(doc => {
          const r = {
            id: doc.id,
            ...doc.data(),
          };
          return memberDateForge(r);
        }),
      );
  }

  async function update({ memberId, profile }) {
    dlog('update called on member %o', profile);

    const docRef = membersCol.doc(memberId);
    const modifiedProfile = scrubProfile(profile);
    // new map types can be added to this as they are added to the member document.
    // using the same pre-document fetch to fill in existing object data
    // (called `map` in Firestore)
    if (
      typeof modifiedProfile?.notificationPreferences === 'object' &&
      modifiedProfile?.notificationPreferences !== null
    ) {
      dlog(
        '✉️  update to notificationPreferences identified: %o',
        modifiedProfile,
      );
      const preMember = await docRef
        .get()
        .then(r => ({ id: r.id, ...r.data() }));
      const np = preMember.notificationPreferences ?? {};
      modifiedProfile.notificationPreferences = {
        ...np,
        ...modifiedProfile.notificationPreferences,
      };
    }

    await docRef.update(modifiedProfile);

    const updatedDoc = await docRef.get();
    const out = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    return memberDateForge(out);
  }

  function deactivate(memberId) {
    dlog('deactivate member %s', memberId);

    const upProfile = { isDeactivated: true };
    scrubProfile(upProfile);
    const docRef = membersCol.doc(memberId);
    return docRef.update(upProfile).then(() => findMe(memberId));
  }

  function remove(memberId) {
    dlog('remove');
    const documentRef = dbInstance.doc(`${collectionName}/${memberId}`);

    return documentRef.delete().then(res => memberId);
  }

  function findLeadGenMembers(partnerId) {
    dlog('findLeadGenMembers for %s', partnerId);
    return membersCol
      .where('activePartnerId', '==', partnerId)
      .get()
      .then(querySnap =>
        querySnap.docs.map(m => {
          const result = {
            id: m.id,
            ...m.data(),
          };

          return memberDateForge(result);
        }),
      );
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
    fetchAnyMembersPaged,
    fetchAnyPatronMember,
    update,
    deactivate,
    remove,
    findLeadGenMembers,
  };
};

export default member;
