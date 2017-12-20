#!/bin/bash
set -e

case "$1" in
    develop)
        echo "Running Development Server"
        exec grunt --gruntfile app/Gruntfile.js | bunyan
        ;;
    test)
        echo "Running Test"
        exec npm run test
        ;;
    start)
        echo "Running Start"
        exec npm run start
        ;;
    *)
        exec "$@"
esac
