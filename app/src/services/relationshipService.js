
const logger = require('logger');
const VocabularyService = require('services/vocabularyService');
const ResourceService = require('services/resourceService');
// const GraphService = require('services/graphService');
const RelationshipDuplicated = require('errors/relationshipDuplicated');
const RelationshipNotFound = require('errors/relationshipNotFound');
const ResourceNotFound = require('errors/resourceNotFound');
const VocabularyNotFound = require('errors/vocabularyNotFound');

class RelationshipService {

    static checkRelationship(resource, vocabulary) {
        return resource.vocabularies.find(function (elVocabulary) {
            return vocabulary.id === elVocabulary.id;
        });
    }

    static * create(user, pVocabulary, dataset, pResource, body) {
        logger.debug(`Checking entities`);
        let vocabulary = yield VocabularyService.getById(pVocabulary);
        if (!vocabulary) {
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = yield VocabularyService.create(user, pVocabulary);
        }
        let resource = yield ResourceService.get(dataset, pResource);
        if (!resource) {
            logger.debug(`This resource doesnt' exist, let's create it`);
            resource = yield ResourceService.create(dataset, pResource);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        const relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if (relationship) {
            throw new RelationshipDuplicated(`This relationship already exists`);
        }
        body.tags = Array.from(new Set(body.tags));
        try {
            logger.debug(`Relationship in vocabulary`);
            vocabulary.resources.push({
                id: resource.id,
                dataset: resource.dataset,
                type: resource.type,
                tags: body.tags
            });
            vocabulary.save();
        } catch (err) {
            throw err;
        }
        logger.debug(`Relationship in resource`);
        resource.vocabularies.push({
            id: vocabulary.id,
            tags: body.tags
        });
        // CREATE GRAPH ASSOCIATION
        logger.info('Creating graph association');
        // yield GraphService.associateTags(resource, body.tags);
        return yield resource.save();
    }

    static * createSome(user, vocabularies, dataset, pResource) {
        for (let i = 0; i < vocabularies.length; i++) {
            yield RelationshipService.create(user, vocabularies[i], dataset, pResource, vocabularies[i]);
        }
        return yield ResourceService.get(dataset, pResource);
    }

    static * delete(user, pVocabulary, dataset, pResource) {
        logger.debug(`Checking entities`);
        const vocabulary = yield VocabularyService.getById(pVocabulary);
        if (!vocabulary) {
            logger.debug(`This Vocabulary doesn't exist`);
            throw new VocabularyNotFound(`Vocabulary with name ${pVocabulary.name} doesn't exist`);
        }
        let resource = yield ResourceService.get(dataset, pResource);
        if (!resource) {
            logger.debug(`This resource doesnt' exist`);
            throw new ResourceNotFound(`Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        const relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if (!relationship) {
            throw new RelationshipNotFound(`Relationship between ${vocabulary.id} and ${resource.type} - ${resource.id} and dataset: ${dataset} doesn't exist`);
        }
        let position;
        const vResources = vocabulary.resources.find(function (elResource, pos) {
            position = pos;
            return (resource.type === elResource.type) && (resource.id === elResource.id) && (resource.dataset === elResource.dataset);
        });
        try {
            logger.debug(`Deleting from vocabulary`);
            vocabulary.resources.splice(position, 1);
            vocabulary.save();
        } catch (err) {
            throw err;
        }
        const rVocabulary = resource.vocabularies.find(function (elVocabulary, pos) {
            position = pos;
            return vocabulary.id === elVocabulary.id;
        });
        logger.debug(`Deleting from resource`);
        resource.vocabularies.splice(position, 1);
        resource = yield resource.save();
        if (resource.vocabularies.length === 0) {
            logger.debug(`Deleting the resource cause it doesnt have any vocabulary`);
            yield ResourceService.delete(resource.dataset, resource);
        }
        return resource;
    }

    static * deleteSome(user, vocabularies, dataset, pResource) {
        for (let i = 0; i < vocabularies.length; i++) {
            yield RelationshipService.delete(user, vocabularies[i], dataset, pResource);
        }
        return yield ResourceService.get(dataset, pResource);
    }

    static * deleteAll(user, dataset, pResource) {
        const resource = yield ResourceService.get(dataset, pResource);
        if (!resource || !resource.vocabularies || resource.vocabularies.length === 0) {
            logger.debug(`This resource doesn't have Relationships`);
            throw new RelationshipNotFound(`This resource doesn't have Relationships`);
        }
        const vocabularies = resource.vocabularies.map(function (vocabulary) {
            return {
                name: vocabulary.id
            };
        });
        for (let i = 0; i < vocabularies.length; i++) {
            yield RelationshipService.delete(user, vocabularies[i], dataset, pResource);
        }
        return yield ResourceService.get(dataset, pResource);
    }

    static * updateTagsFromRelationship(user, pVocabulary, dataset, pResource, body) {
        logger.debug(`Checking entities`);
        const vocabulary = yield VocabularyService.getById(pVocabulary);
        if (!vocabulary) {
            logger.debug(`This Vocabulary doesn't exist`);
            throw new VocabularyNotFound(`Vocabulary with name ${pVocabulary.name} doesn't exist`);
        }
        const resource = yield ResourceService.get(dataset, pResource);
        if (!resource) {
            logger.debug(`This resource doesnt' exist`);
            throw new ResourceNotFound(`Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        const relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if (!relationship) {
            throw new RelationshipNotFound(`Relationship between ${vocabulary.id} and ${resource.type} - ${resource.id} and dataset: ${dataset} doesn't exist`);
        }
        let position;
        var vResources = vocabulary.resources.find(function (elResource, pos) {
            position = pos;
            return (resource.type === elResource.type) && (resource.id === elResource.id) && (resource.dataset === elResource.dataset);
        });
        try {
            logger.debug(`Tags to vocabulary`);
            vocabulary.resources[position].tags = body.tags;
            vocabulary.save();
        } catch (err) {
            throw err;
        }
        var rVocabulary = resource.vocabularies.find(function (elVocabulary, pos) {
            position = pos;
            return vocabulary.id === elVocabulary.id;
        });
        logger.debug(`Tags to resource`);
        resource.vocabularies[position].tags = body.tags;
        // CREATE GRAPH ASSOCIATION
        logger.info('Creating graph association');
        // yield GraphService.associateTags(resource, body.tags);
        return resource.save();
    }

    static * concatTags(user, pVocabulary, dataset, pResource, body) {
        logger.debug(`Checking entities`);
        let vocabulary = yield VocabularyService.getById(pVocabulary);
        if (!vocabulary) {
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = yield VocabularyService.create(user, pVocabulary);
        }
        let resource = yield ResourceService.get(dataset, pResource);
        if (!resource) {
            logger.debug(`This resource doesnt' exist, let's create it`);
            resource = yield ResourceService.create(dataset, pResource);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        const relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if (!relationship) {
            return yield RelationshipService.create(user, pVocabulary, dataset, pResource, body);
        }
        try {
            body.tags.forEach(function (el) {
                if (relationship.tags.indexOf(el) < 0) {
                    relationship.tags.push(el);
                }
            });
            return yield RelationshipService.updateTagsFromRelationship(user, pVocabulary, dataset, pResource, relationship);
        } catch (err) {
            throw err;
        }
    }

    static * cloneVocabularyTags(user, dataset, pResource, body) {
        logger.debug(`Checking entities`);
        let resource = yield ResourceService.get(dataset, pResource);
        if (!resource) {
            throw new ResourceNotFound(`Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        const vocabularies = resource.toObject().vocabularies;
        vocabularies.map(vocabulary => {
            vocabulary.name = vocabulary.id;
            delete vocabulary.id;
            return vocabulary;
        });
        // vocabularies.unshift({});
        // vocabularies = vocabularies.reduce((acc, next) => {
        //     acc[next.id] = {
        //         tags: next.tags
        //     };
        //     return acc;
        // });
        logger.debug('New Vocabularies', vocabularies);
        try {
            return yield RelationshipService.createSome(user, vocabularies, body.newDataset, { type: 'dataset', id: body.newDataset });
        } catch (err) {
            throw err;
        }
    }

}

module.exports = RelationshipService;
