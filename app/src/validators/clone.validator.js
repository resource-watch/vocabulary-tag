
const logger = require('logger');
const CloneNotValid = require('errors/clone-not-valid.error');

class CloneValidator {

    static async validate(ctx) {
        logger.info('Validating Cloning Creation');
        ctx.checkBody('newDataset').notEmpty().toLow();
        if (ctx.errors) {
            logger.error('Error validating cloning');
            throw new CloneNotValid(ctx.errors);
        }
        return true;
    }

}

module.exports = CloneValidator;
