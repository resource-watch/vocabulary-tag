'use strict';

const logger = require('logger');
const config = require('config');
const Resource = require('models/resource');
const Vocabulary = require('models/vocabulary');
const VocabularyService = require('services/vocabularyService');
const ResourceService = require('services/resourceService');
const RelationshipDuplicated = require('errors/relationshipDuplicated');
const RelationshipNotFound = require('errors/relationshipNotFound');
const ResourceUpdateFailed = require('errors/resourceUpdateFailed');
const ResourceNotFound = require('errors/resourceNotFound');
const VocabularyNotFound = require('errors/vocabularyNotFound');

class RelationshipService {

    static checkRelationship(resource, vocabulary){
        return resource.vocabularies.find(function(elVocabulary){
            return vocabulary.id === elVocabulary.id;
        });
    }

    static * create(user, _vocabulary, dataset, _resource, body){
        logger.debug(`Checking entities`);
        let vocabulary = yield VocabularyService.getById(_vocabulary.name);
        if(!vocabulary){
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = yield VocabularyService.create(user, _vocabulary);
        }
        let resource = yield ResourceService.get(dataset, _resource);
        if(!resource){
            logger.debug(`This resource doesnt' exist, let's create it`);
            resource = yield ResourceService.create(dataset, _resource);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        let relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if(relationship){
            throw new RelationshipDuplicated(`This relationship already exists`);
        }
        try{
            logger.debug(`Relationship in vocabulary`);
            vocabulary.resources.push({
                id: resource.id,
                dataset: resource.dataset,
                type: resource.type,
                tags: body.tags
            });
            vocabulary.save();
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

    static * delete(user, _vocabulary, dataset, _resource, body){
        return true; //@TODO delete relationship
    }


    static * updateTagsFromRelationship(user, _vocabulary, dataset, _resource, body){
        logger.debug(`Checking entities`);
        let vocabulary = yield VocabularyService.getById(_vocabulary.name);
        if(!vocabulary){
            logger.debug(`This Vocabulary doesn't exist`);
            throw new VocabularyNotFound(``);
        }
        let resource = yield ResourceService.get(dataset, _resource);
        if(!resource){
            logger.debug(`This resource doesnt' exist`);
            throw new ResourceNotFound(``);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        let relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if(!relationship){
            throw new RelationshipNotFound(``);
        }
        let position;
        var vResources = vocabulary.resources.find(function(elResource, pos){
            position = pos;
            return (resource.type === elResource.type) && (resource.id === elResource.id) && (resource.dataset === elResource.dataset);
        });
        try{
            logger.debug(`Tags to vocabulary`);
            vocabulary.resources[position].tags = body.tags;
            vocabulary.save();
        }
        catch(err){
            throw err;
        }
        var rVocabulary = resource.vocabularies.find(function(elVocabulary, pos){
            position = pos;
            return vocabulary.id === elVocabulary.id;
        });
        logger.debug(`Tags to resource`);
        resource.vocabularies[position].tags = body.tags;
        return resource.save();
    }

}

module.exports = RelationshipService;
