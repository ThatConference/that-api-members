import debug from 'debug';
import memberFn from '../dataSources/cloudFirestore/member';
import envConfig from '../envConfig';

const dlog = debug('that:api:members:geticalendar');

export default ({ memberId, firestore }) => {
  let memberStore;
  try {
    memberStore = memberFn(firestore);
  } catch (err) {
    Promise.reject(err);
  }
  dlog('iCalendarUrl library initialze for %s', memberId);

  const writeNewIcalKey = async () => {
    const profile = {
      icsKey: `${Math.random().toString(36).slice(2)}${new Date()
        .getTime()
        .toString(36)}`,
    };

    const member = await memberStore.update({ memberId, profile });
    if (!member.icsKey) {
      Promise.reject(Error('Unable to create member.icsKey'));
    }

    return member;
  };

  const getICalendarUrl = async () => {
    dlog('get ical url for %s', memberId);
    let member = await memberStore.findMe(memberId);
    if (!member.icsKey) {
      member = await writeNewIcalKey();
    }
    return `${envConfig.icalUrlBase}/${member.profileSlug}/${member.icsKey}`;
  };

  return { writeNewIcalKey, getICalendarUrl };
};
