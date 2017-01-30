'use strict';

var logger = require('logger');
var JSONAPISerializer = require('jsonapi-serializer').Serializer;
var resourceSerializer = new JSONAPISerializer('vocabulary', {
    attributes: ['tags'],
    pluralizeType: false,
    keyForAttribute: 'camelCase'
});

class ResourceSerializer {

    static serialize(data) {

        let result = {
            data:[]
        };
        if(data){
            if(!Array.isArray(data)){
                data = [data];
            }
            data.forEach(function(el){
                el.vocabularies.forEach(function(vocabulary){
                    result.data.push({
                        id: vocabulary.id,
                        type: 'vocabulary',
                        attributes:{
                            tags: vocabulary.tags,
                            name: vocabulary.id
                        }
                    });
                });
            });
        }
        return result;
    }

    static serializeByIds(data) {

        let result = {
            data:[]
        };
        if(data){
            if(!Array.isArray(data)){
                data = [data];
            }
            data.forEach(function(el){
                el.vocabularies.forEach(function(vocabulary){
                    result.data.push({
                        type: 'vocabulary',
                        attributes:{
                            resource: {
                                id: el.id,
                                type: el.type
                            },
                            tags: vocabulary.tags,
                            name: vocabulary.id
                        }
                    });
                });
            });
            // data.forEach(function(el){
            //     let obj = {
            //         type: 'vocabulary',
            //         id: el.id,
            //         attributes: {}
            //     };
            //     el.vocabularies.forEach(function(vocabulary){
            //         obj.attributes.name = vocabulary.id;
            //         obj.attributes.tags = vocabulary.tags;
            //     });
            //     result.data.push(obj);
            // });
        }
        return result;
    }

}

module.exports = ResourceSerializer;
