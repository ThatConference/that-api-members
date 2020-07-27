import rootMutations from './root';

import { fieldResolvers as memberFields } from './member';
import { fieldResolvers as membersFields } from './members';
import { fieldResolvers as adminMemberFields } from './adminMember';
import { fieldResolvers as adminMembersFields } from './adminMembers';

export default {
  ...rootMutations,
};

export const fieldResolvers = {
  ...memberFields,
  ...membersFields,
  ...adminMemberFields,
  ...adminMembersFields,
};
