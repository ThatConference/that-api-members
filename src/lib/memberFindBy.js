import debug from 'debug';
import memberStore from '../dataSources/cloudFirestore/member';

const dlog = debug('that:api:members:findBy');

export default function memberFindBy(findBy, firestore) {
  // parses findby parameter and looks up id/slug as needed
  // id takes precedence if both are provided
  const { id, slug } = findBy;
  if (!id && !slug)
    throw new Error(
      'member findBy requires and id or slug. neither was provided',
    );

  let result = null;
  if (slug && !id) {
    dlog('find member id by slug');
    return memberStore(firestore)
      .findIdFromSlug(slug)
      .then(m => {
        if (m) {
          result = {
            memberId: m.id,
            slug,
          };
        }
        dlog('slug/id result %o', result);
        return result;
      });
  }
  dlog('member by id');
  // id only or id and slug sent
  // get slug/verify slug-id relationship
  return memberStore(firestore)
    .getSlug(id)
    .then(m => {
      if (m) {
        if (slug && slug !== m.profileSlug)
          throw new Error('Member slug and id provided do not correlate');
        result = {
          memberId: m.id,
          profileSlug: m.profileSlug,
        };
      }
      dlog('slug/id result %o', result);
      return result;
    });
}
