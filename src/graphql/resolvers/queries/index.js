import root from './root';

import { fieldResolvers as sessionsFields } from './members';
import { fieldResolvers as profileFields } from './profile';
import { fieldResolvers as publicProfileFields } from './publicProfile';

export default {
  ...root,
};

export const fieldResolvers = {
  ...sessionsFields,
  ...profileFields,
  ...publicProfileFields,
};
