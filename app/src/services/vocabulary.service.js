const logger = require('logger');
const Vocabulary = require('models/vocabulary.model');
const VocabularyDuplicated = require('errors/vocabulary-duplicated.error');

class VocabularyService {

    static getQuery(query) {
        Object.keys(query).forEach((key) => {
            if (key === 'loggedUser' || key === 'app' || key === 'application' || query[key] === '' || query[key] === null || query[key] === undefined) {
                delete query[key];
            }
        });
        return query;
    }

    static async get(resource, pQuery) {
        logger.debug(`Getting resources by vocabulary-tag`);
        const application = pQuery.application || pQuery.app;
        const query = VocabularyService.getQuery(pQuery);
        let vocabularies = Object.keys(query).map(vocabularyName => Vocabulary.aggregate([
            {
                $match: {
                    id: vocabularyName,
                    application: application || { $ne: null },
                    'resources.type': resource.type,
                    'resources.tags': { $in: query[vocabularyName].split(',').map(elem => elem.trim()) }
                }
            },

            { $unwind: '$resources' },
            { $unwind: '$resources.tags' },

            {
                $match: {
                    'resources.type': resource.type,
                    'resources.tags': { $in: query[vocabularyName].split(',').map(elem => elem.trim()) }
                }
            },

            {
                $group: {
                    _id: 0,
                    resources: { $push: '$resources' }
                }
            }
        ]).exec());
        vocabularies = (await Promise.all(vocabularies)); // [array of promises]
        if (!vocabularies || vocabularies.length === 0 || vocabularies[0].length === 0) {
            return null;
        }
        // just one vocabulary mathching? force to at least 2 arrays
        const validVocabularies = [];
        vocabularies.forEach((vocabulary) => {
            if (vocabulary.length !== 0) {
                validVocabularies.push(vocabulary);
            }
        });
        vocabularies = validVocabularies;
        if (vocabularies.length === 1) {
            vocabularies.push(vocabularies[0]);
        }

        vocabularies = vocabularies.reduce((c, d) => c.concat(d).reduce((a, b) => {
            // Unique a.resources
            const aUniqueResources = [];
            a.resources.forEach((nextResource) => {
                const alreadyIn = aUniqueResources.find(currentResource => (nextResource.type === currentResource.type)
                    && (nextResource.id === currentResource.id)
                    && (nextResource.dataset === currentResource.dataset));
                if (!alreadyIn) {
                    aUniqueResources.push(nextResource);
                }
            });
            a.resources = aUniqueResources;
            // B in a unique resources
            b.resources.forEach((nextResource) => {
                const alreadyIn = a.resources.find(currentResource => (nextResource.type === currentResource.type)
                    && (nextResource.id === currentResource.id)
                    && (nextResource.dataset === currentResource.dataset));
                if (!alreadyIn) {
                    a.resources.push(nextResource);
                }
            });
            return a;
        }));
        // deleting tags from resource
        vocabularies.resources = vocabularies.resources.map((res) => {
            delete res.tags;
            return res;
        });
        const limit = (Number.isNaN(parseInt(query.limit, 10))) ? 0 : parseInt(query.limit, 10);
        if (limit > 0) {
            return vocabularies.slice(0, limit - 1);
        }
        return vocabularies;
    }

    static async create(user, pVocabulary) {
        logger.debug('Checking if vocabulary already exists');
        let vocabulary = await Vocabulary.findOne({
            id: pVocabulary.name,
            application: pVocabulary.application
        }).exec();
        if (vocabulary) {
            logger.error('Error creating vocabulary');
            throw new VocabularyDuplicated(`Vocabulary of with name: ${pVocabulary.name}: already exists and ${pVocabulary.application}`);
        }
        logger.debug('Creating vocabulary');
        vocabulary = new Vocabulary({
            id: pVocabulary.name,
            application: pVocabulary.application
        });
        return vocabulary.save();
    }

    // static async update(pVocabulary) {
    //     logger.debug('Checking if vocabulary doesnt exist');
    //     const vocabulary = await Vocabulary.findOne({
    //         id: pVocabulary.name,
    //         application: pVocabulary.application
    //     }).exec();
    //     if (!vocabulary) {
    //         logger.error('Error updating vocabulary');
    //         throw new VocabularyNotFound(`Vocabulary with name: ${pVocabulary.name} doesn't exist and ${pVocabulary.application}`);
    //     }
    //     vocabulary.name = pVocabulary.name ? pVocabulary.name : vocabulary.name;
    //     vocabulary.application = pVocabulary.application ? pVocabulary.application : vocabulary.application;
    //     vocabulary.updatedAt = new Date();
    //     logger.debug('Updating resources');
    //     try {
    //         await ResourceService.updateVocabulary(vocabulary);
    //     } catch (err) {
    //         if (err instanceof ResourceUpdateFailed) {
    //             throw new ConsistencyViolation(`Consistency Violation: References cannot be updated`);
    //         }
    //     }
    //     logger.debug('Updating vocabulary');
    //     return vocabulary.save();
    // }
    //
    // static async delete(pVocabulary) {
    //     logger.debug('Checking if vocabulary doesnt exists');
    //     const query = {
    //         id: pVocabulary.name,
    //         application: pVocabulary.application
    //     };
    //     const vocabulary = await Vocabulary.findOne(query).exec();
    //     if (!vocabulary) {
    //         logger.error('Error deleting vocabulary');
    //         throw new VocabularyNotFound(`Vocabulary with name: ${pVocabulary.name} doesn't exist and ${pVocabulary.application}`);
    //     }
    //     logger.debug('Updating resources');
    //     try {
    //         await ResourceService.deleteVocabulary(vocabulary);
    //     } catch (err) {
    //         if (err instanceof ResourceUpdateFailed) {
    //             throw new ConsistencyViolation(`Consistency Violation: References cannot be deleted`);
    //         }
    //     }
    //     logger.debug('Deleting vocabulary');
    //     await Vocabulary.deleteMany(query).exec();
    //     return vocabulary;
    // }

    static async getAll(filter) {
        const limit = (Number.isNaN(parseInt(filter.limit, 10))) ? 0 : parseInt(filter.limit, 10);
        logger.debug('Getting vocabularies');
        const vocabularies = await Vocabulary.find({}).limit(limit).exec();
        return vocabularies;
    }

    static async getById(pVocabulary) {
        logger.debug(`Getting vocabulary with id ${pVocabulary.name} and application ${pVocabulary.application}`);
        const query = {
            id: pVocabulary.name,
            application: pVocabulary.application ? pVocabulary.application : { $ne: null }
        };
        logger.debug('Getting vocabulary');
        const vocabulary = await Vocabulary.find(query).exec();
        if (vocabulary.length === 1) {
            return vocabulary[0];
        }
        return vocabulary;
    }

    /*
    * @returns: hasPermission: <Boolean>
    */
    static hasPermission() {
        return true;
    }

}

module.exports = VocabularyService;
