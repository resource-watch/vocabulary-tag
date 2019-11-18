const logger = require('logger');
const RelationshipsNotValid = require('errors/relationships-not-valid.error');

class RelationshipsValidator {

    static async validate(ctx) {
        logger.info('Validating Relationships Creation');
        Object.keys(ctx.request.body).forEach(((key) => {
            if (key !== 'loggedUser') {
                ctx.checkBody(key).check(() => {
                    if (ctx.request.body[key] instanceof Object && ctx.request.body[key].length === undefined) {
                        const matchTags = ctx.request.body[key].tags instanceof Array && ctx.request.body[key].tags.length > 0;
                        const matchApplication = (typeof ctx.request.body[key].application === 'string') && ctx.request.body[key].application.length;
                        return (matchTags && matchApplication);
                    }
                    return false;
                });
            }
        }));
        if (ctx.errors) {
            logger.error('Error validating relationships creation');
            throw new RelationshipsNotValid(ctx.errors);
        }
        return true;
    }

}

module.exports = RelationshipsValidator;
