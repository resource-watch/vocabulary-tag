'use strict';

const logger = require('logger');
const config = require('config');
const Resource = require('models/resource');
const ResourceUpdateFailed = require('errors/resourceUpdateFailed');
const ResourceNotFound = require('errors/resourceNotFound');
const VocabularyNotFound = require('errors/vocabularyNotFound');

class ResourceService {

    static * get(dataset, resource, vocabulary){
        let query = {
            dataset: dataset,
            id: resource.id,
            type: resource.type
        };
        if (vocabulary){
            return Resource.aggregate([
                {$match: {
                    dataset: dataset,
                    id: resource.id,
                    type: resource.type,
                    'vocabularies.id': vocabulary,
                }},

                {$unwind: '$vocabularies'},
                {$unwind: '$vocabularies.id'},

                {$match: {
                    'vocabularies.id': vocabulary
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

    static * create(dataset, _resource){
        logger.debug('Checking if resource doesnt exist');
        let resource = yield Resource.findOne({
            id: _resource.id,
            dataset: dataset,
            type: _resource.type
        }).exec();
        if(resource){
            return resource;
        }
        logger.debug('Creating resource');
        let nResource = new Resource({
            id: _resource.id,
            dataset: dataset,
            type: _resource.type
        });
        return nResource.save();
    }

    static * delete(dataset, _resource){
        logger.debug('Checking if resource doesnt exists');
        let query ={
            id: _resource.id,
            dataset: dataset,
            type: _resource.type
        };
        let resource = yield Resource.findOne(query).exec();
        if(!resource){
            logger.error('Error deleting resource');
            throw new ResourceNotFound(`Resource ${_resource.tpye} - ${resource.id} and dataset: ${dataset} doesn't exist`);
        }
        logger.debug('Deleting resource');
        yield Resource.remove(query).exec();
        return resource;
    }

    /* Updating vocabularies from Resources */
    static * updateVocabulary(vocabulary){
        return true; // @TODO but not yet
    }

    /* Removing vocabularies from Resources */
    static * deleteVocabulary(vocabulary){
        return true; // @TODO but not yet
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
    static * hasPermission(){
        return true;
    }

}

module.exports = ResourceService;
