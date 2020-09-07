const logger = require('logger');
const ErrorSerializer = require('serializers/error.serializer');
const CollectionModel = require('models/collection.model');

class CollectionValidator {

    static async validate(ctx) {
        logger.info('Validating Collection Creation');

        ctx.checkBody('name').notEmpty();
        ctx.checkBody('application').optional().toLow();
        ctx.checkBody('resources').optional().check((data) => {

            logger.debug('entering validation', data.resources);
            if (data.resources) {
                for (let i = 0; i < data.resources.length; i++) {
                    if (!data.resources[i].type || !data.resources[i].id) { return false; }
                }
            }
            return true;
        });

        if (ctx.errors) {
            logger.debug('errors ', ctx.errors);
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }

        // App validation
        if (ctx.request.body.application) {
            if (ctx.request.body.loggedUser.extraUserData.apps.indexOf(ctx.request.body.application) <= -1) {
                ctx.throw(403, 'Forbidden');
            }
        } else {
            ctx.request.body.application = 'rw';
        }

        const data = await CollectionModel.findOne({
            name: ctx.request.body.name,
            application: ctx.request.body.application,
            ownerId: ctx.request.body.loggedUser.id,
        });
        if (data) {
            ctx.throw(400, 'Collection duplicated!');
        }
    }

}

module.exports = CollectionValidator;
