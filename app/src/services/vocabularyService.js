'use strict';

const logger = require('logger');
const config = require('config');
const Vocabulary = require('models/vocabulary');
const ResourceService = require('services/resourceService');
const VocabularyNotFound = require('errors/vocabularyNotFound');
const VocabularyDuplicated = require('errors/vocabularyDuplicated');
const ResourceUpdateFailed = require('errors/resourceUpdateFailed');
const ConsistencyViolation = require('errors/consistencyViolation');

class VocabularyService {

    static getQuery(query){
        Object.keys(query).forEach(function(key){
            if(key === 'loggedUser' || query[key] === '' || query[key] === null || query[key] === undefined){
                delete query[key];
            }
        });
        return query;
    }

    static * get(resource, pQuery){
        logger.debug(`Getting resources by vocabulary-tag`);
        let query = VocabularyService.getQuery(pQuery);
        let vocabularies = yield Object.keys(query).map(function(vocabularyName){
            return Vocabulary.aggregate([
                {$match: {
                    id: vocabularyName,
                    'resources.type': resource.type,
                    'resources.tags': { $in: query[vocabularyName].split(',').map(function(elem){return elem.trim();}) }
                }},

                {$unwind: '$resources'},
                {$unwind: '$resources.tags'},

                {$match: {
                    'resources.type': resource.type,
                    'resources.tags': { $in: query[vocabularyName].split(',').map(function(elem){return elem.trim();}) }
                }},

                {$group: {
                    '_id': 0,
                    'resources': { $push: '$resources'}
                }}
            ]).exec();
        });
        if(vocabularies && vocabularies.length > 0){
            // just one vocabulary mathching? force to at least 2 arrays
            let validVocabularies = [];
            vocabularies.forEach(function(vocabulary){
                if(vocabulary.length !== 0){
                    validVocabularies.push(vocabulary);
                }
            });
            vocabularies = validVocabularies;
            if(vocabularies.length === 1){
                vocabularies.push(vocabularies[0]);
            }
            vocabularies = vocabularies.reduce(function(a,b){
                return a.concat(b).reduce(function(a,b){
                    // Unique a.resources
                    let aUniqueResources = [];
                    a.resources.forEach(function(nextResource){
                        let alreadyIn = aUniqueResources.find(function(currentResource){
                            return (nextResource.type === currentResource.type) && (nextResource.id === currentResource.id) && (nextResource.dataset === currentResource.dataset);
                        });
                        if(!alreadyIn){
                            aUniqueResources.push(nextResource);
                        }
                    });
                    a.resources = aUniqueResources;
                    // B in a unique resorces
                    b.resources.forEach(function(nextResource){
                        let alreadyIn = a.resources.find(function(currentResource){
                            return (nextResource.type === currentResource.type) && (nextResource.id === currentResource.id) && (nextResource.dataset === currentResource.dataset);
                        });
                        if(!alreadyIn){
                            a.resources.push(nextResource);
                        }
                    });
                    return a;
                });
            });
        }
        // deleting tags from resource
        vocabularies.resources = vocabularies.resources.map(function(resource){
            delete resource.tags;
            return resource;
        });
        let limit = (isNaN(parseInt(query.limit))) ? 0:parseInt(query.limit);
        if(limit > 0){
            return vocabularies.slice(0, limit-1);
        }
        else{
            return vocabularies;
        }
    }

    static * create(user, pVocabulary){
        logger.debug('Checking if vocabulary already exists');
        let vocabulary = yield Vocabulary.findOne({
            id: pVocabulary.name
        }).exec();
        if(vocabulary){
            logger.error('Error creating vocabulary');
            throw new VocabularyDuplicated(`Vocabulary of with name: ${pVocabulary.name}: already exists`);
        }
        logger.debug('Creating vocabulary');
        vocabulary = new Vocabulary({
            id: pVocabulary.name,
        });
        return vocabulary.save();
    }

    static * update(pVocabulary){
        logger.debug('Checking if vocabulary doesnt exist');
        let vocabulary = yield Vocabulary.findOne({
            id: pVocabulary.name
        }).exec();
        if(!vocabulary){
            logger.error('Error updating vocabulary');
            throw new VocabularyNotFound(`Vocabulary with name: ${pVocabulary.name} doesn't exist`);
        }
        vocabulary.name = pVocabulary.name ? pVocabulary.name:vocabulary.name;
        vocabulary.updatedAt = new Date();
        logger.debug('Updating resources');
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

    static * delete(pVocabulary){
        logger.debug('Checking if vocabulary doesnt exists');
        let query = {
            id: pVocabulary.name
        };
        let vocabulary = yield Vocabulary.findOne(query).exec();
        if(!vocabulary){
            logger.error('Error deleting vocabulary');
            throw new VocabularyNotFound(`Vocabulary with name: ${pVocabulary.name} doesn't exist`);
        }
        logger.debug('Updating resources');
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
        let limit = (isNaN(parseInt(filter.limit))) ? 0:parseInt(filter.limit);
        logger.debug('Getting vocabularies');
        return yield Vocabulary.find({}).limit(limit).exec();
    }

    static * getById(vocabulary){
        logger.debug(`Getting vocabulary with id ${vocabulary.name}`);
        let query = {
            id: vocabulary.name
        };
        logger.debug('Getting vocabulary');
        return yield Vocabulary.findOne(query).exec();
    }

    /*
    * @returns: hasPermission: <Boolean>
    */
    static * hasPermission(user, vocabulary){
        return true;
    }

}

module.exports = VocabularyService;
