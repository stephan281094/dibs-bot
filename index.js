require("dotenv").config();
const { send } = require("micro");
const parse = require("urlencoded-body-parser");
const redis = require("redis");

const QUEUE_KEY = "players";
const formatMessage = (message, attachments = []) => ({
  response_type: "in_channel",
  text: `:soccer: ${message}`,
  attachments
});

const clearQueue = async client =>
  new Promise(resolve => client.del(QUEUE_KEY, resolve));
const add = async (client, user) =>
  new Promise(resolve => client.rpush(QUEUE_KEY, user, resolve));
const getQueue = async client =>
  new Promise(resolve =>
    client.lrange(QUEUE_KEY, 0, 4, (_err, values) => {
      resolve(values);
    })
  );

module.exports = async (req, res) => {
  const { text, token, user_name: username } = await parse(req);

  // Handle bad requests.
  if (token !== process.env.TOKEN || !username) {
    return send(res, 400, formatMessage("Bad request"));
  }

  // Create Redis connection.
  const client = redis.createClient(process.env.REDIS_HOST);

  // Clear the queue.
  if (text === "clear") {
    await clearQueue(client);
    return send(res, 200, formatMessage(`Queue has been cleared.`));
  }

  // Check if the user is already in the queue.
  let queue = await getQueue(client);
  if (queue.includes(username)) {
    return send(
      res,
      200,
      formatMessage(
        `${username} is already in the queue. [${queue.length}/4]` +
          (queue.length === 3 ? " We need *one more*!" : ""),
        [{ text: `Players in queue: ${queue.join(", ")}` }]
      )
    );
  }

  // Add the user to the queue.
  await add(client, username);
  queue = await getQueue(client);

  if (queue.length >= 4) {
    await clearQueue(client);
    return send(
      res,
      200,
      formatMessage(`${queue.join(", ")} can play! :tada:`)
    );
  } else {
    return send(
      res,
      200,
      formatMessage(
        `${username} has been added to the queue. [${queue.length}/4]` +
          (queue.length === 3 ? " We need *one more*!" : ""),
        [{ text: `Players in queue: ${queue.join(", ")}` }]
      )
    );
  }
};
