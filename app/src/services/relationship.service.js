const logger = require('logger');
const VocabularyService = require('services/vocabulary.service');
const ResourceService = require('services/resource.service');
const GraphService = require('services/graph.service');
const RelationshipDuplicated = require('errors/relationship-duplicated.error');
const RelationshipNotFound = require('errors/relationship-not-found.error');
const ResourceNotFound = require('errors/resource-not-found.error');
const VocabularyNotFound = require('errors/vocabulary-not-found.error');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const MicroserviceConnection = require('errors/microservice-connection.error');

class RelationshipService {

    static checkRelationship(resource, vocabulary) {
        return resource.vocabularies.find((elVocabulary) => (vocabulary.id === elVocabulary.id) && (vocabulary.application === elVocabulary.application));
    }

    static async create(pVocabulary, dataset, pResource, body, apiKey) {
        logger.debug(`Checking entities`);
        let vocabulary = await VocabularyService.getById(pVocabulary);
        if (!vocabulary || vocabulary.length === 0) {
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = await VocabularyService.create(pVocabulary);
        }
        let resource = await ResourceService.get(dataset, pResource);
        if (!resource) {
            logger.debug(`This resource doesnt' exist, let's create it`);
            resource = await ResourceService.create(dataset, pResource);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        const relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if (relationship) {
            throw new RelationshipDuplicated(`This relationship already exists`);
        }
        body.tags = Array.from(new Set(body.tags));
        logger.debug(`Relationship in vocabulary`);
        vocabulary.resources.push({
            id: resource.id,
            dataset: resource.dataset,
            type: resource.type,
            tags: body.tags
        });
        vocabulary.save();
        logger.debug(`Relationship in resource`);
        resource.vocabularies.push({
            id: vocabulary.id,
            application: vocabulary.application,
            tags: body.tags
        });
        resource = await resource.save();
        // CREATE GRAPH ASSOCIATION
        if (vocabulary.id === 'knowledge_graph') {
            logger.info('Creating graph association');
            await GraphService.createAssociation(resource, body.tags, pVocabulary.application, apiKey);
        }
        return resource;
    }

    static async createSome(vocabularies, dataset, pResource, apiKey) {
        for (let i = 0; i < vocabularies.length; i++) {
            await RelationshipService.create(vocabularies[i], dataset, pResource, vocabularies[i], apiKey);
        }
        return ResourceService.get(dataset, pResource);
    }

    static async delete(pVocabulary, dataset, pResource, apiKey) {
        logger.debug(`Checking entities`);
        const vocabulary = await VocabularyService.getById(pVocabulary);
        if (!vocabulary) {
            logger.debug(`This Vocabulary doesn't exist`);
            throw new VocabularyNotFound(`Vocabulary with name ${pVocabulary.name} doesn't exist`);
        }
        let resource = await ResourceService.get(dataset, pResource);
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
        logger.debug(`Deleting from vocabulary`);
        vocabulary.resources.splice(position, 1);
        vocabulary.save();
        logger.debug(`Deleting from resource`);
        resource.vocabularies.splice(position, 1);
        resource = await resource.save();
        if (resource.vocabularies.length === 0) {
            logger.debug(`Deleting the resource cause it doesnt have any vocabulary`);
            await ResourceService.delete(resource.dataset, resource);
        }
        // DELETE GRAPH ASSOCIATION
        if (vocabulary.id === 'knowledge_graph') {
            logger.info('Deleting graph association');
            await GraphService.deleteAssociation(resource, pVocabulary.application, apiKey);
        }
        return resource;
    }

    static async deleteAll(dataset, pResource, apiKey) {
        const resource = await ResourceService.get(dataset, pResource);
        if (!resource || !resource.vocabularies || resource.vocabularies.length === 0) {
            logger.debug(`This resource doesn't have Relationships`);
            throw new RelationshipNotFound(`This resource doesn't have Relationships`);
        }
        const vocabularies = resource.vocabularies.map((vocabulary) => ({
            name: vocabulary.id
        }));
        for (let i = 0; i < vocabularies.length; i++) {
            await RelationshipService.delete(vocabularies[i], dataset, pResource, apiKey);
        }
        return resource;
    }

    static async updateTagsFromRelationship(pVocabulary, dataset, pResource, body, apiKey) {
        logger.debug(`Checking entities`);
        const vocabulary = await VocabularyService.getById(pVocabulary);
        if (!vocabulary) {
            logger.debug(`This Vocabulary doesn't exist`);
            throw new VocabularyNotFound(`Vocabulary with name ${pVocabulary.name} doesn't exist`);
        }
        let resource = await ResourceService.get(dataset, pResource);
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
        for (let i = 0, { length } = vocabulary.resources; i < length; i++) {
            if (vocabulary.resources[i].type === resource.type && vocabulary.resources[i].id === resource.id) {
                position = i;
                break;
            }
        }
        logger.debug(`Tags to vocabulary`);

        // If the resource has not been found in the vocabulary resources, push it!
        if (position === undefined) {
            vocabulary.resources.push({
                id: resource.id,
                dataset,
                type: resource.type,
                tags: body.tags,
            });
        } else {
            vocabulary.resources[position].tags = body.tags;
        }

        vocabulary.save();
        logger.debug(`Tags to resource`);
        position = 0;
        for (let i = 0, { length } = resource.vocabularies; i < length; i++) {
            if (resource.vocabularies[i].id === vocabulary.id && resource.vocabularies[i].application === pVocabulary.application) {
                position = i;
                break;
            }
        }
        resource.vocabularies[position].tags = body.tags;
        resource = await resource.save();
        // CREATE GRAPH ASSOCIATION
        if (vocabulary.id === 'knowledge_graph') {
            logger.info('Creating graph association');
            await GraphService.updateAssociation(resource, body.tags, pVocabulary.application, apiKey);
        }
        return resource;
    }

    static async concatTags(pVocabulary, dataset, pResource, body, apiKey) {
        logger.debug(`Checking entities`);
        let vocabulary = await VocabularyService.getById(pVocabulary);
        if (!vocabulary) {
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = await VocabularyService.create(pVocabulary);
        }
        let resource = await ResourceService.get(dataset, pResource);
        if (!resource) {
            logger.debug(`This resource doesnt' exist, let's create it`);
            resource = await ResourceService.create(dataset, pResource);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        const relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if (!relationship) {
            return RelationshipService.create(pVocabulary, dataset, pResource, body);
        }
        body.tags.forEach((el) => {
            if (relationship.tags.indexOf(el) < 0) {
                relationship.tags.push(el);
            }
        });
        return RelationshipService.updateTagsFromRelationship(pVocabulary, dataset, pResource, relationship, apiKey);
    }

    static async cloneVocabularyTags(dataset, pResource, body, apiKey) {
        logger.debug(`Checking entities`);
        const resource = await ResourceService.get(dataset, pResource);
        if (!resource) {
            throw new ResourceNotFound(`Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        const { vocabularies } = resource.toObject();
        vocabularies.map((vocabulary) => {
            vocabulary.name = vocabulary.id;
            delete vocabulary.id;
            return vocabulary;
        });
        logger.debug('New Vocabularies', vocabularies);
        return RelationshipService.createSome(vocabularies, body.newDataset, {
            type: 'dataset',
            id: body.newDataset
        }, apiKey);
    }

    static async getRelationships(vocabularies, apiKey, query = {}) {
        logger.info(`Getting relationships of vocabularies: ${vocabularies}`);

        let datasetIds = [];
        let layerIds = [];
        let widgetIds = [];

        vocabularies.forEach((vocabulary) => {
            vocabulary.resources.forEach((resource) => {
                switch (resource.type) {

                    case 'dataset':
                        datasetIds.push(resource.id);
                        break;
                    case 'layer':
                        layerIds.push(resource.id);
                        break;
                    case 'widget':
                        widgetIds.push(resource.id);
                        break;
                    default:
                        throw new Error(`Unexpected resource type: ${resource.type}`);

                }
            });
        });

        try {
            const body = {
                ids: datasetIds
            };
            if (query.env) {
                body.env = query.env;
            }
            if (datasetIds.length > 0) {
                const datasets = await RWAPIMicroservice.requestToMicroservice({
                    uri: `/v1/dataset/find-by-ids`,
                    method: 'POST',
                    body,
                    headers: {
                        'x-api-key': apiKey
                    }
                });
                datasetIds = datasets.data.map((dataset) => dataset.id);
            }
        } catch (error) {
            throw new MicroserviceConnection('Error loading datasets for env filtering');
        }
        try {

            if (layerIds.length > 0) {
                const layers = await RWAPIMicroservice.requestToMicroservice({
                    uri: `/v1/layer/find-by-ids`,
                    method: 'POST',
                    body: {
                        ids: layerIds,
                        env: query.env
                    },
                    headers: {
                        'x-api-key': apiKey
                    }
                });

                layerIds = layers.data.map((layer) => layer.id);
            }

        } catch (error) {
            throw new MicroserviceConnection('Error loading layers for env filtering');
        }
        try {

            if (widgetIds.length > 0) {
                const widgets = await RWAPIMicroservice.requestToMicroservice({
                    uri: `/v1/widget/find-by-ids`,
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey
                    },
                    body: {
                        ids: widgetIds,
                        env: query.env
                    }
                });

                widgetIds = widgets.data.map((widget) => widget.id);
            }
        } catch (error) {
            throw new MicroserviceConnection('Error loading widgets for env filtering');
        }

        vocabularies.forEach((vocabulary) => {
            vocabulary.resources = vocabulary.resources.filter((resource) => {
                switch (resource.type) {

                    case 'dataset':
                        return datasetIds.includes(resource.id);
                    case 'layer':
                        return layerIds.includes(resource.id);
                    case 'widget':
                        return widgetIds.includes(resource.id);
                    default:
                        throw new Error(`Unexpected resource type: ${resource.type}`);

                }
            });
        });

        return vocabularies;
    }

}

module.exports = RelationshipService;
