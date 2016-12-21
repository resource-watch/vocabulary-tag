'use strict';

class ResourceDuplicated extends Error{

    constructor(message){
        super(message);
        this.name = 'ResourceDuplicated';
        this.message = message;
    }
}
module.exports = ResourceDuplicated;
