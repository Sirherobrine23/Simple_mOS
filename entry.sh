#!/bin/bash
# set -ex
# Create virtual audio device
screen -dm /usr/bin/pulseaudio -D

# Start Process Maneger
node index.js