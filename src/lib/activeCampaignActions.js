// Provides common interations with Active Campaign API.
// depends on our Active Campaign library
import * as Sentry from '@sentry/node';
import debug from 'debug';
import ac from './activeCampaign';
import envConfig from '../envConfig';

const dlog = debug('that:api:members:activeCampaignActions');

async function addTagToContact(tagName, user) {
  // Add a tag to a contact based on email address.
  // If the user isn't an AC ontact they will be added.
  dlog('call addTagToContact for tag % and user %o', tagName, user);
  const [contactResult, tagResult] = await Promise.all([
    ac.findContactByEmail(user.email),
    ac.searchForTag(tagName),
  ]);
  dlog('contactResult %o', contactResult);
  dlog('tagResult %o', tagResult);
  if (!tagResult || (tagResult && !tagResult.id)) {
    dlog(`tag, ${tagName}, not found at AC`);
    Sentry.captureMessage(`Tag ${tagName} not found in AC`, 'error');
    return undefined;
  }
  const tagId = tagResult.id;
  let contactId = '';
  if (!contactResult || (contactResult && !contactResult.id)) {
    const contact = {
      contact: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.firstName,
      },
    };
    const newContact = await ac.createContact(contact);
    if (!newContact) {
      dlog(`failed creating contact in AC %o`, contact);
      Sentry.captureMessage('failed creating contact in AC', 'error');
      return undefined;
    }
    contactId = newContact.id;
  } else {
    contactId = contactResult.id;
  }

  const taggedContact = await ac.addTagToContact(contactId, tagId);
  if (!taggedContact) {
    dlog(`Tag didn't set to contact`);
    Sentry.captureMessage('falied adding tag to contact in AC', 'error');
    return undefined;
  }
  return taggedContact;
}

function setRegisteredFromFieldValue(email, fieldValue) {
  // update user with registered from field value
  // Common value for this field is user.site
  dlog(
    'call setRegisteredFieldValueToContact for %s field value %s',
    email,
    fieldValue,
  );
  const contact = {
    contact: {
      email,
      fieldValues: [
        {
          field: envConfig.acRegisteredFromField,
          value: fieldValue,
        },
      ],
    },
  };
  return ac
    .syncContact(contact)
    .then(r => r)
    .catch(err => err);
}

export default {
  addTagToContact,
  setRegisteredFromFieldValue,
};
