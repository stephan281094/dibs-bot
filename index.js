require("dotenv").config()
const { send } = require("micro")
const parse = require("urlencoded-body-parser")

const queue = new Set()
const blacklist = (process.env.BLACKLIST || "")
  .split(",")
  .map(entry => entry.trim())
  .filter(entry => !!entry)

const formatMessage = (message, attachments = []) => ({
  response_type: "in_channel",
  text: `:soccer: ${message}`,
  attachments
})

module.exports = async (req, res) => {
  const { text, token, user_name: username } = await parse(req)

  // Handle bad requests.
  if (token !== process.env.TOKEN || !username) {
    return send(res, 400, formatMessage("Bad request"))
  }

  // Deny people on the blacklist.
  if (blacklist.includes(username)) {
    return send(
      res,
      400,
      formatMessage("Nope. We won't let you! :smiling_imp:")
    )
  }

  // Clear the queue.
  if (text === "clear") {
    queue.clear()
    return send(res, 200, formatMessage(`Queue has been cleared.`))
  }

  // Add the user to the queue.
  queue.add(username)
  const players = Array.from(queue).join(", ")

  if (queue.size >= 4) {
    queue.clear()
    return send(res, 200, formatMessage(`${players} can play! :tada:`))
  } else {
    return send(
      res,
      200,
      formatMessage(
        `${username} has been added to the queue. [${queue.size}/4]` +
          (queue.size === 3 ? " We need *one more*!" : ""),
        [{ text: `Players in queue: ${players}` }]
      )
    )
  }
}
