import fetch from 'node-fetch';
import debug from 'debug';
import envConfig from '../envConfig';

const dlog = debug('that:api:sessions:slack-notifications');

function callSlackHook(hookBody) {
  dlog('calling Slack hook');
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.TEST_SLACK_NOTIFICATIONS
  ) {
    const slackUrl = envConfig.slackWebhookUrl;
    fetch(slackUrl, {
      method: 'post',
      body: JSON.stringify(hookBody),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.text())
      .then(res => dlog('Slack webhood response: %o', res))
      .catch(err => dlog('ERROR sending slack notifcation: %O', err));
  } else {
    dlog('DEVELOPMENT Env: SLACK PAYLOAD TO SEND: %o', hookBody);
  }
}

export default {
  memberCreated: ({ user }) => {
    dlog('memberCreated slack notification called');

    let userProfileImage = user.profileImage;
    if (!userProfileImage || userProfileImage.length < 7)
      userProfileImage = envConfig.defaultProfileImage;
    let { thatSlackUsername } = user;
    if (!thatSlackUsername || thatSlackUsername === 'null') {
      thatSlackUsername = ' ';
    } else {
      thatSlackUsername = `*THAT Slack:*\n@${thatSlackUsername}`;
    }
    const bioMaxLength = 500;
    let userBio;
    if (!user.bio || user.bio === 'null') userBio = ' ';
    else if (user.bio.length > bioMaxLength)
      userBio = `${user.bio.substring(0, bioMaxLength)} ...`;
    else userBio = user.bio;

    const slackBody = {
      channel: envConfig.memberNotifSlackChannel,
      username: 'THAT.us Bot',
      icon_emoji: ':that-blue:',
      text: ':that-blue: Welcome a new member to THAT Community :heart:',
      attachments: [
        {
          color: '#26529a',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*<https://that.us/members/${user.profileSlug}|${user.firstName} ${user.lastName}>*`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Company:*\n${user.company}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Title:*\n${user.jobTitle}`,
                },
                {
                  type: 'mrkdwn',
                  text: thatSlackUsername,
                },
              ],
              accessory: {
                type: 'image',
                image_url: userProfileImage,
                alt_text: `${user.firstName} ${user.lastName}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Bio:*\n${userBio}`,
              },
            },
          ],
        },
      ],
    };

    callSlackHook(slackBody);
  },
};
