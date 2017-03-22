
const logger = require('logger');
const CloneNotValid = require('errors/cloneNotValid');

class CloneValidator {

    static * validate(koaObj) {
        logger.info('Validating Cloning Creation');
        koaObj.checkBody('newDataset').notEmpty().toLow();
        if (koaObj.errors) {
            logger.error('Error validating cloning');
            throw new CloneNotValid(koaObj.errors);
        }
        return true;
    }

}

module.exports = CloneValidator;
