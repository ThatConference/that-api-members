import rootMutations from './root';

import { fieldResolvers as sessionFields } from './member';
import { fieldResolvers as sessionsFields } from './members';

export default {
  ...rootMutations,
};

export const fieldResolvers = {
  ...sessionFields,
  ...sessionsFields,
};
