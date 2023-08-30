const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const ConsistencyViolation = require('errors/consistency-violation.error');
const ResourceNotFoundError = require('errors/resource-not-found.error');

const createResourceOnGraph = async (resource, apiKey) => {
    if (resource.type === 'layer' || resource.type === 'widget') {
        return RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/graph/${resource.type}/${resource.dataset}/${resource.id}`,
            method: 'POST',
            headers: {
                'x-api-key': apiKey
            }
        });
    }

    // Default to 'dataset' case
    return RWAPIMicroservice.requestToMicroservice({
        uri: `/v1/graph/dataset/${resource.id}`,
        method: 'POST',
        headers: {
            'x-api-key': apiKey
        }
    });
};

const createOrUpdateAssociationOnGraph = async (action, resource, tags, application, apiKey) => {
    try {
        const res = await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/graph/${resource.type}/${resource.id}/associate`,
            method: action.toUpperCase(),
            body: { tags, application },
            headers: {
                'x-api-key': apiKey
            }
        });

        return res;
    } catch (err) {
        if (err.message.match(/Resource.*not found/g) !== null) {
            throw new ResourceNotFoundError(err.message);
        }

        throw err;
    }
};

const deleteAssociationOnGraph = async (resource, application, apiKey) => {
    let applicationQueryParam = '';
    if (application) {
        applicationQueryParam = `?application=${application}`;
    }

    try {
        await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/graph/${resource.type}/${resource.id}/associate${applicationQueryParam}`,
            method: 'DELETE',
            headers: {
                'x-api-key': apiKey
            }
        });
    } catch (err) {
        // Check if error matches resource not found, and in that case fail silently
        if (err.message.match(/Resource.*not found/g) !== null) {
            return;
        }

        throw err;
    }
};

class GraphService {

    static async createAssociation(resource, tags, application, apiKey) {
        logger.info('[GraphService]: Associating tags in the graph db');
        let association;
        try {
            // weird construct needed to wait for any potential exception
            association = await createOrUpdateAssociationOnGraph('post', resource, tags, application, apiKey);
            return association;
        } catch (error) {
            if (error instanceof ResourceNotFoundError) {
                await createResourceOnGraph(resource, apiKey);
                return createOrUpdateAssociationOnGraph('post', resource, tags, application, apiKey);
            }

            throw new ConsistencyViolation('[GraphService]: Error communicating with Graph MS (POST associations)');
        }
    }

    static async updateAssociation(resource, tags, application, apiKey) {
        logger.info('[GraphService]: Associating tags in the graph db');
        let association;
        try {
            // weird construct needed to wait for any potential exception
            association = await createOrUpdateAssociationOnGraph('put', resource, tags, application, apiKey);
            return association;
        } catch (error) {
            if (error instanceof ResourceNotFoundError) {
                await createResourceOnGraph(resource, apiKey);
                return createOrUpdateAssociationOnGraph('put', resource, tags, application, apiKey);
            }

            throw new ConsistencyViolation('[GraphService]: Error communicating with Graph MS (PUT associations)');
        }
    }

    static async removeFromGraph(favourite, apiKey) {
        try {
            await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/graph/favourite/${favourite.resourceType}/${favourite.resourceId}/${favourite._id}`,
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey
                }
            });
        } catch (err) {
            logger.error('error removing of graph', err);
        }
    }

    static async deleteAssociation(resource, application, apiKey) {
        logger.info('[GraphService]: Deleting tags in the graph db');
        try {
            return deleteAssociationOnGraph(resource, application, apiKey);
        } catch (e) {
            throw new ConsistencyViolation('[GraphService]: Error communicating with Graph MS (DELETE associations)');
        }
    }

}

module.exports = GraphService;
