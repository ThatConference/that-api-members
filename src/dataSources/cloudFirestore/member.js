const event = (dbInstance, logger) => {
  const collectionName = 'members';
  const membersCol = dbInstance.collection(collectionName);

  const create = async newSession => {};

  const find = async id => {};

  const update = (id, eventInput) => {};

  return { create, find, update };
};

export default event;
