
const logger = require('logger');
const VocabularyNotValid = require('errors/vocabularyNotValid');

class VocabularyValidator {

    static * validate(koaObj) {
        logger.info('Validating Vocabulary Creation');
        koaObj.checkBody('name').notEmpty().toLow();
        if (koaObj.errors) {
            logger.error('Error validating vocabulary creation');
            throw new VocabularyNotValid(koaObj.errors);
        }
        return true;
    }

}

module.exports = VocabularyValidator;
