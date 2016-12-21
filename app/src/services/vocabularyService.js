'use strict';

const logger = require('logger');
const config = require('config');
const Vocabulary = require('models/vocabulary');
const Resource = require('models/resource');
const VocabularyNotFound = require('errors/vocabularyNotFound');
const VocabularyDuplicated = require('errors/vocabularyDuplicated');

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
        logger.debug('Updating vocabulary');
        vocabulary.name = body.name ? body.name:vocabulary.name;
        vocabulary.updatedAt = new Date();
        return vocabulary.save();
        // @TODO Update all resources with this vocabulary
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
        logger.debug('Deleting vocabulary');
        yield Vocabulary.remove(query).exec();
        // @TODO Update all resources with this vocabulary
        return vocabulary;
    }

    static * createAssociation(){
        return true;
    }

    static * addTagsToAssociation(){
        return true;
    }

    static * removeTagsFromAssociation(){
        return true;
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

    static * getByIds(body){
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
