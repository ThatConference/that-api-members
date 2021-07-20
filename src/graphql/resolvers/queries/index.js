import root from './root';

import { fieldResolvers as sessionsFields } from './members';
import { fieldResolvers as profileFields } from './profile';
import { fieldResolvers as publicProfileFields } from './publicProfile';
import { fieldResolvers as followingFields } from './memberFollowing';
import { fieldResolvers as secureProfileFields } from './secureProfile';
import { fieldResolvers as privateProfileFields } from './privateProfile';
import { fieldResolvers as sharedProfileFields } from './sharedProfile';
import { fieldResolvers as registrationProfileFields } from './registrationProfile';

export default {
  ...root,
};

export const fieldResolvers = {
  ...sessionsFields,
  ...profileFields,
  ...publicProfileFields,
  ...followingFields,
  ...secureProfileFields,
  ...privateProfileFields,
  ...sharedProfileFields,
  ...registrationProfileFields,
};
