import root from './root';

import { fieldResolvers as sessionsFields } from './members';
import { fieldResolvers as profileFields } from './profile';
import { fieldResolvers as publicProfileFields } from './publicProfile';
import { fieldResolvers as followingFields } from './memberFollowing';
import { fieldResolvers as secureProfileFields } from './secureProfile';
import { fieldResolvers as privateProfileFields } from './privateProfile';
import { fieldResolvers as sharedProfileFields } from './sharedProfile';
import { fieldResolvers as registrationProfileFields } from './registrationProfile';
import { fieldResolvers as profilesFields } from './profiles';
import { fieldResolvers as meritBadgeFields } from './meritBadge';
import { fieldResolvers as leadGenMemberFields } from './extend-leadGenMember';
import { fieldResolvers as adminMembersFields } from './adminMembers';
import { fieldResolvers as membersNetworkFields } from './membersNetwork';
import { fieldResolvers as networkShareByMeFields } from './networkShareByMe';
import { fieldResolvers as networkShareWitMeFields } from './networkShareWithMe';

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
  ...profilesFields,
  ...meritBadgeFields,
  ...leadGenMemberFields,
  ...adminMembersFields,
  ...membersNetworkFields,
  ...networkShareByMeFields,
  ...networkShareWitMeFields,
};
