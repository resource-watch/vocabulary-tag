'use strict';

const logger = require('logger');
const config = require('config');
const Vocabulary = require('models/vocabulary');
const Resource = require('models/resource');
const VocabularyNotFound = require('errors/vocabularyNotFound');
const VocabularyDuplicated = require('errors/vocabularyDuplicated');

class VocabularyService {

    static * getByResource(dataset, resource){
        let query = {
            dataset: dataset,
            'resource.id': resource.id,
            'resource.type': resource.type
        };
        logger.debug('Getting vocabularies by resource');
        return yield Resource.find(query, 'vocabularies').exec();
    }

    static * get(user, dataset, resource, body){
        return true;
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

    static * getAll(body){
        return true;
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
