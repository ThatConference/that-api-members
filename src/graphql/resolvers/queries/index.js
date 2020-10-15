import root from './root';

import { fieldResolvers as sessionsFields } from './members';
import { fieldResolvers as profileFields } from './profile';
import { fieldResolvers as publicProfileFields } from './publicProfile';
import { fieldResolvers as followingFields } from './memberFollowing';

export default {
  ...root,
};

export const fieldResolvers = {
  ...sessionsFields,
  ...profileFields,
  ...publicProfileFields,
  ...followingFields,
};
