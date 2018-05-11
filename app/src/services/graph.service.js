const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');

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
            logger.error(e);
            throw new Error(e);
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
            logger.error(e);
            throw new Error(e);
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
            logger.error(e);
            throw new Error(e);
        }
    }

}

module.exports = GraphService;
