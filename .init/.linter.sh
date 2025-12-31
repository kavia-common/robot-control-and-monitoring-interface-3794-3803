#!/bin/bash
cd /home/kavia/workspace/code-generation/robot-control-and-monitoring-interface-3794-3803/robot_runner_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

