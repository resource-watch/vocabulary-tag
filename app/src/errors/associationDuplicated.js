'use strict';

class AssociationDuplicated extends Error{

    constructor(message){
        super(message);
        this.name = 'AssociationDuplicated';
        this.message = message;
    }
}
module.exports = AssociationDuplicated;
