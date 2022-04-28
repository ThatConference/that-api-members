import debug from 'debug';
import memberStore from '../../../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:query:PartnerAdminQuery');

export const fieldResolvers = {
  PartnerAdminQuery: {
    leadGenMembers: ({ partnerId }, __, { dataSources: { firestore } }) => {
      dlog('leadGenMembers called for %s', partnerId);
      return memberStore(firestore).findLeadGenMembers(partnerId);
    },
  },
};
