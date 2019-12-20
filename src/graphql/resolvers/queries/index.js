import root from './root';

import { fieldResolvers as sessionsFields } from './members';

export default {
  ...root,
};

export const fieldResolvers = {
  ...sessionsFields,
};
