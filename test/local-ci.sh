#!/bin/bash
test/docker_vunit.sh && node dist/test/test.js && npx jest && npx eslint --ext .ts --fix .