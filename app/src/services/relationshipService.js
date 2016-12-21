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

    static * addTagsToRelationship(_vocabulary, dataset, _resource, body){
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
        // @TODO HERE what returns checkRelationship???? we ahve to update dat!

    }

    static * removeTagsFromRelationship(){
        return true;
    }


}

module.exports = RelationshipService;
