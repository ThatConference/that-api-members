import root from './root';

import { fieldResolvers as sessionsFields } from './members';
import { fieldResolvers as profileFields } from './profile';

export default {
  ...root,
};

export const fieldResolvers = {
  ...sessionsFields,
  ...profileFields,
};
