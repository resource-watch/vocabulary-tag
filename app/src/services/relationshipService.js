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

    static * create(user, pVocabulary, dataset, pResource, body){
        logger.debug(`Checking entities`);
        let vocabulary = yield VocabularyService.getById(pVocabulary);
        if(!vocabulary){
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = yield VocabularyService.create(user, pVocabulary);
        }
        let resource = yield ResourceService.get(dataset, pResource);
        if(!resource){
            logger.debug(`This resource doesnt' exist, let's create it`);
            resource = yield ResourceService.create(dataset, pResource);
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
        logger.debug(`Relationship in resource`);
        resource.vocabularies.push({
            id: vocabulary.id,
            tags: body.tags
        });
        return resource.save();
    }

    static * createSome(user, vocabularies, dataset, pResource){
        return yield vocabularies.map(function(vocabulary){
            return RelationshipService.create(user, vocabulary, dataset, pResource, vocabulary);
        });
    }

    static * delete(user, pVocabulary, dataset, pResource){
        logger.debug(`Checking entities`);
        let vocabulary = yield VocabularyService.getById(pVocabulary);
        if(!vocabulary){
            logger.debug(`This Vocabulary doesn't exist`);
            throw new VocabularyNotFound(`Vocabulary with name ${pVocabulary.name} doesn't exist`);
        }
        let resource = yield ResourceService.get(dataset, pResource);
        if(!resource){
            logger.debug(`This resource doesnt' exist`);
            throw new ResourceNotFound(`Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        let relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if(!relationship){
            throw new RelationshipNotFound(`Relationship between ${vocabulary.id} and ${resource.type} - ${resource.id} and dataset: ${dataset} doesn't exist`);
        }
        let position;
        var vResources = vocabulary.resources.find(function(elResource, pos){
            position = pos;
            return (resource.type === elResource.type) && (resource.id === elResource.id) && (resource.dataset === elResource.dataset);
        });
        try{
            logger.debug(`Deleting from vocabulary`);
            vocabulary.resources.splice(position, 1);
            vocabulary.save();
        }
        catch(err){
            throw err;
        }
        var rVocabulary = resource.vocabularies.find(function(elVocabulary, pos){
            position = pos;
            return vocabulary.id === elVocabulary.id;
        });
        logger.debug(`Deleting from resource`);
        resource.vocabularies.splice(position, 1);
        resource = yield resource.save();
        if(resource.vocabularies.length === 0){
            logger.debug(`Deleting the resource cause it doesnt have any vocabulary`);
            yield ResourceService.delete(resource.dataset, resource);
        }
        return resource;
    }


    static * updateTagsFromRelationship(user, pVocabulary, dataset, pResource, body){
        logger.debug(`Checking entities`);
        let vocabulary = yield VocabularyService.getById(pVocabulary);
        if(!vocabulary){
            logger.debug(`This Vocabulary doesn't exist`);
            throw new VocabularyNotFound(`Vocabulary with name ${pVocabulary.name} doesn't exist`);
        }
        let resource = yield ResourceService.get(dataset, pResource);
        if(!resource){
            logger.debug(`This resource doesnt' exist`);
            throw new ResourceNotFound(`Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        let relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if(!relationship){
            throw new RelationshipNotFound(`Relationship between ${vocabulary.id} and ${resource.type} - ${resource.id} and dataset: ${dataset} doesn't exist`);
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
