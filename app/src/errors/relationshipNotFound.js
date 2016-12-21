'use strict';

class RelationshipNotFound extends Error{

    constructor(message){
        super(message);
        this.name = 'RelationshipNotFound';
        this.message = message;
    }
}
module.exports = RelationshipNotFound;
