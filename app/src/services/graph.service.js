const logger = require('logger');
const ctRegisterMicroservice = require('sd-ct-register-microservice-node');
const ConsistencyViolation = require('errors/consistency-violation.error');

class GraphService {

    static async createAssociation(resource, tags, application) {
        logger.info('[GraphService]: Associating tags in the graph db');
        try {
            return await ctRegisterMicroservice.requestToMicroservice({
                uri: `/graph/${resource.type}/${resource.id}/associate`,
                method: 'POST',
                json: true,
                body: {
                    tags,
                    application
                }
            });
        } catch (e) {
            const errorMsg = '[GraphService]: Error communicating with Graph MS (POST associations)';
            logger.error(errorMsg, e.message);
            throw new ConsistencyViolation(errorMsg);
        }
    }

    static async updateAssociation(resource, tags, application) {
        logger.info('[GraphService]: Associating tags in the graph db');
        try {
            return await ctRegisterMicroservice.requestToMicroservice({
                uri: `/graph/${resource.type}/${resource.id}/associate`,
                method: 'PUT',
                json: true,
                body: {
                    tags,
                    application
                }
            });
        } catch (e) {
            const errorMsg = '[GraphService]: Error communicating with Graph MS (PUT associations)';
            logger.error(errorMsg, e.message);
            throw new ConsistencyViolation(errorMsg);
        }
    }

    static async deleteAssociation(resource, application) {
        logger.info('[GraphService]: Deleting tags in the graph db');
        try {
            let url = `/graph/${resource.type}/${resource.id}/associate`;
            if (application) {
                url = `${url}?application=${application}`;
            }
            return await ctRegisterMicroservice.requestToMicroservice({
                uri: url,
                method: 'DELETE',
                json: true
            });
        } catch (e) {
            const errorMsg = '[GraphService]: Error communicating with Graph MS (DELETE associations)';
            logger.error(errorMsg, e.message);
            throw new ConsistencyViolation(errorMsg);
        }
    }

}

module.exports = GraphService;
