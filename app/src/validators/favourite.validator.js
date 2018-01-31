const logger = require('logger');
const ErrorSerializer = require('serializers/error.serializer');
const FavouriteModel = require('models/favourite.model');
const RESOURCES = require('app.constants').RESOURCES;

class FavouriteValidator {

    static async validate(ctx) {
        logger.info('Validating Favourite Creation');
        ctx.checkBody('resourceType').notEmpty().in(RESOURCES);
        ctx.checkBody('application').optional().toLow();
        ctx.checkBody('resourceId').notEmpty();
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
        const data = await FavouriteModel.findOne({
            resourceType: ctx.request.body.resourceType,
            resourceId: ctx.request.body.resourceId,
            userId: ctx.request.body.loggedUser.id,
            application: ctx.request.body.application
        });
        if (data) {
            ctx.throw(400, 'Favourite duplicated');
        }
    }

}

module.exports = FavouriteValidator;
