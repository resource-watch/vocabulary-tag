const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');

class GraphService {

    static * associateTags(resource, tags) {
        logger.info('[GraphService]: Associating tags in the graph db');
        try {
            return yield ctRegisterMicroservice.requestToMicroservice({
                uri: `/graph/${resource.type}/${resource.id}/associate`,
                method: 'POST',
                json: true,
                body: {
                    tags
                }
            });
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

}

module.exports = GraphService;
