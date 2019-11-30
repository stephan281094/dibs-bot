require("dotenv").config();
const faunadb = require("faunadb");
const { send } = require("micro");
const parse = require("urlencoded-body-parser");

// Utilities ===================================================================
const formatMessage = (message, attachments = []) => ({
  response_type: "in_channel",
  text: `:soccer: ${message}`,
  attachments
});

// Database ====================================================================
const q = faunadb.query;
const client = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET
});

// Create a new queue.
async function createQueue() {
  const queue = {
    created: Date.now(),
    players: [],
    status: "OPEN"
  };

  return client.query(q.Create(q.Ref("classes/queues"), { data: queue }));
}

// Get all open queues (should always be one).
async function getOpenQueues() {
  const refs = await client.query(
    q.Paginate(q.Match(q.Ref("indexes/queue_status"), ["OPEN"]))
  );

  return client.query(refs.data.map(ref => q.Get(ref)));
}

// Update a queue.
async function updateQueue(ref, data) {
  return client.query(q.Update(ref, { data }));
}

// API =========================================================================
module.exports = async (req, res) => {
  const { text, token, user_name: username } = await parse(req);

  // Handle bad requests.
  if (token !== process.env.SLACK_TOKEN || !username) {
    return send(res, 400, formatMessage("Bad request"));
  }

  // Get the queue.
  const openQueues = await getOpenQueues();
  const queue = openQueues[0] || (await createQueue());

  // Clear the queue.
  if (text === "clear") {
    if (queue.data.players.length > 0) {
      await updateQueue(queue.ref, { ...queue.data, status: "CLOSED" });
    }

    return send(res, 200, formatMessage(`Queue has been cleared.`));
  }

  // Check if the user is already in the queue.
  if (queue.data.players.includes(username)) {
    const { players } = queue.data;

    return send(
      res,
      200,
      formatMessage(
        `${username} is already in the queue. [${players.length}/4]` +
          (players.length === 3 ? " We need *one more*!" : ""),
        [{ text: `Players in queue: ${players.join(", ")}` }]
      )
    );
  }

  // Update the queue.
  const players = [...queue.data.players, username];
  const updatedQueue = {
    ...queue.data,
    players,
    status: players.length === 4 ? "CLOSED" : "OPEN"
  };
  await updateQueue(queue.ref, updatedQueue);

  // Notify channel that player has been added.
  if (players.length < 4) {
    return send(
      res,
      200,
      formatMessage(
        `${username} has been added to the queue. [${players.length}/4]` +
          (players.length === 3 ? " We need *one more*!" : ""),
        [{ text: `Players in queue: ${players.join(", ")}` }]
      )
    );
  }

  // Notify channel that queue is full and players can start playing.
  return send(
    res,
    200,
    formatMessage(`${players.join(", ")} can play! :tada:`)
  );
};
