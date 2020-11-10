class ResourceNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'ResourceNotFound';
        this.message = message;
    }

}

module.exports = ResourceNotFound;
