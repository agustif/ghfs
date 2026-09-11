#!/usr/bin/env node
import { NodeRuntime } from '@effect/platform-node'
import { program } from './program'

// Sole process entrypoint — platform Runtime.runMain (SIGINT/SIGTERM, teardown).
NodeRuntime.runMain(program)
