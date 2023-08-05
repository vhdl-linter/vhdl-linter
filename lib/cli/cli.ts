#!/usr/bin/env node
import { cli } from './cliExec';

(async () => {
  const returnCode = await cli(process.argv);
  process.exit(returnCode);
})().catch(err => console.error(err));
