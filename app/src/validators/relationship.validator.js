const logger = require('logger');
const RelationshipNotValid = require('errors/relationship-not-valid.error');

class RelationshipValidator {

    static async validate(ctx) {
        logger.info('Validating Relationship Creation');
        ctx.checkBody('tags').notEmpty().check(() => {
            const matchTags = ctx.request.body.tags instanceof Array && ctx.request.body.tags.length > 0;
            const matchApplication = (typeof ctx.request.body.application === 'string') && ctx.request.body.application.length > 0;
            return (matchTags && matchApplication);
        });
        if (ctx.errors) {
            logger.error('Error validating relationship creation');
            throw new RelationshipNotValid(ctx.errors);
        }
        return true;
    }

}

module.exports = RelationshipValidator;
