require("dotenv").config();
const faunadb = require("faunadb");

const q = faunadb.query;
const client = new faunadb.Client({ secret: process.env.FAUNADB_SECRET });

async function bootstrap() {
  await client
    .query(q.Create(q.Ref("classes"), { name: "queues" }))
    .catch(err => console.log({ err }));

  return client
    .query(
      q.Create(q.Ref("indexes"), {
        name: "queue_status",
        source: q.Ref("classes/queues"),
        terms: [{ field: ["data", "status"] }]
      })
    )
    .catch(err => console.log({ err }));
}

try {
  bootstrap();
} catch (err) {
  console.log("err", err);
}
