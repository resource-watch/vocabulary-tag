'use strict';

class RelationshipNotValid extends Error{

    constructor(messages){
        super(messages);
        this.name = 'RelationshipNotValid';
        this.messages = messages;
    }

    getMessages(){
        var messages = '- ';
        this.messages.forEach(function(message){
            messages += Object.keys(message)[0] + ': ' + message[Object.keys(message)[0]] + ' - ';
        });
        return messages;
    }
}
module.exports = RelationshipNotValid;
