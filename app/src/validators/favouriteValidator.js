const logger = require('logger');
const ErrorSerializer = require('serializers/errorSerializer');
const FavouriteModel = require('models/favourite');
const RESOURCES = require('appConstants').RESOURCES;

class FavouriteValidator {

    static* validate(next) {
        logger.info('Validating Relationships Creation');
        this.checkBody('resourceType').notEmpty().in(RESOURCES);
        this.checkBody('resourceId').notEmpty();
        if (this.errors) {
            logger.debug('errors ', this.errors);
            this.body = ErrorSerializer.serializeValidationBodyErrors(this.errors);
            this.status = 400;
            return;
        }

        const data = yield FavouriteModel.findOne({
            resourceType: this.request.body.resourceType,
            resourceId: this.request.body.resourceId,
            userId: this.request.body.loggedUser.id
        });
        if (data) {
            this.throw(400, 'Favourite duplicated');
            return;
        }
        yield next;
    }

}

module.exports = FavouriteValidator;
