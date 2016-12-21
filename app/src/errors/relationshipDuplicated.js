'use strict';

class RelationshipDuplicated extends Error{

    constructor(message){
        super(message);
        this.name = 'RelationshipDuplicated';
        this.message = message;
    }
}
module.exports = RelationshipDuplicated;
