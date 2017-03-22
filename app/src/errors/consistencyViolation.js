
class ConsistencyViolation extends Error {

    constructor(message) {
        super(message);
        this.name = 'ConsistencyViolation';
        this.message = message;
    }

}

module.exports = ConsistencyViolation;
