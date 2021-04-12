import debug from 'debug';
import { utility } from '@thatconference/api';

const dlog = debug('that:api:brinks:datasources:firebase:discountCode');
const { entityDateForge } = utility.firestoreDateForge;
const dcDateForge = entityDateForge({ fields: ['createdAt'] });

const collectionName = 'discountCodes';

const discountCode = dbInstance => {
  dlog('discountCode instance created');

  const dcCollection = dbInstance.collection(collectionName);

  function get(discountCodeId) {
    dlog('get called on %s', discountCodeId);
    return dcCollection
      .doc(discountCodeId)
      .get()
      .then(doc => {
        let result = null;
        if (doc.exists) {
          result = {
            id: doc.id,
            ...doc.data(),
          };
          result = dcDateForge(result);
        }
        return result;
      });
  }

  function findCodesForMember(memberId) {
    dlog('findCodesForMember :: %s', memberId);
    return dcCollection
      .where('memberId', '==', memberId)
      .get()
      .then(querySnap =>
        querySnap.docs.map(d => {
          const r = {
            id: d.id,
            ...d.data(),
          };
          return dcDateForge(r);
        }),
      );
  }

  return { get, findCodesForMember };
};

export default discountCode;
