const logger = require('logger');
const ErrorSerializer = require('serializers/errorSerializer');
const CollectionModel = require('models/collection');

class CollectionValidator {

    static * validate(next) {
        logger.info('Validating Collection Creation');

        this.checkBody('name').notEmpty();
        this.checkBody('resources').optional().check(data => {

            logger.debug('entering validation', data.resources);
            if (data.resources) {
                for (let i = 0; i < data.resources.length; i++) {
                    if (!data.resources[i].type || !data.resources[i].id) { return false; }
                }
            }
            return true;
        });

        if (this.errors) {
            logger.debug('errors ', this.errors);
            this.body = ErrorSerializer.serializeValidationBodyErrors(this.errors);
            this.status = 400;
            return;
        }

        const data = yield CollectionModel.findOne({
            name: this.request.body.name,
            ownerId: this.request.body.loggedUser.id,
        });
        if (data) {
            this.throw(400, 'Collection duplicated!');
            return;
        }
        yield next;
    }

}

module.exports = CollectionValidator;
