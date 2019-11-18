#!/bin/bash
set -e

case "$1" in
    develop)
        echo "Running Development Server"
        exec yarn run develop | bunyan
        ;;
    test)
        echo "Running Test"
        exec yarn run test
        ;;
    start)
        echo "Running Start"
        exec yarn run start
        ;;
    *)
        exec "$@"
esac
