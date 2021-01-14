const logger = require('logger');
const Resource = require('models/resource.model');
const ResourceNotFound = require('errors/resource-not-found.error');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

const deserializer = (obj) => {
    if (obj instanceof Array) {
        return obj.data[0].attributes;
    } if (obj instanceof Object) {
        return obj.data.attributes;
    }
    return obj;
};

class ResourceService {

    static async get(dataset, resource, vocabulary) {
        const query = {
            dataset,
            id: resource.id,
            type: resource.type
        };
        if (vocabulary) {
            return Resource.aggregate([
                {
                    $match: {
                        dataset,
                        id: resource.id,
                        type: resource.type,
                        'vocabularies.id': vocabulary.name || { $ne: null },
                        'vocabularies.application': vocabulary.application || { $ne: null }
                    }
                },

                { $unwind: '$vocabularies' },

                {
                    $match: {
                        'vocabularies.id': vocabulary.name || { $ne: null },
                        'vocabularies.application': vocabulary.application || { $ne: null }
                    }
                },

                {
                    $group: {
                        _id: 0,
                        vocabularies: { $push: '$vocabularies' }
                    }
                }
            ]).exec();
        }
        logger.debug('Getting resource by resource');
        return Resource.findOne(query).exec();
    }

    static async create(dataset, pResource) {
        logger.debug('Checking if resource doesnt exist');
        const resource = await Resource.findOne({
            id: pResource.id,
            dataset,
            type: pResource.type
        }).exec();
        if (resource) {
            return resource;
        }
        logger.debug('Creating resource');
        const nResource = await new Resource({
            id: pResource.id,
            dataset,
            type: pResource.type
        }).save();
        return nResource;
    }

    static async delete(dataset, pResource) {
        logger.debug('Checking if resource doesnt exists');
        const query = {
            id: pResource.id,
            dataset,
            type: pResource.type
        };
        const resource = await Resource.findOne(query).exec();
        if (!resource) {
            logger.error('Error deleting resource');
            throw new ResourceNotFound(`Resource ${pResource.type} - ${resource.id} and dataset: ${dataset} doesn't exist`);
        }
        logger.debug('Deleting resource');
        await Resource.deleteMany(query).exec();
        return resource;
    }

    static async getByIds(resource) {
        logger.debug(`Getting resources with ids ${resource.ids}`);
        const query = {
            id: { $in: resource.ids },
            type: resource.type
        };
        if (resource.application) {
            query['vocabularies.application'] = resource.application;
        }
        logger.debug('Getting resources with query', query);
        const resources = await Resource.find(query).exec();
        if (resource.application) {
            return resources.map((res) => {
                res.vocabularies = res.vocabularies.filter((voc) => voc.application === resource.application);
                return res;
            }).filter((res) => res.vocabularies.length > 0);
        }
        return resources;
    }

    /*
    * @returns: hasPermission: <Boolean>
    */
    static async hasPermission(user, dataset, pResource) {
        let permission = true;
        let resource = await RWAPIMicroservice.requestToMicroservice({
            uri: `/${pResource.type}/${pResource.id}`,
            method: 'GET',
            json: true
        });
        resource = deserializer(resource);
        if (!resource) {
            logger.error('Error getting resource from microservice');
            throw new ResourceNotFound(`REAL Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        const appPermission = resource.application.find((resourceApp) => user.extraUserData.apps.find((app) => app === resourceApp));
        if (!appPermission) {
            permission = false;
        }
        if ((user.role === 'MANAGER') && (!resource.userId || resource.userId !== user.id)) {
            permission = false;
        }
        return permission;
    }

}

module.exports = ResourceService;
