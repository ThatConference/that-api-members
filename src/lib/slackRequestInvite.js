/**
 * Send a Slack Invite to submitted email address
 * This is an undocumented Slack API call.
 * reference: https://github.com/ErikKalkoken/slackApiDoc/blob/master/users.admin.invite.md
 */
import fetch from 'node-fetch';
import debug from 'debug';
import envConfig from '../envConfig';

const dlog = debug('that:api:members:slack-invite');

export default function slackRequestInvite({ email }) {
  dlog('slackRequestInvite called for %s', email);

  const slackToken = envConfig.slack.legacyToken;
  const { inviteUrl } = envConfig.slack;
  const params = new URLSearchParams();
  params.append('token', slackToken);
  params.append('email', email);

  const posttext = 'Please contact us for your THAT Slack invite';
  const result = {
    toUser: '',
    toSentry: '',
    result: null,
  };
  return fetch(inviteUrl, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
  })
    .then(res => res.json())
    .then(res => {
      result.result = res;
      if (res.ok === true) {
        result.toUser = `Your invite is successfully requested. Check your email for your THAT Slack invitation!`;
      } else if (res.ok === false && res.error) {
        switch (res.error) {
          case 'already_in_team':
          case 'already_in_team_invited_user':
            result.toUser = `You are already a member of THAT Slack with the email address in your profile.`;
            break;
          case 'invalid_email':
            result.toUser = `The email address in your profile is invalid for Slack. ${posttext}.`;
            result.toSentry = `email ${email} is invalid for Slack API.`;
            break;
          case 'user_disabled':
            result.toUser = `Your email address in your profile is disabled in Slack. ${posttext}.`;
            break;
          case 'invite_limit_reached':
          case 'not_allowed_token_type':
          case 'not_authed':
          case '':
            result.toUser = `There has been a Slack system issue. ${posttext} or try again.`;
            result.toSentry = `Slack limit or auth issue`;
            break;
          default:
            result.toUser = `Unknown response from received from Slack. ${posttext}. ref:${res.error}`;
            result.toSentry = `unknown or unhandled response from slack: ${res.error}`;
        }
      } else {
        result.toUser = `there was an error requesting your THAT Slack invite. ${posttext}`;
        result.toSentry = `unknown response from slack`;
      }

      return result;
    });
}
