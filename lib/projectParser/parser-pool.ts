import { StaticPool } from "node-worker-threads-pool";

export const pool = new StaticPool({
  size: 4,
  task: __dirname + '/parser-worker.js'
});