
const logger = require('logger');
const RelationshipNotValid = require('errors/relationshipNotValid');

class RelationshipValidator {

    static * validate(koaObj) {
        logger.info('Validating Relationship Creation');
        koaObj.checkBody('tags').notEmpty().check(function () {
            if (this.tags instanceof Array && this.tags.length > 0) {
                return true;
            }
            return false;
        }.bind(koaObj.request.body));
        if (koaObj.errors) {
            logger.error('Error validating relationship creation');
            throw new RelationshipNotValid(koaObj.errors);
        }
        return true;
    }

}

module.exports = RelationshipValidator;
