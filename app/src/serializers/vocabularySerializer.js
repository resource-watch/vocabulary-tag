'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var vocabularySerializer = new JSONAPISerializer('vocabulary', {
    attributes: ['resources'],
    pluralizeType: false,
    keyForAttribute: 'camelCase'
});

class VocabularySerializer {

    static serialize(data) {

        logger.debug(data);
        let result = {
            data:[]
        };
        if(data){
            if(!Array.isArray(data)){
                data = [data];
            }
            data.forEach(function(el){
                result.data.push({
                    id: el.id,
                    type: 'vocabulary',
                    attributes:{
                        resources: el.resources,
                        createdAt: el.createdAt,
                        updatedAt: el.updatedAt,
                        status: el.status
                    }
                });
            });
        }
        return result;
    }
}

module.exports = VocabularySerializer;
