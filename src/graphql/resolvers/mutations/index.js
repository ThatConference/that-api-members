import rootMutations from './root';

import { fieldResolvers as memberFields } from './member';
import { fieldResolvers as membersFields } from './members';
import { fieldResolvers as adminMemberFields } from './adminMember';
import { fieldResolvers as adminMembersFields } from './adminMembers';
import { fieldResolvers as sharedProfileFields } from './sharedProfile';
import { fieldResolvers as profilesFields } from './profiles';
import { fieldResolvers as membersNetworkFields } from './membersNetwork';
import { fieldResolvers as networkSharingWithFields } from './networkSharingWith';
import { fieldResolvers as shareWithAddByFieds } from './shareWithAddBy';

export default {
  ...rootMutations,
};

export const fieldResolvers = {
  ...memberFields,
  ...membersFields,
  ...adminMemberFields,
  ...adminMembersFields,
  ...sharedProfileFields,
  ...profilesFields,
  ...membersNetworkFields,
  ...networkSharingWithFields,
  ...shareWithAddByFieds,
};
