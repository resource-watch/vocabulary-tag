
class ResourceUpdateFailed extends Error {

    constructor(message) {
        super(message);
        this.name = 'ResourceUpdateFailed';
        this.message = message;
    }

}

module.exports = ResourceUpdateFailed;
