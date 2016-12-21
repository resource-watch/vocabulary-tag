'use strict';

const logger = require('logger');
const config = require('config');
const Resource = require('models/resource');
const ResourceUpdateFailed = require('errors/resourceUpdateFailed');
const AssociationDuplicated = require('errors/AssociationDuplicated');
const ResourceNotFound = require('errors/ResourceNotFound');
var VocabularyService = require('services/vocabularyService');

class ResourceService {

    static * get(dataset, resource){
        let query = {
            dataset: dataset,
            id: resource.id,
            type: resource.type
        };
        logger.debug('Getting resource by resource');
        return yield Resource.findOne(query).exec();
    }

    static * create(){
        return true;
    }

    /* Delete a resource */
    static * delete(){
        return true; // @TODO but not yet
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

    static * createAssociation(user, _vocabulary, dataset, _resource, body){
        logger.debug(`Checking entities`);
        let vocabulary = yield VocabularyService.getById(_vocabulary);
        if(!vocabulary){
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = yield VocabularyService.create(user, _vocabulary);
        }
        let resource = yield ResourceService.get(dataset, _resource);
        if(!resource){
            logger.debug(`This resource doesnt' exist, let's create it`);
            resource = yield ResourceService.create(dataset, _resource);
        }
        logger.debug(`Checking if association doesn't exist yet`);
        let association = resource.vocabularies.find(function(elVocabulary){
            return vocabulary.id === elVocabulary.id;
        });
        if(association){
            throw new AssociationDuplicated(`This association already exists`);
        }
        try{
            yield VocabularyService.createAssociation(vocabulary, resource, body);
        }
        catch(err){
            throw err;
        }
        resource.vocabularies.push({
            id: vocabulary.id,
            tags: body.tags
        });
        return resource.save();
    }

    static * addTagsToAssociation(){
        return true;
    }

    static * removeTagsFromAssociation(){
        return true;
    }

    /*
    * @returns: hasPermission: <Boolean>
    */
    static * hasPermission(){
        return true;
    }

}

module.exports = ResourceService;
