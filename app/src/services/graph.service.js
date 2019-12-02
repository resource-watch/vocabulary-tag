const logger = require('logger');
const ctRegisterMicroservice = require('sd-ct-register-microservice-node');
const ConsistencyViolation = require('errors/consistency-violation.error');

const createResource = async (resource) => {
    if (resource.type === 'widget') {
        return ctRegisterMicroservice.requestToMicroservice({
            uri: `/graph/widget/${resource.dataset}/${resource.id}`,
            method: 'POST',
            json: true,
        });
    }

    if (resource.type === 'layer') {
        return ctRegisterMicroservice.requestToMicroservice({
            uri: `/graph/layer/${resource.dataset}/${resource.id}`,
            method: 'POST',
            json: true,
        });
    }

    // Default to 'dataset' case
    return ctRegisterMicroservice.requestToMicroservice({
        uri: `/graph/dataset/${resource.id}`,
        method: 'POST',
        json: true,
    });
};

const postGraphAssociation = async (resource, tags, application) => {
    try {
        const res = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/graph/${resource.type}/${resource.id}/associate`,
            method: 'POST',
            json: true,
            body: { tags, application }
        });

        return res;
    } catch (err) {
        // Check if error matches resource not found, and if so try to create the resource first hand
        if (err.message.match(/Resource.*not found/g) !== null) {
            await createResource(resource);
            return ctRegisterMicroservice.requestToMicroservice({
                uri: `/graph/${resource.type}/${resource.id}/associate`,
                method: 'POST',
                json: true,
                body: { tags, application }
            });
        }

        throw err;
    }
};

const putGraphAssociation = async (resource, tags, application) => {
    try {
        const res = await ctRegisterMicroservice.requestToMicroservice({
            uri: `/graph/${resource.type}/${resource.id}/associate`,
            method: 'PUT',
            json: true,
            body: { tags, application }
        });

        return res;
    } catch (err) {
        // Check if error matches resource not found, and if so try to create the resource first hand
        if (err.message.match(/Resource.*not found/g) !== null) {
            await createResource(resource);
            return ctRegisterMicroservice.requestToMicroservice({
                uri: `/graph/${resource.type}/${resource.id}/associate`,
                method: 'PUT',
                json: true,
                body: { tags, application }
            });
        }

        throw err;
    }
};

const getDeleteURL = (resource, application) => {
    let url = `/graph/${resource.type}/${resource.id}/associate`;
    if (application) {
        url = `${url}?application=${application}`;
    }
    return url;
};

const deleteGraphAssociation = async (resource, application) => {
    try {
        await ctRegisterMicroservice.requestToMicroservice({
            uri: getDeleteURL(resource, application),
            method: 'DELETE',
            json: true
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

    static async createAssociation(resource, tags, application) {
        logger.info('[GraphService]: Associating tags in the graph db');
        try {
            return postGraphAssociation(resource, tags, application);
        } catch (e) {
            throw new ConsistencyViolation('[GraphService]: Error communicating with Graph MS (POST associations)');
        }
    }

    static async updateAssociation(resource, tags, application) {
        logger.info('[GraphService]: Associating tags in the graph db');
        try {
            return putGraphAssociation(resource, tags, application);
        } catch (e) {
            throw new ConsistencyViolation('[GraphService]: Error communicating with Graph MS (PUT associations)');
        }
    }

    static async deleteAssociation(resource, application) {
        logger.info('[GraphService]: Deleting tags in the graph db');
        try {
            return deleteGraphAssociation(resource, application);
        } catch (e) {
            throw new ConsistencyViolation('[GraphService]: Error communicating with Graph MS (DELETE associations)');
        }
    }

}

module.exports = GraphService;
