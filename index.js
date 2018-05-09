const { send } = require('micro')
const parse = require('urlencoded-body-parser')

const queue = new Set()

const formatMessage = (message, attachments = []) => ({
  response_type: 'in_channel',
  text: `:soccer: ${message}`,
  attachments
})

module.exports = async (req, res) => {
  const { user_name: username } = await parse(req)

  if (!username) send(res, 400, ':soccer: Bad request')

  queue.add(username)
  const players = Array.from(queue).join(', ')

  if (queue.size >= 4) {
    queue.clear()
    send(res, 200, formatMessage(`${players} can play! :tada:`))
  } else {
    send(res, 200, formatMessage(
      `${username} has been added to the queue. [${queue.size}/4]` +
        (queue.size === 3 ? ' We need *one more*!' : ''),
      [ { text: `Players in queue: ${players}` } ]
    ))
  }
}
