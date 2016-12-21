'use strict';

const logger = require('logger');
const config = require('config');
const Vocabulary = require('models/vocabulary');
const VocabularyNotFound = require('errors/vocabularyNotFound');
const VocabularyDuplicated = require('errors/vocabularyDuplicated');
const ResourceUpdateFailed = require('errors/resourceUpdateFailed');
const ConsistencyViolation = require('errors/consistencyViolation');
var ResourceService = require('services/resourceService');

class VocabularyService {

    static * get(resource, _query){
        logger.debug(`Getting resources by vocabulary-tag`);
        let vocabularies = [];
        let query = {
            'resource.type': resource.type,
        };
        logger.debug('Getting resources');
        Object.keys(_query).forEach(function*(vocabularyName){
            query.id = vocabularyName;
            query.tags = { $in: _query[vocabularyName].split(',').map(function(elem){return elem.trim();}) };
            let vocabulary = yield Vocabulary.find(query).exec();
            vocabularies.push(vocabulary);
        });
        let limit = (isNaN(parseInt(query.limit))) ? 0:parseInt(query.limit);
        if(limit > 0){
            return vocabularies.slice(0, limit-1);
        }
        else{
            return vocabularies;
        }
    }

    static * create(user, body){
        logger.debug('Checking if vocabulary already exists');
        let _vocabulary = yield Vocabulary.findOne({
            id: body.name
        }).exec();
        if(_vocabulary){
            logger.error('Error creating vocabulary');
            throw new VocabularyDuplicated(`Vocabulary of with name: ${body.name}: already exists`);
        }
        logger.debug('Creating vocabulary');
        let vocabulary = new Vocabulary({
            id: body.name,
        });
        return vocabulary.save();
    }

    static * update(body){
        logger.debug('Checking if vocabulary doesnt exists');
        let vocabulary = yield Vocabulary.findOne({
            id: body.name
        }).exec();
        if(!vocabulary){
            logger.error('Error updating vocabulary');
            throw new VocabularyNotFound(`Vocabulary with name: ${body.name} doesn't exist`);
        }
        vocabulary.name = body.name ? body.name:vocabulary.name;
        vocabulary.updatedAt = new Date();
        logger.debug('Updating resources'); // first update Resource References to ensure consistency
        try{
            let resource = yield ResourceService.updateVocabulary(vocabulary);
        }
        catch(err){
            if(err instanceof ResourceUpdateFailed){
                throw new ConsistencyViolation(`Consistency Violation: References cannot be updated`);
            }
        }
        logger.debug('Updating vocabulary');
        return vocabulary.save();
    }

    static * delete(body){
        logger.debug('Checking if vocabulary doesnt exists');
        let query = {
            id: body.name
        };
        let vocabulary = yield Vocabulary.findOne(query).exec();
        if(!vocabulary){
            logger.error('Error deleting vocabulary');
            throw new VocabularyNotFound(`Vocabulary with name: ${body.name} doesn't exist`);
        }
        logger.debug('Updating resources'); // first delete Resource References to ensure consistency
        try{
            let resource = yield ResourceService.deleteVocabulary(vocabulary);
        }
        catch(err){
            if(err instanceof ResourceUpdateFailed){
                throw new ConsistencyViolation(`Consistency Violation: References cannot be deleted`);
            }
        }
        logger.debug('Deleting vocabulary');
        yield Vocabulary.remove(query).exec();
        return vocabulary;
    }

    static * getAll(filter){
        logger.debug(`Getting vocabularies with limit: ${filter.limit}`);
        let limit = (isNaN(parseInt(filter.limit))) ? 0:parseInt(filter.limit);
        logger.debug('Getting vocabularies');
        return yield Vocabulary.find({}).limit(limit).exec();
    }

    static * getById(body){
        logger.debug(`Getting vocabulary with id ${body.id}`);
        let query = {
            id: body.name
        };
        logger.debug('Getting vocabulary');
        return yield Vocabulary.findOne(query).exec();
    }

    static * createAssociation(vocabulary, resource, body){
        logger.debug(`Association in vocabulary`);
        vocabulary.resources.push({
            id: resource.id,
            dataset: resource.dataset,
            type: resource.type,
            tags: body.tags
        });
        return vocabulary.save();
    }

    static * addTagsToAssociation(vocabulary, resource, body){
        return true;
    }

    static * deleteTagsFromAssociation(vocabulary, resource, body){
        return true;
    }

    /*
    * @returns: hasPermission: <Boolean>
    */
    static * hasPermission(user, dataset, resource, body){
        return true;
    }

}

module.exports = VocabularyService;
