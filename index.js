const { send } = require('micro')
const parse = require('urlencoded-body-parser')

const queue = new Set()

const formatMessage = (message, attachments = []) => ({
  response_type: 'in_channel',
  text: `:soccer: ${message}`,
  attachments
})

module.exports = async (req, res) => {
  const { text, user_name: username } = await parse(req)

  if (!username) {
    return send(res, 400, ':soccer: Bad request')
  }

  if (text === 'clear') {
    queue.clear()
    return send(res, 200, formatMessage(`Queue has been cleared.`))
  }

  queue.add(username)
  const players = Array.from(queue).join(', ')

  if (queue.size >= 4) {
    queue.clear()
    return send(res, 200, formatMessage(`${players} can play! :tada:`))
  } else {
    return send(res, 200, formatMessage(
      `${username} has been added to the queue. [${queue.size}/4]` +
        (queue.size === 3 ? ' We need *one more*!' : ''),
      [ { text: `Players in queue: ${players}` } ]
    ))
  }
}
