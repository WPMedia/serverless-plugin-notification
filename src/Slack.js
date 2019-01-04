const request = require('request-promise-lite');

const SLACK_BASEURL = 'https://slack.com/api';

class Slack {
  constructor(settings) {
    this.token = settings.token;
    this.channel = settings.channel;
    this.username = settings.username || 'Serverless Notification';
  }

  buildPost(notification) {
    const colorGray = '#D3D3D3';
    const colorGreen = 'good';
    const colorYeallow = 'warning';
    // const colorRed = 'danger';

    let icon = ':dark_sunglasses:';
    let color = colorGray;

    if (notification.severity === 'good') {
      icon = ':tada:';
      color = colorGreen;
    }

    if (notification.severity === 'warning') {
      icon = ':rotating_light:';
      color = colorYeallow;
    }

    return {
      text: `\`${notification.serviceName}\`${this.uncommittedFiles(notification)}\n
      Invocation ID: *${notification.invocationId}*\nStage: *${
      notification.stage
    }*, Region: *${notification.region}*, Deployer: *${
      notification.deployer
    }*
    `,
      attachments: [{
        color: color,
        title: `${
            notification.message
          } ${icon} ${icon} ${icon}`,

        author_name: `${notification.git.commit} on ${notification.git.branch}`,
        author_link: `${notification.git.url}`,
        mrkdwn: true,
        fields: [{
          title: 'Provider',
          value: `${notification.providerName}`,
          short: 'true',
        },
        {
          title: 'Lambda runtime',
          value: `${notification.runtime}`,
          short: 'true',
        },
        {
          title: 'Number of lambdas',
          value: `${notification.functions.length}`,
          short: 'true',
        },
        {
          title: 'Number of endpoints',
          value: `${notification.endpoints.length}`,
          short: 'true',
        },
        ],
      }],
    };
  }

  uncommittedFiles(notification) {
    return notification.git.modified_files.length > 0 || notification.git.added_files.length > 0 ? `\n> *Uncommitted files during deploy*` : '';
  }

  buildGitInfoReply(notification) {
    const reply = [{
      title: notification.git.commit,
      color: '#E67E22',
      text: `${notification.git.message}, by ${notification.git.author} on branch ${notification.git.branch} @ ${notification.git.date}`,
    } ]

    if (notification.git.modified_files.length > 0) {
      reply.push(
        {
          title: `Modified since commit`,
          color: '#A93226',
          text: notification.git.modified_files.join('\n'),
        }
      )
    }
    if (notification.git.added_files.length > 0 ) {
      reply.push(
        {
          title: `Added since commit`,
          color: '#1F618D',
          text: notification.git.added_files.join('\n'),
        }
      )
    }
    return reply;
  }


  buildReply(notification) {
    const formatEndpoint = endpointObj =>
      `${endpointObj.method}~${endpointObj.path}`;
    const reply = {
      commit: this.buildGitInfoReply(notification),
      functions: [{
        title: 'Function listing',
        color: '#49311c',
        text: `\n${notification.functions.join('\n')}`,
      }],
    };
    if (notification.endpoints.length > 0) {
      reply.endpoints = [{
        title: 'Endpoint listing',
        color: '#49311c',
        text: `\n${notification.endpoints.map(formatEndpoint).join('\n')}`,
      }];
    }

    return reply;
  }

  notify(notification, logger) {
    if (!this.token)
      return Promise.reject(
        Error('Cannot send slack notification without slack token')
      );
    if (!this.channel)
      return Promise.reject(
        Error('Cannot send slack notification without a specified channel')
      );
    const message = this.buildPost(notification);
    const reply = this.buildReply(notification);

    // Post general information as a new post
    const queryMessage = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      json: true,
      form: {
        text: message.text,
        token: this.token,
        channel: this.channel,
        attachments: JSON.stringify(message.attachments),
        username: this.username,
      },
    };

    return request
      .post(`${SLACK_BASEURL}/chat.postMessage`, queryMessage)
      .then(response => {
        if (response.ok === false) throw new Error(response);

        // All good
        logger(
          '[Serverless Plugin Notification | Slack] Succesfully sent notification message'
        );

        // Put function and endpoint listing to reply
        return Promise.all(
          Object.keys(reply).map(key => {
            const queryReply = {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              json: true,
              form: {
                token: this.token,
                channel: this.channel,
                thread_ts: response.ts,
                attachments: JSON.stringify(reply[key]),
                username: this.username,
              },
            };
            return request
              .post(`${SLACK_BASEURL}/chat.postMessage`, queryReply)
              .then(response => {
                if (response.ok === false) throw new Error(response);
                // All good
                logger(
                  '[Serverless Plugin Notification | Slack] Succesfully sent notification reply'
                );
              });
          })
        );
      })
      .catch(error => {
        logger(
          `[Serverless Plugin Notification | Slack] error sending one of the message, error \n${JSON.stringify(
            error
          )}`
        );
        return;
      });
  }
}

module.exports = Slack;
