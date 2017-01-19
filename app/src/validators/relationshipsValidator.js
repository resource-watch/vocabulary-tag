'use strict';

const logger = require('logger');
const config = require('config');
const RelationshipsNotValid = require('errors/relationshipsNotValid');

class RelationshipsValidator{

    static * validate(koaObj){
        logger.info('Validating Relationships Creation');
        Object.keys(koaObj.request.body).forEach(function(key){
            if(key !== 'loggedUser'){
                koaObj.checkBody(key).check(function(){
                    if(this[key] instanceof Object && this[key].length === undefined){
                        if(this[key].tags instanceof Array && this[key].tags.length > 0){
                            return true;
                        }
                    }
                    return false;
                }.bind(koaObj.request.body));
            }
        }.bind(koaObj.request.body));
        if(koaObj.errors){
            logger.error('Error validating relationships creation');
            throw new RelationshipsNotValid(koaObj.errors);
        }
        return true;
    }

}

module.exports = RelationshipsValidator;
