
const logger = require('logger');
const JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const Resource = require('models/resource');
const ResourceNotFound = require('errors/resourceNotFound');
const ctRegisterMicroservice = require('ct-register-microservice-node');

const deserializer = function (obj) {
    return function (callback) {
        new JSONAPIDeserializer({ keyForAttribute: 'camelCase' }).deserialize(obj, callback);
    };
};

class ResourceService {

    static * get(dataset, resource, vocabulary) {
        const query = {
            dataset,
            id: resource.id,
            type: resource.type
        };
        if (vocabulary && vocabulary.name) {
            return Resource.aggregate([
                { $match: {
                    dataset,
                    id: resource.id,
                    type: resource.type,
                    'vocabularies.id': vocabulary.name
                } },

                { $unwind: '$vocabularies' },

                { $match: {
                    'vocabularies.id': vocabulary.name
                } },

                { $group: {
                    _id: 0,
                    vocabularies: { $push: '$vocabularies' }
                } }
            ]).exec();
        }
        logger.debug('Getting resource by resource');
        return yield Resource.findOne(query).exec();
    }

    static * create(dataset, pResource) {
        logger.debug('Checking if resource doesnt exist');
        const resource = yield Resource.findOne({
            id: pResource.id,
            dataset,
            type: pResource.type
        }).exec();
        if (resource) {
            return resource;
        }
        logger.debug('Creating resource');
        const nResource = new Resource({
            id: pResource.id,
            dataset,
            type: pResource.type
        });
        return nResource.save();
    }

    static * delete(dataset, pResource) {
        logger.debug('Checking if resource doesnt exists');
        const query = {
            id: pResource.id,
            dataset,
            type: pResource.type
        };
        const resource = yield Resource.findOne(query).exec();
        if (!resource) {
            logger.error('Error deleting resource');
            throw new ResourceNotFound(`Resource ${pResource.type} - ${resource.id} and dataset: ${dataset} doesn't exist`);
        }
        logger.debug('Deleting resource');
        yield Resource.remove(query).exec();
        return resource;
    }

    /* @TODO Updating vocabularies from Resources -> Just a superadmin can modify vocabularies */
    static * updateVocabulary(vocabulary) {
        return vocabulary;
    }

    /* @TODO Removing vocabularies from Resources -> Just a superadmin can delete vocabularies */
    static * deleteVocabulary(vocabulary) {
        return vocabulary;
    }

    static * getByIds(resource) {
        logger.debug(`Getting resources with ids ${resource.ids}`);
        const query = {
            id: { $in: resource.ids },
            type: resource.type
        };
        logger.debug('Getting resources');
        return yield Resource.find(query).exec();
    }

    /*
    * @returns: hasPermission: <Boolean>
    */
    static * hasPermission(user, dataset, pResource) {
        let permission = true;
        let resource;
        try {
            resource = yield ctRegisterMicroservice.requestToMicroservice({
                uri: `/${pResource.type}/${pResource.id}`,
                method: 'GET',
                json: true
            });
        } catch (err) {
            throw err;
        }
        resource = yield deserializer(resource);
        if (!resource) {
            logger.error('Error getting resource from microservice');
            throw new ResourceNotFound(`REAL Resource ${pResource.type} - ${pResource.id} and dataset: ${dataset} doesn't exist`);
        }
        const appPermission = resource.application.find(function (resourceApp) {
            return user.extraUserData.apps.find(function (app) {
                return app === resourceApp;
            });
        });
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
