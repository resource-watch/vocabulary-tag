const logger = require('logger');
const VocabularyService = require('services/vocabulary.service');
const ResourceService = require('services/resource.service');
const GraphService = require('services/graph.service');
const RelationshipDuplicated = require('errors/relationship-duplicated.error');
const RelationshipNotFound = require('errors/relationship-not-found.error');
const ResourceNotFound = require('errors/resource-not-found.error');
const VocabularyNotFound = require('errors/vocabulary-not-found.error');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

class RelationshipService {

    static checkRelationship(resource, vocabulary) {
        return resource.vocabularies.find((elVocabulary) => (vocabulary.id === elVocabulary.id) && (vocabulary.application === elVocabulary.application));
    }

    static async create(user, pVocabulary, dataset, pResource, body) {
        logger.debug(`Checking entities`);
        let vocabulary = await VocabularyService.getById(pVocabulary);
        if (!vocabulary || vocabulary.length === 0) {
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = await VocabularyService.create(user, pVocabulary);
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
            await GraphService.createAssociation(resource, body.tags, pVocabulary.application);
        }
        return resource;
    }

    static async createSome(user, vocabularies, dataset, pResource) {
        for (let i = 0; i < vocabularies.length; i++) {
            await RelationshipService.create(user, vocabularies[i], dataset, pResource, vocabularies[i]);
        }
        return ResourceService.get(dataset, pResource);
    }

    static async delete(user, pVocabulary, dataset, pResource) {
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
            await GraphService.deleteAssociation(resource, pVocabulary.application);
        }
        return resource;
    }

    static async deleteSome(user, vocabularies, dataset, pResource) {
        for (let i = 0; i < vocabularies.length; i++) {
            await RelationshipService.delete(user, vocabularies[i], dataset, pResource);
        }
        return ResourceService.get(dataset, pResource);
    }

    static async deleteAll(user, dataset, pResource) {
        const resource = await ResourceService.get(dataset, pResource);
        if (!resource || !resource.vocabularies || resource.vocabularies.length === 0) {
            logger.debug(`This resource doesn't have Relationships`);
            throw new RelationshipNotFound(`This resource doesn't have Relationships`);
        }
        const vocabularies = resource.vocabularies.map((vocabulary) => ({
            name: vocabulary.id
        }));
        for (let i = 0; i < vocabularies.length; i++) {
            await RelationshipService.delete(user, vocabularies[i], dataset, pResource);
        }
        return resource;
    }

    static async updateTagsFromRelationship(user, pVocabulary, dataset, pResource, body) {
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
            await GraphService.updateAssociation(resource, body.tags, pVocabulary.application);
        }
        return resource;
    }

    static async concatTags(user, pVocabulary, dataset, pResource, body) {
        logger.debug(`Checking entities`);
        let vocabulary = await VocabularyService.getById(pVocabulary);
        if (!vocabulary) {
            logger.debug(`This Vocabulary doesn't exist, let's create it`);
            vocabulary = await VocabularyService.create(user, pVocabulary);
        }
        let resource = await ResourceService.get(dataset, pResource);
        if (!resource) {
            logger.debug(`This resource doesnt' exist, let's create it`);
            resource = await ResourceService.create(dataset, pResource);
        }
        logger.debug(`Checking if relationship doesn't exist yet`);
        const relationship = RelationshipService.checkRelationship(resource, vocabulary);
        if (!relationship) {
            return RelationshipService.create(user, pVocabulary, dataset, pResource, body);
        }
        body.tags.forEach((el) => {
            if (relationship.tags.indexOf(el) < 0) {
                relationship.tags.push(el);
            }
        });
        return RelationshipService.updateTagsFromRelationship(user, pVocabulary, dataset, pResource, relationship);
    }

    static async cloneVocabularyTags(user, dataset, pResource, body) {
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
        return RelationshipService.createSome(user, vocabularies, body.newDataset, { type: 'dataset', id: body.newDataset });
    }

    /**
     * - Clones the query object
     * - Strips a few things that should not be passed over to other MSs
     * - Encodes query into a URL param format
     *
     * @TODO: rawQuery is passed by reference, so we should evaluate cloning at an earlier point
     *
     * @param rawQuery
     * @returns {string}
     */
    static prepareAndFormatQuery(rawQuery) {
        const query = { ...rawQuery };

        return serializeObjToQuery(query);
    }

    static async getRelationships(vocabularies, query = {}) {
        logger.info(`Getting relationships of vocabularies: ${vocabularies}`);
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < vocabularies.length; i++) {
            const datasetIds = vocabularies[i].resources.filter((resource) => resource.type === 'dataset').map((resource) => resource.id);
            const layerIds = vocabularies[i].resources.filter((resource) => resource.type === 'layer').map((resource) => resource.id);
            const widgetIds = vocabularies[i].resources.filter((resource) => resource.type === 'widget').map((resource) => resource.id);
            const validResourceIds = [];
            try {
                if (datasetIds.length > 1) {
                    const datasets = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/dataset/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: datasetIds,
                            env: query.env
                        }
                    });
                    validResourceIds.push(...datasets.map((dataset) => dataset.Id));
                }
                if (layerIds.length > 1) {
                    const layers = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/layer/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: layerIds,
                            env: query.env
                        }
                    });

                    validResourceIds.push(...layers.map((dataset) => dataset.Id));
                }
                if (widgetIds.length > 1) {
                    const widgets = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/widget/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: widgetIds,
                            env: query.env
                        }
                    });
                    validResourceIds.push(...widgets.map((dataset) => dataset.Id));
                }
                vocabularies.resources = vocabularies.resources.filter((resource) => validResourceIds.includes(resource.id));
            } catch (err) {
                logger.error(err);
            }
        }
        return vocabularies;
    }

}

module.exports = RelationshipService;
