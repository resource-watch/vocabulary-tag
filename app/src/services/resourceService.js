'use strict';

const logger = require('logger');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const config = require('config');
const Resource = require('models/resource');
const ResourceUpdateFailed = require('errors/resourceUpdateFailed');
const ResourceNotFound = require('errors/resourceNotFound');
const VocabularyNotFound = require('errors/vocabularyNotFound');
const ctRegisterMicroservice = require('ct-register-microservice-node');
const request = require('request');

const deserializer = function(obj){
    return function(callback){
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};

class ResourceService {

    static * get(dataset, resource, vocabulary){
        let query = {
            dataset: dataset,
            id: resource.id,
            type: resource.type
        };
        if (vocabulary && vocabulary.name){
            return Resource.aggregate([
                {$match: {
                    dataset: dataset,
                    id: resource.id,
                    type: resource.type,
                    'vocabularies.id': { $in: [vocabulary.name] }
                }},

                {$unwind: '$vocabularies'},
                {$unwind: '$vocabularies.id'},

                {$match: {
                    'vocabularies.id': { $in: [vocabulary.name] }
                }},

                {$group: {
                    '_id': 0,
                    'vocabularies': { $push: '$vocabularies'}
                }}
            ]).exec();
        }
        logger.debug('Getting resource by resource');
        return yield Resource.findOne(query).exec();
    }

    static * create(dataset, pResource){
        logger.debug('Checking if resource doesnt exist');
        let resource = yield Resource.findOne({
            id: pResource.id,
            dataset: dataset,
            type: pResource.type
        }).exec();
        if(resource){
            return resource;
        }
        logger.debug('Creating resource');
        let nResource = new Resource({
            id: pResource.id,
            dataset: dataset,
            type: pResource.type
        });
        return nResource.save();
    }

    static * delete(dataset, pResource){
        logger.debug('Checking if resource doesnt exists');
        let query ={
            id: pResource.id,
            dataset: dataset,
            type: pResource.type
        };
        let resource = yield Resource.findOne(query).exec();
        if(!resource){
            logger.error('Error deleting resource');
            throw new ResourceNotFound(`Resource ${pResource.type} - ${resource.id} and dataset: ${dataset} doesn't exist`);
        }
        logger.debug('Deleting resource');
        yield Resource.remove(query).exec();
        return resource;
    }

    /* Updating vocabularies from Resources -> Just a superadmin can modify vocabularies */
    static * updateVocabulary(vocabulary){
        return true; // @TODO
    }

    /* Removing vocabularies from Resources -> Just a superadmin can delete vocabularies */
    static * deleteVocabulary(vocabulary){
        return true; // @TODO
    }

    static * getByIds(resource){
        logger.debug(`Getting resources with ids ${resource.ids}`);
        let query = {
            id: { $in: resource.ids },
            type: resource.type
        };
        logger.debug('Getting resources');
        return yield Resource.find(query).exec();
    }

    /*
    * @returns: hasPermission: <Boolean>
    */
    static * hasPermission(user, dataset, pResource){
        let permission = true;
        let resource;
        try{
            resource = yield ctRegisterMicroservice.requestToMicroservice({
                uri: '/' + pResource.type + '/' +pResource.id,
                method: 'GET',
                json: true
            });
        }
        catch(err){
            throw err;
        }
        resource = yield deserializer(resource);
        if(!resource){
            logger.error('Error getting resource from microservice');
            throw new ResourceNotFound(`REAL Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        let appPermission = resource.application.find(function(resourceApp){
            return user.extraUserData.apps.find(function(app){
                return app === resourceApp;
            });
        });
        if(!appPermission){
            permission = false;
        }
        if ((user.role === 'MANAGER') && (!resource.userId || resource.userId !== user.id)){
            permission = false;
        }
        return permission;
    }

}

module.exports = ResourceService;
